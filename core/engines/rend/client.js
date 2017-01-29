import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_DEPTH,

  NAVBAR_WIDTH,
  NAVBAR_HEIGHT,
  NAVBAR_WORLD_WIDTH,
  NAVBAR_WORLD_HEIGHT,
  NAVBAR_WORLD_DEPTH,

  DEFAULT_USER_HEIGHT,
  TRANSITION_TIME,
} from './lib/constants/menu';
import {
  KEYBOARD_WIDTH,
  KEYBOARD_HEIGHT,
  KEYBOARD_WORLD_WIDTH,
  KEYBOARD_WORLD_HEIGHT,
} from './lib/constants/keyboard';
import menuUtils from './lib/utils/menu';
import keyboardImg from './lib/images/keyboard';
import menuRender from './lib/render/menu';

const keyboardImgSrc = 'data:image/svg+xml,' + keyboardImg;

const SIDES = ['left', 'right'];

const ATTRIBUTE_DEFAULTS = {
  MIN: 0,
  MAX: 100,
  STEP: 0,
  OPTIONS: [],
};

class Rend {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;

    let live = true;
    const cleanups = [];
    this._cleanup = () => {
      live = false;

      const oldCleanups = cleanups.slice();
      for (let i = 0; i < oldCleanups.length; i++) {
        const cleanup = oldCleanups[i];
        cleanup();
      }
    };

    return archae.requestPlugins([
      '/core/engines/hub',
      '/core/engines/input',
      '/core/engines/three',
      '/core/engines/webvr',
      '/core/engines/biolumi',
      '/core/engines/anima',
      '/core/engines/fs',
      '/core/engines/bullet',
      '/core/plugins/js-utils',
      '/core/plugins/geometry-utils',
      '/core/plugins/random-utils',
      '/core/plugins/creature-utils',
      '/core/plugins/sprite-utils',
    ]).then(([
      hub,
      input,
      three,
      webvr,
      biolumi,
      anima,
      fs,
      bullet,
      jsUtils,
      geometryUtils,
      randomUtils,
      creatureUtils,
      spriteUtils,
    ]) => {
      if (live) {
        const {THREE, scene, camera} = three;
        const {events} = jsUtils;
        const {EventEmitter} = events;
        const {alea} = randomUtils;

        const transparentImg = biolumi.getTransparentImg();
        const maxNumTextures = biolumi.getMaxNumTextures();
        const transparentMaterial = biolumi.getTransparentMaterial();
        const solidMaterial = biolumi.getSolidMaterial();

        const menuRenderer = menuRender.makeRenderer({
          creatureUtils,
        });

        const localUpdates = [];

        // main state
        let api = null;
        let menu = null;
        let menuMesh = null;

        const menuState = {
          open: true,
          animation: null,
        };
        const focusState = {
          type: '',
        };
        const worldsState = {
          worlds: [
            {
              name: 'Proteus',
              description: 'The default zeo.sh world',
            },
            {
              name: 'Midgar',
              description: 'Alternate zeo.sh world',
            },
            {
              name: 'Mako Reactor',
              description: 'Taken from Final Fantasy VII. Straight copy.',
            },
          ],
          selectedName: 'Proteus',
          inputText: '',
          inputIndex: 0,
          inputValue: 0,
        };
        const modsState = {
          mods: [],
          localMods: [],
          remoteMods: [],
          tab: 'installed',
          inputText: '',
          inputIndex: 0,
          inputValue: 0,
          loadingLocal: false,
          loadingRemote: false,
          cancelLocalRequest: null,
          cancelRemoteRequest: null,
        };
        const modState = {
          modName: '',
          mod: null,
          loading: false,
          cancelRequest: null,
        };
        const elementsState = {
          elements: [],
          availableElements: [],
          clipboardElements: [],
          elementInstances: [],
          selectedKeyPath: [],
          draggingKeyPath: [],
          positioningName: null,
          positioningSide: null,
          choosingName: null,
          inputText: '',
          inputIndex: 0,
          inputValue: 0,
          loading: false,
        };
        const filesState = {
          cwd: fs.getCwd(),
          files: [],
          inputText: '',
          inputIndex: 0,
          inputValue: 0,
          selectedName: '',
          clipboardType: null,
          clipboardPath: '',
          loaded: false,
          loading: false,
          uploading: fs.getUploading(),
        };
        const elementAttributeFilesState = {
          cwd: fs.getCwd(),
          files: [],
          inputText: '',
          inputIndex: 0,
          inputValue: 0,
          selectedName: '',
          clipboardType: null,
          clipboardPath: '',
          loaded: false,
          loading: false,
          uploading: fs.getUploading(),
        };
        const navbarState = {
          tab: 'readme',
        };

        const worlds = new Map();
        let currentWorld = null;
        const modElementApis = {};

        // element helper functions
        const _cleanElementsState = elementsState => {
          const result = {};
          for (const k in elementsState) {
            if (k === 'elements' || k === 'availableElements' || k === 'clipboardElements') {
              result[k] = menuUtils.elementsToState(elementsState[k]);
            } else if (k !== 'elementInstances') {
              result[k] = elementsState[k];
            }
          }
          return result;
        };
        const _getModSpec = mod => new Promise((accept, reject) => {
          if (modState.cancelRequest) {
            modState.cancelRequest();
            modState.cancelRequest = null;
          }

          let live = true;
          modState.cancelRequest = () => {
            live = false;
          };

          fetch('/archae/rend/mods/spec', {
            method: 'POST',
            headers: (() => {
              const headers = new Headers();
              headers.set('Content-Type', 'application/json');
              return headers;
            })(),
            body: JSON.stringify({
              mod,
            }),
          }).then(res => res.json()
            .then(modSpecs => {
              if (live) {
                accept(modSpecs);

                modState.cancelRequest = null;
              }
            })
            .catch(err => {
              if (live) {
                reject(err);

                modState.cancelRequest = null;
              }
            })
          );
        });
        const _getLocalModSpecs = () => new Promise((accept, reject) => {
          if (modsState.cancelLocalRequest) {
            modsState.cancelLocalRequest();
            modsState.cancelLocalRequest = null;
          }

          let live = true;
          modsState.cancelLocalRequest = () => {
            live = false;
          };

          fetch('/archae/rend/mods/local').then(res => res.json()
            .then(modSpecs => {
              if (live) {
                accept(modSpecs);

                modsState.cancelLocalRequest = null;
              }
            })
            .catch(err => {
              if (live) {
                reject(err);

                modsState.cancelLocalRequest = null;
              }
            })
          );
        });
        const _getRemoteModSpecs = q => new Promise((accept, reject) => {
          if (modsState.cancelRemoteRequest) {
            modsState.cancelRemoteRequest();
            modsState.cancelRemoteRequest = null;
          }

          let live = true;
          modsState.cancelRemoteRequest = () => {
            live = false;
          };

          fetch('/archae/rend/mods/search', {
            method: 'POST',
            headers: (() => {
              const headers = new Headers();
              headers.set('Content-Type', 'application/json');
              return headers;
            })(),
            body: JSON.stringify({
              q,
            }),
          }).then(res => res.json()
            .then(modSpecs => {
              if (live) {
                accept(modSpecs);

                modsState.cancelRemoteRequest = null;
              }
            })
            .catch(err => {
              if (live) {
                reject(err);

                modsState.cancelRemoteRequest = null;
              }
            })
          );
        });

        // mod helper functions
        const _requestMod = mod => archae.requestPlugin(mod)
          .then(modApi => {
            menu.updatePages();

            return modApi;
          });
        const _requestMods = mods => Promise.all(mods.map(mod => _requestMod(mod)));
        const _releaseMod = mod => archae.releasePlugin(mod)
          .then(() => {
            menu.updatePages();
          });
        const _releaseMods = mods => Promise.all(mods.map(mod => _releaseMod(mod)));
        const _addModApiElement = (tag, elementApi) => {
          modElementApis[tag] = elementApi;

          /* const element = menuUtils.elementApiToElement(elementApi);
          elementsState.availableElements.push(element); */
        };
        const _removeModApiElement = tag => {
          delete modElementApis[tag];

          /* elementsState.availableElements = elementsState.availableElements.filter(element => {
            const {tagName} = element;
            const elementTag = tagName.match(/^z-(.+)$/i)[1].toLowerCase();
            return elementTag !== tag;
          }); */
        };

        // api functions
        const _requestChangeWorld = worldName => new Promise((accept, reject) => {
          const _requestInstalledModSpecs = worldName => fetch('/archae/rend/mods/installed', {
            method: 'POST',
            headers: (() => {
              const headers = new Headers();
              headers.set('Content-Type', 'application/json');
              return headers;
            })(),
            body: JSON.stringify({
              world: worldName,
            }),
          }).then(res => res.json());

          Promise.all([
            _requestInstalledModSpecs(worldName),
            _requestGetElements(worldName),
            bullet.requestWorld(worldName),
          ])
            .then(([
              installedModSpecs,
              elementsStatus,
              physics,
            ]) => {
              menu.updatePages();

              const startTime = Date.now();
              let worldTime = 0;

              localUpdates.push(() => {
                const now = Date.now();
                worldTime = now - startTime;
              });

              // load world
              const _loadWorld = () => {
                const _loadMods = () => {
                  elementsState.loading = true;

                  return _requestMods(installedModSpecs.map(({name}) => name))
                    .then(() => {
                      console.log('world mods loaded');

                      elementsState.loading = false;

                      menu.updatePages();
                    });
                };
                const _loadElements = () => new Promise((accept, reject) => {
                  const elements = menuUtils.jsonToElements(modElementApis, elementsStatus.elements);
                  const clipboardElements = menuUtils.jsonToElements(modElementApis, elementsStatus.clipboardElements);
                  const elementInstances = menuUtils.constructElements(modElementApis, elements);

                  elementsState.elements = elements;
                  elementsState.clipboardElements = clipboardElements;
                  elementsState.elementInstances = elementInstances;

                  accept();
                });

                return _loadMods()
                  .then(() => _loadElements());
              };
              Promise.resolve()
                .then(() => _loadWorld())
                .catch(err => {
                  console.warn(err);
                });

              class World {
                constructor({name, physics}) {
                  this.name = name;
                  this.physics = physics;
                }

                getWorldTime() {
                  return worldTime;
                }

                requestAddMod(mod) {
                  return fetch('/archae/rend/mods/add', {
                    method: 'POST',
                    headers: (() => {
                      const headers = new Headers();
                      headers.set('Content-Type', 'application/json');
                      return headers;
                    })(),
                    body: JSON.stringify({
                      world: worldName,
                      mod: mod,
                    }),
                  }).then(res => res.json()
                    .then(mod => {
                      ['localMods', 'remoteMods'].forEach(k => {
                        const modsCollection = modsState[k];
                        const index = modsCollection.findIndex(m => m.name === mod.name);
                        if (index !== -1) {
                          modsCollection.splice(index, 1);
                        }
                      });

                      modsState.mods.push(mod);

                      menu.updatePages();
                    })
                    .then(() => _requestMod(mod))
                  );
                }

                requestAddMods(mods) {
                  return Promise.all(mods.map(mod => this.requestAddMod(mod)));
                }

                requestRemoveMod(mod) {
                  return fetch('/archae/rend/mods/remove', {
                    method: 'POST',
                    headers: (() => {
                      const headers = new Headers();
                      headers.set('Content-Type', 'application/json');
                      return headers;
                    })(),
                    body: JSON.stringify({
                      world: worldName,
                      mod: mod,
                    }),
                  }).then(res => res.json()
                    .then(mod => {
                      const index = modsState.mods.findIndex(m => m.name === mod.name);
                      if (index !== -1) {
                        modsState.mods.splice(index, 1);
                      }

                      const {local} = mod;
                      if (local) {
                        modsState.localMods.push(mod);
                      } else {
                        modsState.remoteMods.push(mod);
                      }

                      menu.updatePages();
                    })
                    .then(() => _releaseMod(mod))
                  );
                }

                requestRemoveMods(mods) {
                  return Promise.all(mods.map(mod => this.requestRemoveMod(mod)));
                }

                requestWorker(module, options) {
                  return archae.requestWorker(module, options);
                }
              }

              const world = new World({
                name: worldName,
                physics,
              });

              currentWorld = world;

              modsState.mods = installedModSpecs;

              accept();
            });
        });
        const _requestDeleteWorld = worldName => new Promise((accept, reject) => {
          accept();
          /* bullet.releaseWorld(worldName)
            .then(() => {
              if (currentWorld && currentWorld.name === worldName) {
                currentWorld = null;
              }

              accept();
            })
            .catch(reject); */
        });
        const _requestMainReadme = () => fetch('/archae/rend/readme').then(res => res.text());
        const _requestGetElements = world => fetch('/archae/rend/worlds/' + world + '/elements.json').then(res => res.json());
        const _requestSetElements = ({world, elements, clipboardElements}) => fetch('/archae/rend/worlds/' + world + '/elements.json', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            elements,
            clipboardElements,
          }),
        }).then(res => res.blob().then(() => {}));
        const _saveElements = menuUtils.debounce(next => {
          const {name: worldName} = currentWorld;

          _requestSetElements({
            world: worldName,
            elements: menuUtils.elementsToJson(elementsState.elements),
            clipboardElements: menuUtils.elementsToJson(elementsState.clipboardElements),
          })
            .then(() => {
              console.log('saved elements for', JSON.stringify(worldName));

              next();
            })
            .catch(err => {
              console.warn(err);

              next();
            });
        });

        const _initializeMenu = () => {
          if (live) {
            const mainFontSpec = {
              fonts: biolumi.getFonts(),
              fontSize: 72,
              lineHeight: 1.4,
              fontWeight: biolumi.getFontWeight(),
              fontStyle: biolumi.getFontStyle(),
            };
            const itemsFontSpec = {
              fonts: biolumi.getFonts(),
              fontSize: 32,
              lineHeight: 1.4,
              fontWeight: biolumi.getFontWeight(),
              fontStyle: biolumi.getFontStyle(),
            };
            const subcontentFontSpec = {
              fonts: biolumi.getFonts(),
              fontSize: 28,
              lineHeight: 1.4,
              fontWeight: biolumi.getFontWeight(),
              fontStyle: biolumi.getFontStyle(),
            };

            const _requestUis = () => Promise.all([
               biolumi.requestUi({
                 width: WIDTH,
                 height: HEIGHT,
              }),
              biolumi.requestUi({
                width: NAVBAR_WIDTH,
                height: NAVBAR_HEIGHT,
              }),
            ]).then(([
              menuUi,
              navbarUi,
            ]) => ({
              menuUi,
              navbarUi,
            }));

            return Promise.all([
              _requestUis(),
              _requestMainReadme(),
            ]).then(([
              {
                menuUi,
                navbarUi,
              },
              mainReadme,
            ]) => {
              if (live) {
                const uploadStart = () => {
                  const pages = menuUi.getPages();
                  if (pages.length > 0 && pages[pages.length - 1].type === 'files') { // XXX handle multiple uploads and elementAttributeFiles page
                    filesState.uploading = true;
                  }

                  _updatePages();
                }
                fs.addEventListener('uploadStart', uploadStart);
                const uploadEnd = () => {
                  filesState.uploading = false;
                  filesState.loading = true;

                  const {cwd} = filesState;
                  fs.getDirectory(cwd)
                    .then(files => {
                      filesState.files = menuUtils.cleanFiles(files);
                      filesState.loading = false;

                      _updatePages();
                    })
                    .catch(err => {
                      console.warn(err);
                    });

                  _updatePages();
                }
                fs.addEventListener('uploadEnd', uploadEnd);
                cleanups.push(() => {
                  fs.removeEventListener('uploadStart', uploadStart);
                  fs.removeEventListener('uploadEnd', uploadEnd);
                });

                const {matrix: matrixArray} = hub.getUserState();
                if (matrixArray) {
                  webvr.setStageMatrix(new THREE.Matrix4().fromArray(matrixArray));
                  webvr.updateStatus();
                }

                const unload = e => {
                  hub.saveUserStateAsync();
                };
                window.addEventListener('unload', unload);
                cleanups.push(() => {
                  window.removeEventListener('unload', unload);
                });

                menuUi.pushPage([
                  {
                    type: 'html',
                    src: menuRenderer.getMainPageSrc(),
                  },
                  {
                    type: 'html',
                    src: mainReadme,
                    x: 500,
                    y: 150 + 2,
                    w: WIDTH - 500,
                    h: HEIGHT - (150 + 2),
                    scroll: true,
                  },
                  {
                    type: 'image',
                    img: creatureUtils.makeAnimatedCreature('zeo.sh'),
                    x: 0,
                    y: 0,
                    w: 150,
                    h: 150,
                    frameTime: 300,
                    pixelated: true,
                  }
                ], {
                  type: 'main',
                  immediate: true,
                });

                navbarUi.pushPage(({navbar: {tab}}) => {
                  return [
                    {
                      type: 'html',
                      src: menuRenderer.getNavbarSrc({tab}),
                      x: 0,
                      y: 0,
                      w: NAVBAR_WIDTH,
                      h: NAVBAR_HEIGHT,
                      scroll: true,
                    },
                  ];
                }, {
                  type: 'navbar',
                  state: {
                    navbar: navbarState,
                  },
                });

                menuMesh = (() => {
                  const object = new THREE.Object3D();
                  object.position.y = DEFAULT_USER_HEIGHT;

                  const planeMesh = (() => {
                    const width = WORLD_WIDTH;
                    const height = WORLD_HEIGHT;
                    const depth = WORLD_DEPTH;

                    const menuMaterial = biolumi.makeMenuMaterial();

                    const geometry = new THREE.PlaneBufferGeometry(width, height);
                    const materials = [solidMaterial, menuMaterial];

                    const mesh = THREE.SceneUtils.createMultiMaterialObject(geometry, materials);
                    // mesh.position.y = 1.5;
                    mesh.position.z = -1;
                    mesh.receiveShadow = true;
                    mesh.menuMaterial = menuMaterial;

                    const shadowMesh = (() => {
                      const geometry = new THREE.BoxBufferGeometry(width, height, 0.01);
                      const material = transparentMaterial;
                      const mesh = new THREE.Mesh(geometry, material);
                      mesh.castShadow = true;
                      return mesh;
                    })();
                    mesh.add(shadowMesh);

                    return mesh;
                  })();
                  object.add(planeMesh);
                  object.planeMesh = planeMesh;

                  object.universeMesh = null;

                  object.worldMesh = null;

                  object.configMesh = null;
                  object.statsMesh = null;

                  const navbarMesh = (() => {
                    const width = NAVBAR_WORLD_WIDTH;
                    const height = NAVBAR_WORLD_HEIGHT;
                    const depth = NAVBAR_WORLD_DEPTH;

                    const menuMaterial = biolumi.makeMenuMaterial();

                    const geometry = new THREE.PlaneBufferGeometry(width, height);
                    const materials = [solidMaterial, menuMaterial];

                    const mesh = THREE.SceneUtils.createMultiMaterialObject(geometry, materials);
                    mesh.position.y = -0.25;
                    mesh.position.z = -0.25;
                    mesh.receiveShadow = true;
                    mesh.menuMaterial = menuMaterial;

                    const shadowMesh = (() => {
                      const geometry = new THREE.BoxBufferGeometry(width, height, 0.01);
                      const material = transparentMaterial;
                      const mesh = new THREE.Mesh(geometry, material);
                      mesh.castShadow = true;
                      return mesh;
                    })();
                    mesh.add(shadowMesh);

                    return mesh;
                  })();
                  object.add(navbarMesh);
                  object.navbarMesh = navbarMesh;

                  object.inventoryMesh = null;

                  return object;
                })();
                scene.add(menuMesh);

                const menuBoxMeshes = {
                  left: biolumi.makeMenuBoxMesh(),
                  right: biolumi.makeMenuBoxMesh(),
                };
                scene.add(menuBoxMeshes.left);
                scene.add(menuBoxMeshes.right);

                const navbarBoxMeshes = {
                  left: biolumi.makeMenuBoxMesh(),
                  right: biolumi.makeMenuBoxMesh(),
                };
                scene.add(navbarBoxMeshes.left);
                scene.add(navbarBoxMeshes.right);

                const menuDotMeshes = {
                  left: biolumi.makeMenuDotMesh(),
                  right: biolumi.makeMenuDotMesh(),
                };
                scene.add(menuDotMeshes.left);
                scene.add(menuDotMeshes.right);

                const keyboardMesh = (() => {
                  const keySpecs = (() => {
                    const div = document.createElement('div');
                    div.style.cssText = 'position: absolute; top: 0; left: 0; width: ' + KEYBOARD_WIDTH + 'px; height: ' + KEYBOARD_HEIGHT + 'px;';
                    div.innerHTML = keyboardImg;

                    document.body.appendChild(div);

                    const keyEls = div.querySelectorAll(':scope > svg > g[key]');
                    const result = Array(keyEls.length);
                    for (let i = 0; i < keyEls.length; i++) {
                      const keyEl = keyEls[i];
                      const key = keyEl.getAttribute('key');
                      const rect = keyEl.getBoundingClientRect();

                      const keySpec = {key, rect};
                      result[i] = keySpec;
                    }

                    document.body.removeChild(div);

                    return result;
                  })();

                  const object = new THREE.Object3D();
                  object.position.y = DEFAULT_USER_HEIGHT;
                  object.keySpecs = keySpecs;

                  const planeMesh = (() => {
                    const _requestKeyboardImage = () => new Promise((accept, reject) => {
                      const img = new Image();
                      img.src = keyboardImgSrc;
                      img.onload = () => {
                        accept(img);
                      };
                      img.onerror = err => {
                        reject(err);
                      };
                    });

                    const geometry = new THREE.PlaneBufferGeometry(KEYBOARD_WORLD_WIDTH, KEYBOARD_WORLD_HEIGHT);
                    const material = (() => {
                      const texture = new THREE.Texture(
                        transparentImg,
                        THREE.UVMapping,
                        THREE.ClampToEdgeWrapping,
                        THREE.ClampToEdgeWrapping,
                        THREE.LinearFilter,
                        THREE.LinearFilter,
                        THREE.RGBAFormat,
                        THREE.UnsignedByteType,
                        16
                      );

                      _requestKeyboardImage()
                        .then(img => {
                          texture.image = img;
                          texture.needsUpdate = true;
                        })
                        .catch(err => {
                          console.warn(err);
                        });

                      const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        side: THREE.DoubleSide,
                        transparent: true,
                        alphaTest: 0.5,
                      });
                      return material;
                    })();
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.y = 1 - DEFAULT_USER_HEIGHT;
                    mesh.rotation.x = -Math.PI * (3 / 8);

                    const shadowMesh = (() => {
                      const geometry = new THREE.BoxBufferGeometry(KEYBOARD_WORLD_WIDTH, KEYBOARD_WORLD_HEIGHT, 0.01);
                      const material = transparentMaterial;
                      const mesh = new THREE.Mesh(geometry, material);
                      mesh.castShadow = true;
                      return mesh;
                    })();
                    mesh.add(shadowMesh);

                    return mesh;
                  })();
                  object.add(planeMesh);
                  object.planeMesh = planeMesh;

                  return object;
                })();
                scene.add(keyboardMesh);

                const keyboardBoxMeshes = {
                  left: biolumi.makeMenuBoxMesh(),
                  right: biolumi.makeMenuBoxMesh(),
                };
                scene.add(keyboardBoxMeshes.left);
                scene.add(keyboardBoxMeshes.right);

                const _updatePages = menuUtils.debounce(next => {
                  const menuPages = menuUi.getPages();
                  const navbarPages = navbarUi.getPages();
                  const pages = menuPages.concat(navbarPages);

                  if (pages.length > 0) {
                    let pending = pages.length;
                    const pend = () => {
                      if (--pending === 0) {
                        next();
                      }
                    };

                    for (let i = 0; i < pages.length; i++) {
                      const page = pages[i];
                      const {type} = page;

                      let match;
                      if (type === 'worlds') {
                        page.update({
                          worlds: worldsState,
                          focus: focusState,
                        }, pend);
                      } else if (type === 'mods') {
                        page.update({
                          mods: modsState,
                          focus: focusState,
                        }, pend);
                      } else if (type === 'mod') {
                        page.update({
                          mod: modState,
                          mods: modsState,
                        }, pend);
                      } else if (type === 'elements') {
                        page.update({
                          elements: _cleanElementsState(elementsState),
                          focus: focusState,
                        }, pend);
                      } else if (type === 'files') {
                        page.update({
                          files: filesState,
                          focus: focusState,
                        }, pend);
                      } else if (type === 'elementAttributeFiles') {
                        page.update({
                          elementAttributeFiles: elementAttributeFilesState,
                          focus: focusState,
                        }, pend);
                      } else if (type === 'navbar') {
                        page.update({
                          navbar: navbarState,
                        }, pend);
                      } else {
                        pend();
                      }
                    }
                  } else {
                    next();
                  }
                });
                const trigger = e => {
                  const {open} = menuState;

                  if (open) {
                    const oldStates = {
                      worldsState: {
                        selectedName: worldsState.selectedName,
                      },
                      elementsState: {
                        selectedKeyPath: elementsState.selectedKeyPath,
                        draggingKeyPath: elementsState.draggingKeyPath,
                      },
                      filesState: {
                        selectedName: filesState.selectedName,
                      },
                      elementAttributeFilesState: {
                        selectedName: elementAttributeFilesState.selectedName,
                      },
                    };

                    const _doSetPosition = e => {
                      const {side} = e;
                      const {positioningSide} = elementsState;

                      if (positioningSide && side === positioningSide) {
                        const {positioningName} = elementsState;
                        const {elementsState: {selectedKeyPath: oldElementsSelectedKeyPath}} = oldStates;

                        const element = menuUtils.getElementKeyPath({
                          elements: elementsState.elements,
                          availableElements: elementsState.availableElements,
                          clipboardElements: elementsState.clipboardElements,
                        }, oldElementsSelectedKeyPath);
                        const instance = menuUtils.getElementKeyPath({
                          elements: elementsState.elementInstances,
                        }, oldElementsSelectedKeyPath);

                        const {position, quaternion, scale} = positioningMesh;
                        const newValue = position.toArray().concat(quaternion.toArray()).concat(scale.toArray());
                        const newAttributeValue = JSON.stringify(newValue);
                        element.setAttribute(positioningName, newAttributeValue);
                        instance.setAttribute(positioningName, newAttributeValue);

                        elementsState.positioningName = null;
                        elementsState.positioningSide = null;

                        _saveElements();

                        _updatePages();

                        return true;
                      } else {
                        return false;
                      }
                    };
                    const _doClickNavbar = e => {
                      const {side} = e;
                      const navbarHoverState = navbarHoverStates[side];
                      const {anchor} = navbarHoverState;
                      const onclick = (anchor && anchor.onclick) || '';

                      let match;
                      if (match = onclick.match(/^navbar:(readme|multiverse|world|inventory|options)$/)) {
                        const newTab = match[1];

                        const _getTabMesh = tab => {
                          switch (tab) {
                            case 'readme': return menuMesh.planeMesh;
                            case 'multiverse': return menuMesh.universeMesh;
                            case 'world': return menuMesh.worldMesh;
                            case 'inventory': return menuMesh.inventoryMesh;
                            case 'options': return menuMesh.configMesh;
                            default: return null;
                          }
                        };

                        const {tab: oldTab} = navbarState;
                        const oldMesh = _getTabMesh(oldTab);
                        const newMesh = _getTabMesh(newTab);

                        oldMesh.visible = false;
                        newMesh.visible = true;

                        navbarState.tab = newTab;

                        _updatePages();

                        api.emit('tabchange', newTab);

                        return true;
                      } else {
                        return false;
                      }
                    };
                    const _doClickMenu = e => {
                      const {tab} = navbarState;

                      if (tab === 'readme') {
                        const {side} = e;
                        const menuHoverState = menuHoverStates[side];
                        const {intersectionPoint} = menuHoverState;

                        if (intersectionPoint) {
                          const {anchor} = menuHoverState;
                          const onclick = (anchor && anchor.onclick) || '';

                          focusState.type = '';
                          worldsState.selectedName = '';
                          filesState.selectedName = '';
                          elementAttributeFilesState.selectedName = '';

                          const _ensureFilesLoaded = targetState => {
                            const {loaded} = targetState;

                            if (!loaded) {
                              targetState.loading = true;

                              const {cwd} = targetState;
                              fs.getDirectory(cwd)
                                .then(files => {
                                  targetState.files = menuUtils.cleanFiles(files);
                                  targetState.loading = false;

                                  _updatePages();
                                })
                                .catch(err => {
                                  console.warn(err);
                                });
                            }
                          };

                          let match;
                          if (onclick === 'back') {
                            menuUi.cancelTransition();

                            if (menuUi.getPages().length > 1) {
                              menuUi.popPage();
                            }
                          } else if (onclick === 'worlds') {
                            menuUi.cancelTransition();

                            menuUi.pushPage(({worlds: {worlds, selectedName, inputText, inputValue}, focus: {type: focusType}}) => ([
                              {
                                type: 'html',
                                src: menuRenderer.getWorldsPageSrc({worlds, selectedName, inputText, inputValue, focusType}),
                              },
                              {
                                type: 'image',
                                img: creatureUtils.makeAnimatedCreature('worlds'),
                                x: 150,
                                y: 0,
                                w: 150,
                                h: 150,
                                frameTime: 300,
                                pixelated: true,
                              }
                            ]), {
                              type: 'worlds',
                              state: {
                                worlds: worldsState,
                                focus: focusState,
                              },
                            });
                          } else if (match = onclick.match(/^world:(.+)$/)) {
                            const name = match[1];

                            worldsState.selectedName = name;

                            _updatePages();
                          } else if (onclick === 'worlds:rename') {
                            const {worldsState: {selectedName: oldWorldsSelectedName}} = oldStates;
                            if (oldWorldsSelectedName) {
                              worldsState.inputText = '';
                              worldsState.inputIndex = 0;
                              worldsState.inputValue = 0;

                              focusState.type = 'worlds:rename:' + oldWorldsSelectedName;

                              _updatePages();
                            }
                          } else if (onclick === 'worlds:remove') {
                            const {worldsState: {selectedName: oldWorldsSelectedName}} = oldStates;
                            if (oldWorldsSelectedName) {
                              const {worlds} = worldsState;
                              worldsState.worlds = worlds.filter(world => world.name !== oldWorldsSelectedName);

                              _updatePages();
                            }
                          } else if (onclick === 'worlds:create') {
                            worldsState.inputText = '';
                            worldsState.inputIndex = 0;
                            worldsState.inputValue = 0;

                            focusState.type = 'worlds:create';

                            _updatePages();
                          } else if (onclick === 'mods') {
                            menuUi.cancelTransition();

                            menuUi.pushPage(({mods: {mods, localMods, remoteMods, tab, inputText, inputValue, loadingLocal, loadingRemote}, focus: {type: focusType}}) => ([
                              {
                                type: 'html',
                                src: menuRenderer.getModsPageSrc({mods, localMods, remoteMods, tab, inputText, inputValue, loadingLocal, loadingRemote, focus: focusType === 'mods'}),
                              },
                              {
                                type: 'image',
                                img: creatureUtils.makeAnimatedCreature('mods'),
                                x: 150,
                                y: 0,
                                w: 150,
                                h: 150,
                                frameTime: 300,
                                pixelated: true,
                              }
                            ]), {
                              type: 'mods',
                              state: {
                                mods: modsState,
                                focus: focusState,
                              },
                            });
                          } else if (match = onclick.match(/^mods:(installed|local|remote)$/)) {
                            const tab = match[1];

                            if (tab === 'local') {
                              modsState.loadingLocal = true;

                              _getLocalModSpecs()
                                .then(localMods => {
                                  modsState.localMods = localMods;
                                  modsState.loadingLocal = false;

                                  _updatePages();
                                })
                                .catch(err => {
                                  console.warn(err);
                                });
                            } else if (tab === 'remote') {
                              modsState.inputText = '';
                              modsState.inputIndex = 0;
                              modsState.inputValue = 0;
                              modsState.loadingRemote = true;

                              _getRemoteModSpecs(modsState.inputText)
                                .then(remoteMods => {
                                  modsState.remoteMods = remoteMods;
                                  modsState.loadingRemote = false;

                                  _updatePages();
                                })
                                .catch(err => {
                                  console.warn(err);
                                });
                            }

                            modsState.tab = tab;

                            _updatePages();
                          } else if (match = onclick.match(/^mod:(.+)$/)) {
                            const name = match[1];

                            menuUi.cancelTransition();

                            modState.modName = name;
                            modState.mod = null;
                            modState.loading = true;

                            _getModSpec(name)
                              .then(modSpec => {
                                modState.mod = modSpec;
                                modState.loading = false;

                                _updatePages();
                              })
                              .catch(err => {
                                console.warn(err);

                                modState.loading = false;

                                _updatePages();
                              });

                            menuUi.pushPage(({mod: {modName, mod, loading}, mods: {mods}}) => {
                              const displayName = modName.match(/([^\/]*)$/)[1];
                              const installed = mods.some(m => m.name === modName);
                              const conflicting = mods.some(m => m.displayName === displayName);

                              return [
                                {
                                  type: 'html',
                                  src: menuRenderer.getModPageSrc({modName, mod, installed, conflicting}),
                                },
                                {
                                  type: 'html',
                                  src: menuRenderer.getModPageReadmeSrc({modName, mod, loading}),
                                  x: 500,
                                  y: 150 + 2,
                                  w: WIDTH - 500,
                                  h: HEIGHT - (150 + 2),
                                  scroll: true,
                                },
                                {
                                  type: 'image',
                                  img: creatureUtils.makeAnimatedCreature('mod:' + displayName),
                                  x: 150,
                                  y: 0,
                                  w: 150,
                                  h: 150,
                                  frameTime: 300,
                                  pixelated: true,
                                }
                              ];
                            }, {
                              type: 'mod',
                              state: {
                                mod: modState,
                                mods: modsState,
                              },
                            });
                          } else if (match = onclick.match(/^getmod:(.+)$/)) {
                            const name = match[1];

                            currentWorld.requestAddMod(name)
                              .then(() => {
                                _updatePages();
                              })
                              .catch(err => {
                                console.warn(err);
                              });
                          } else if (match = onclick.match(/^removemod:(.+)$/)) {
                            const name = match[1];

                            currentWorld.requestRemoveMod(name)
                              .then(() => {
                                _updatePages();
                              })
                              .catch(err => {
                                console.warn(err);
                              });
                          } else if (onclick === 'elements') {
                            menuUi.cancelTransition();

                            menuUi.pushPage(({elements: {elements, availableElements, clipboardElements, selectedKeyPath, draggingKeyPath, positioningName, inputText, inputValue}, focus: {type: focusType}}) => {
                              const match = focusType ? focusType.match(/^element:attribute:(.+)$/) : null;
                              const focusAttribute = match && match[1];

                              return [
                                {
                                  type: 'html',
                                  src: menuRenderer.getElementsPageSrc({selectedKeyPath}),
                                },
                                {
                                  type: 'html',
                                  src: menuRenderer.getElementsPageContentSrc({elements, selectedKeyPath, draggingKeyPath}),
                                  x: 500,
                                  y: 150 + 2,
                                  w: WIDTH - (500 + 600),
                                  h: HEIGHT - (150 + 2),
                                  scroll: true,
                                },
                                {
                                  type: 'html',
                                  src: menuRenderer.getElementsPageSubcontentSrc({elements, availableElements, clipboardElements, selectedKeyPath, draggingKeyPath, positioningName, inputText, inputValue, focusAttribute}),
                                  x: 500 + (WIDTH - (500 + 600)),
                                  y: 150 + 2,
                                  w: 600,
                                  h: HEIGHT - (150 + 2),
                                  scroll: true,
                                },
                                {
                                  type: 'image',
                                  img: creatureUtils.makeAnimatedCreature('preferences'),
                                  x: 150,
                                  y: 0,
                                  w: 150,
                                  h: 150,
                                  frameTime: 300,
                                  pixelated: true,
                                }
                              ];
                            }, {
                              type: 'elements',
                              state: {
                                elements: _cleanElementsState(elementsState),
                                focus: focusState,
                              },
                            });
                          } else if (onclick === 'files') {
                            menuUi.cancelTransition();

                            _ensureFilesLoaded(filesState);

                            menuUi.pushPage(({files: {cwd, files, inputText, inputValue, selectedName, clipboardPath, loading, uploading}, focus: {type: focusType}}) => ([
                              {
                                type: 'html',
                                src: menuRenderer.getFilesPageSrc({cwd, files, inputText, inputValue, selectedName, clipboardPath, loading, uploading, focusType, prefix: 'file'}),
                              },
                              {
                                type: 'image',
                                img: creatureUtils.makeAnimatedCreature('files'),
                                x: 150,
                                y: 0,
                                w: 150,
                                h: 150,
                                frameTime: 300,
                                pixelated: true,
                              }
                            ]), {
                              type: 'files',
                              state: {
                                files: filesState,
                                focus: focusState,
                              },
                            });
                          } else if (match = onclick.match(/^(file|elementAttributeFile):(.+)$/)) {
                            menuUi.cancelTransition();

                            const target = match[1];
                            const name = match[2];
                            const targetState = (() => {
                              switch (target) {
                                case 'file': return filesState;
                                case 'elementAttributeFile': return elementAttributeFilesState;
                                default: return null;
                              }
                            })();

                            const _chdir = newCwd => {
                              targetState.loading = true;

                              targetState.cwd = newCwd;
                              fs.setCwd(newCwd);
                              fs.getDirectory(newCwd)
                                .then(files => {
                                  targetState.files = menuUtils.cleanFiles(files);
                                  targetState.loading = false;

                                  _updatePages();
                                })
                                .catch(err => {
                                  console.warn(err);
                                });

                              _updatePages();
                            };

                            if (name !== '..') {
                              const {files} = targetState;
                              const file = files.find(f => f.name === name);
                              const {type} = file;

                              if (type === 'file') {
                                targetState.selectedName = name;

                                _updatePages();
                              } else if (type === 'directory') {
                                const {cwd: oldCwd} = targetState;
                                const newCwd = oldCwd + (!/\/$/.test(oldCwd) ? '/' : '') + name;
                                _chdir(newCwd);
                              }
                            } else {
                              const {cwd: oldCwd} = targetState;
                              const newCwd = (() => {
                                const replacedCwd = oldCwd.replace(/\/[^\/]*$/, '');
                                if (replacedCwd !== '') {
                                  return replacedCwd;
                                } else {
                                  return '/';
                                }
                              })();
                              _chdir(newCwd);
                            }
                          } else if (onclick === 'elementAttributeFiles:select') {
                            const {
                              elementsState: {selectedKeyPath: oldElementsSelectedKeyPath},
                              elementAttributeFilesState: {selectedName: oldFilesSelectedName},
                            } = oldStates;

                            if (oldFilesSelectedName) {
                              menuUi.cancelTransition();

                              const {choosingName} = elementsState;
                              const element = menuUtils.getElementKeyPath({
                                elements: elementsState.elements,
                                availableElements: elementsState.availableElements,
                                clipboardElements: elementsState.clipboardElements,
                              }, oldElementsSelectedKeyPath);
                              const instance = menuUtils.getElementKeyPath({
                                elements: elementsState.elementInstances,
                              }, oldElementsSelectedKeyPath);

                              const {cwd} = elementAttributeFilesState;
                              const selectPath = menuUtils.pathJoin(cwd, oldFilesSelectedName);
                              const newAttributeValue = JSON.stringify(selectPath);
                              element.setAttribute(choosingName, newAttributeValue);
                              instance.setAttribute(choosingName, newAttributeValue);

                              _saveElements();

                              menuUi.popPage();
                            }
                          } else if (match = onclick.match(/^(file|elementAttributeFile)s:(cut|copy)$/)) {
                            const target = match[1];
                            const type = match[2];

                            const targetState = (() => {
                              switch (target) {
                                case 'file': return filesState;
                                case 'elementAttributeFile': return elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const oldTargetState = (() => {
                              switch (target) {
                                case 'file': return oldStates.filesState;
                                case 'elementAttributeFile': return oldStates.elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const {selectedName: oldFilesSelectedName} = oldTargetState;

                            if (oldFilesSelectedName) {
                              const {cwd} = targetState;
                              const cutPath = menuUtils.pathJoin(cwd, oldFilesSelectedName);

                              targetState.selectedName = oldFilesSelectedName;
                              targetState.clipboardType = type;
                              targetState.clipboardPath = cutPath;

                              _updatePages();
                            }
                          } else if (match = onclick.match(/^(file|elementAttributeFile)s:paste$/)) {
                            const target = match[1];
                            const targetState = (() => {
                              switch (target) {
                                case 'file': return filesState;
                                case 'elementAttributeFile': return elementAttributeFilesState;
                                default: return null;
                              }
                            })();

                            const {clipboardPath} = targetState;

                            if (clipboardPath) {
                              targetState.uploading = true;

                              const {cwd, clipboardType, clipboardPath} = targetState;

                              const src = clipboardPath;
                              const name = clipboardPath.match(/\/([^\/]*)$/)[1];
                              const dst = menuUtils.pathJoin(cwd, name);
                              fs[(clipboardType === 'cut') ? 'move' : 'copy'](src, dst)
                                .then(() => fs.getDirectory(cwd)
                                  .then(files => {
                                    targetState.files = menuUtils.cleanFiles(files);
                                    targetState.selectedName = name;
                                    targetState.uploading = false;
                                    if (clipboardType === 'cut') {
                                      targetState.clipboardType = 'copy';
                                      targetState.clipboardPath = dst;
                                    }

                                    _updatePages();
                                  })
                                )
                                .catch(err => {
                                  console.warn(err);

                                  targetState.uploading = true;

                                  _updatePages();
                                });

                              _updatePages();
                            }
                          } else if (match = onclick.match(/^(file|elementAttributeFile)s:createdirectory$/)) {
                            const target = match[1];

                            focusState.type = target + 's:createdirectory';

                            _updatePages();
                          } else if (match = onclick.match(/^(file|elementAttributeFile)s:rename$/)) {
                            const target = match[1];
                            const targetState = (() => {
                              switch (target) {
                                case 'file': return filesState;
                                case 'elementAttributeFile': return elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const oldTargetState = (() => {
                              switch (target) {
                                case 'file': return oldStates.filesState;
                                case 'elementAttributeFile': return oldStates.elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const {selectedName: oldFilesSelectedName} = oldTargetState;

                            if (oldFilesSelectedName) {
                              targetState.inputText = '';
                              targetState.inputIndex = 0;
                              targetState.inputValue = 0;

                              focusState.type = 'files:rename:' + oldFilesSelectedName;

                              _updatePages();
                            }
                          } else if (match = onclick.match(/^(file|elementAttributeFile)s:remove$/)) {
                            const target = match[1];
                            const targetState = (() => {
                              switch (target) {
                                case 'file': return filesState;
                                case 'elementAttributeFile': return elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const oldTargetState = (() => {
                              switch (target) {
                                case 'file': return oldStates.filesState;
                                case 'elementAttributeFile': return oldStates.elementAttributeFilesState;
                                default: return null;
                              }
                            })();
                            const {selectedName: oldFilesSelectedName} = oldTargetState;

                            if (oldFilesSelectedName) {
                              targetState.uploading = true;

                              const {cwd} = targetState;
                              const p = menuUtils.pathJoin(cwd, oldFilesSelectedName);
                              fs.remove(p)
                                .then(() => fs.getDirectory(cwd)
                                  .then(files => {
                                    targetState.files = menuUtils.cleanFiles(files);
                                    const {clipboardPath} = targetState;
                                    if (clipboardPath === p) {
                                      targetState.clipboardType = null;
                                      targetState.clipboardPath = '';
                                    }
                                    targetState.uploading = false;

                                    _updatePages();
                                  })
                                )
                                .catch(err => {
                                  console.warn(err);

                                  targetState.uploading = false;

                                  _updatePages();
                                });

                              _updatePages();
                            }
                          } else if (onclick === 'elements:remove') {
                            const {elementsState: {selectedKeyPath: oldElementsSelectedKeyPath}} = oldStates;
                            if (oldElementsSelectedKeyPath.length > 0) {
                              const elementsSpec = {
                                elements: elementsState.elements,
                                availableElements: elementsState.availableElements,
                                clipboardElements: elementsState.clipboardElements,
                              };
                              menuUtils.removeElementKeyPath(elementsSpec, oldElementsSelectedKeyPath);
                              const elementInstancesSpec = {
                                elements: elementsState.elementInstances,
                              };
                              if (oldElementsSelectedKeyPath[0] === 'elements') {
                                const instance = menuUtils.removeElementKeyPath(elementInstancesSpec, oldElementsSelectedKeyPath);
                                menuUtils.destructElement(instance);
                              }

                              elementsState.selectedKeyPath = [];
                              elementsState.draggingKeyPath = [];

                              _saveElements();

                              _updatePages();
                            }
                          } else if (match = onclick.match(/^element:attribute:(.+?):(position|focus|set|tweak|toggle|choose)(?::(.+?))?$/)) {
                            const attributeName = match[1];
                            const action = match[2];
                            const value = match[3];

                            const {elementsState: {selectedKeyPath: oldElementsSelectedKeyPath}} = oldStates;

                            const element = menuUtils.getElementKeyPath({
                              elements: elementsState.elements,
                              availableElements: elementsState.availableElements,
                              clipboardElements: elementsState.clipboardElements,
                            }, oldElementsSelectedKeyPath);
                            const instance = menuUtils.getElementKeyPath({
                              elements: elementsState.elementInstances,
                            }, oldElementsSelectedKeyPath);
                            const {attributeConfigs} = element;
                            const attributeConfig = attributeConfigs[attributeName];

                            if (action === 'position') {
                              const oldValue = JSON.parse(element.getAttribute(attributeName));
                              oldPositioningMesh.position.set(oldValue[0], oldValue[1], oldValue[2]);
                              oldPositioningMesh.quaternion.set(oldValue[3], oldValue[4], oldValue[5], oldValue[6]);
                              oldPositioningMesh.scale.set(oldValue[7], oldValue[8], oldValue[9]);

                              elementsState.positioningName = attributeName;
                              elementsState.positioningSide = side;
                            } else if (action === 'focus') {
                              const {value} = menuHoverState;

                              const {type: attributeType} = attributeConfig;
                              const textProperties = (() => {
                                if (attributeType === 'text') {
                                  const valuePx = value * 400;
                                  return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(JSON.parse(element.getAttribute(attributeName)), attributeType), subcontentFontSpec, valuePx);
                                } else if (attributeType === 'number') {
                                  const valuePx = value * 100;
                                  return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(JSON.parse(element.getAttribute(attributeName)), attributeType), subcontentFontSpec, valuePx);
                                } else if (attributeType === 'color') {
                                  const valuePx = value * (400 - (40 + 4));
                                  return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(JSON.parse(element.getAttribute(attributeName)), attributeType), subcontentFontSpec, valuePx);
                                } else if (attributeType === 'file') {
                                  const valuePx = value * 260;
                                  return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(JSON.parse(element.getAttribute(attributeName)), attributeType), subcontentFontSpec, valuePx);
                                } else {
                                  return null;
                                }
                              })();
                              if (textProperties) {
                                elementsState.inputText = menuUtils.castValueValueToString(JSON.parse(element.getAttribute(attributeName)), attributeType);
                                const {index, px} = textProperties;
                                elementsState.inputIndex = index;
                                elementsState.inputValue = px;
                              }

                              focusState.type = 'element:attribute:' + attributeName;
                            } else if (action === 'set') {
                              const newAttributeValue = JSON.stringify(value);
                              element.setAttribute(attributeName, newAttributeValue);
                              instance.setAttribute(attributeName, newAttributeValue);

                              _saveElements();
                            } else if (action === 'tweak') {
                              const {value} = menuHoverState;
                              const {min = ATTRIBUTE_DEFAULTS.MIN, max = ATTRIBUTE_DEFAULTS.MAX, step = ATTRIBUTE_DEFAULTS.STEP} = attributeConfig;

                              const newValue = (() => {
                                let n = min + (value * (max - min));
                                if (step > 0) {
                                  n = Math.floor(n / step) * step;
                                }
                                return n;
                              })();
                              const newAttributeValue = JSON.stringify(newValue);
                              element.setAttribute(attributeName, newAttributeValue);
                              instance.setAttribute(attributeName, newAttributeValue);

                              _saveElements();
                            } else if (action === 'toggle') {
                              const newValue = !JSON.parse(element.getAttribute(attributeName));
                              const newAttributeValue = JSON.stringify(newValue);
                              element.setAttribute(attributeName, newAttributeValue);
                              instance.setAttribute(attributeName, newAttributeValue);

                              _saveElements();
                            } else if (action === 'choose') {
                              menuUi.cancelTransition();

                              elementsState.choosingName = attributeName;

                              _ensureFilesLoaded(elementAttributeFilesState);

                              menuUi.pushPage(({elementAttributeFiles: {cwd, files, inputText, inputValue, selectedName, clipboardPath, loading, uploading}, focus: {type: focusType}}) => ([
                                {
                                  type: 'html',
                                  src: menuRenderer.getFilesPageSrc({cwd, files, inputText, inputValue, selectedName, clipboardPath, loading, uploading, focusType, prefix: 'elementAttributeFile'}),
                                },
                                {
                                  type: 'image',
                                  img: creatureUtils.makeAnimatedCreature('files'),
                                  x: 150,
                                  y: 0,
                                  w: 150,
                                  h: 150,
                                  frameTime: 300,
                                  pixelated: true,
                                }
                              ]), {
                                type: 'elementAttributeFiles',
                                state: {
                                  elementAttributeFiles: elementAttributeFilesState,
                                  focus: focusState,
                                },
                              });
                            }

                            elementsState.selectedKeyPath = oldElementsSelectedKeyPath;

                            _updatePages();
                          } else if (onclick === 'elements:clearclipboard') {
                            const {elementsState: {selectedKeyPath: oldElementsSelectedKeyPath, draggingKeyPath: oldElementsDraggingKeyPath}} = oldStates;

                            elementsState.clipboardElements = [];
                            if (oldElementsSelectedKeyPath.length > 0 && oldElementsSelectedKeyPath[0] === 'clipboardElements') {
                              elementsState.selectedKeyPath = [];
                            }
                            if (oldElementsDraggingKeyPath.length > 0 && oldElementsDraggingKeyPath[0] === 'clipboardElements') {
                              elementsState.draggingKeyPath = [];
                            }

                            _saveElements();

                            _updatePages();
                          } else if (onclick === 'mods:input') {
                            const {value} = menuHoverState;
                            const valuePx = value * (WIDTH - (500 + 40));

                            const {index, px} = biolumi.getTextPropertiesFromCoord(modsState.inputText, mainFontSpec, valuePx);

                            modsState.inputIndex = index;
                            modsState.inputValue = px;
                            focusState.type = 'mods';

                            _updatePages();
                          } else {
                            _updatePages();
                          }

                          return true;
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    };

                    _doSetPosition(e) || _doClickNavbar(e) || _doClickMenu(e);
                  }
                };
                input.on('trigger', trigger);
                const triggerdown = e => {
                  const {open} = menuState;

                  if (open) {
                    const {side} = e;
                    const menuHoverState = menuHoverStates[side];

                    const _doClick = () => {
                      const {tab} = navbarState;

                      if (tab === 'readme') {
                        const {intersectionPoint} = menuHoverState;

                        if (intersectionPoint) {
                          const {anchor} = menuHoverState;
                          const onmousedown = (anchor && anchor.onmousedown) || '';

                          if (/^element:attribute:(.+?):(position|focus|set|tweak|toggle|choose)(?::(.+?))?$/.test(onmousedown)) {
                            return true;
                          } else {
                            return false;
                          }
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    };
                    const _doDragElement = () => {
                      const {tab} = navbarState;

                      if (tab === 'readme') {
                        const {intersectionPoint} = menuHoverState;

                        if (intersectionPoint) {
                          const {anchor} = menuHoverState;
                          const onmousedown = (anchor && anchor.onmousedown) || '';

                          let match;
                          if (match = onmousedown.match(/^element:select:((?:elements|availableElements|clipboardElements):(?:[0-9]+:)*[0-9]+)$/)) {
                            const keyPath = menuUtils.parseKeyPath(match[1]);

                            elementsState.selectedKeyPath = keyPath;
                            elementsState.draggingKeyPath = keyPath;

                            _updatePages();

                            return true;
                          } else {
                            return false;
                          }
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    };
                    const _doScroll = () => {
                      const {tab} = navbarState;

                      if (tab === 'readme') {
                        const {scrollLayer} = menuHoverState;

                        if (scrollLayer) {
                          const {intersectionPoint} = menuHoverState;

                          const {planeMesh} = menuMesh;
                          const {position: menuPosition, rotation: menuRotation} = _decomposeObjectMatrixWorld(planeMesh);
                          const _getMenuMeshCoordinate = biolumi.makeMeshCoordinateGetter({
                            position: menuPosition,
                            rotation: menuRotation,
                            width: WIDTH,
                            height: HEIGHT,
                            worldWidth: WORLD_WIDTH,
                            worldHeight: WORLD_HEIGHT,
                          });
                          const mousedownStartCoord = _getMenuMeshCoordinate(intersectionPoint);
                          menuHoverState.mousedownScrollLayer = scrollLayer;
                          menuHoverState.mousedownStartCoord = mousedownStartCoord;
                          menuHoverState.mousedownStartScrollTop = scrollLayer.scrollTop;

                          return true;
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    };

                    _doClick() || _doDragElement() || _doScroll();
                  }
                };
                input.on('triggerdown', triggerdown);

                const _setLayerScrollTop = menuHoverState => {
                  const {mousedownScrollLayer, mousedownStartCoord, mousedownStartScrollTop, intersectionPoint} = menuHoverState;

                  const {planeMesh} = menuMesh;
                  const {position: menuPosition, rotation: menuRotation} = _decomposeObjectMatrixWorld(planeMesh);
                  const _getMenuMeshCoordinate = biolumi.makeMeshCoordinateGetter({
                    position: menuPosition,
                    rotation: menuRotation,
                    width: WIDTH,
                    height: HEIGHT,
                    worldWidth: WORLD_WIDTH,
                    worldHeight: WORLD_HEIGHT,
                  });
                  const mousedownCurCoord = _getMenuMeshCoordinate(intersectionPoint);
                  const mousedownCoordDiff = mousedownCurCoord.clone()
                    .sub(mousedownStartCoord)
                    .multiply(new THREE.Vector2(WIDTH / WORLD_WIDTH, HEIGHT / WORLD_HEIGHT));
                  const scrollTop = Math.max(
                    Math.min(
                      mousedownStartScrollTop - mousedownCoordDiff.y,
                      (mousedownScrollLayer.scrollHeight > mousedownScrollLayer.h) ?
                        (mousedownScrollLayer.scrollHeight - mousedownScrollLayer.h)
                      :
                        0
                    ),
                    0
                  );

                  mousedownScrollLayer.scrollTo(scrollTop);
                };
                const triggerup = e => {
                  const {side} = e;

                  const _doDrag = () => {
                    const {tab} = navbarState;

                    if (tab === 'readme') {
                      const menuHoverState = menuHoverStates[side];
                      const {mousedownStartCoord} = menuHoverState;

                      if (mousedownStartCoord) {
                        const {anchor} = menuHoverState;
                        const onmouseup = (anchor && anchor.onmouseup) || '';

                        const oldStates = {
                          elementsState: {
                            draggingKeyPath: elementsState.draggingKeyPath,
                          },
                        };
                        const {elementsState: {draggingKeyPath: oldElementsDraggingKeyPath}} = oldStates;

                        if (oldElementsDraggingKeyPath.length > 0) {
                          elementsState.selectedKeyPath = [];
                          elementsState.draggingKeyPath = [];

                          const _getKeyPathDragFn = (oldKeyPath, newKeyPath) => {
                            const oldCollection = oldKeyPath[0];
                            const newCollection = newKeyPath[0];

                            return (elementsSpec, elementInstancesSpec, oldKeyPath, newKeyPath) => {
                              if (oldCollection === 'elements') {
                                if (newCollection === 'elements') {
                                  menuUtils.moveElementKeyPath(elementsSpec, oldKeyPath, newKeyPath);
                                  menuUtils.moveElementKeyPath(elementInstancesSpec, oldKeyPath, newKeyPath);
                                } else if (newCollection === 'clipboardElements') {
                                  menuUtils.moveElementKeyPath(elementsSpec, oldKeyPath, newKeyPath);
                                  const instance = menuUtils.removeElementKeyPath(elementInstancesSpec, oldKeyPath);
                                  menuUtils.destructElement(instance);
                                }
                              } else if (oldCollection === 'availableElements') {
                                if (newCollection !== 'availableElements') {
                                  const element = menuUtils.copyElementKeyPath(elementsSpec, oldKeyPath, newKeyPath);
                                  if (newCollection === 'elements') {
                                    const instance = menuUtils.constructElement(modElementApis, element);
                                    menuUtils.insertElementAtKeyPath(elementInstancesSpec, newKeyPath, instance);
                                  }
                                }
                              } else if (oldCollection === 'clipboardElements') {
                                if (newCollection !== 'availableElements') {
                                  const element = menuUtils.copyElementKeyPath(elementsSpec, oldKeyPath, newKeyPath);
                                  if (newCollection === 'elements') {
                                    const instance = menuUtils.constructElement(modElementApis, element);
                                    menuUtils.insertElementAtKeyPath(elementInstancesSpec, newKeyPath, instance);
                                  }
                                }
                              }
                            };
                          };

                          let match;
                          if (match = onmouseup.match(/^element:select:((?:elements|availableElements|clipboardElements):(?:[0-9]+:)*[0-9]+)$/)) {
                            const parentKeyPath = menuUtils.parseKeyPath(match[1]);

                            const elementsSpec = {
                              elements: elementsState.elements,
                              availableElements: elementsState.availableElements,
                              clipboardElements: elementsState.clipboardElements,
                            };
                            const childKeyPath = parentKeyPath.concat(menuUtils.getElementKeyPath(elementsSpec, parentKeyPath).children.length);

                            if (!menuUtils.isSubKeyPath(childKeyPath, oldElementsDraggingKeyPath) && !menuUtils.isAdjacentKeyPath(childKeyPath, oldElementsDraggingKeyPath)) {
                              const oldKeyPath = oldElementsDraggingKeyPath;
                              const newKeyPath = childKeyPath;
                              const dragFn = _getKeyPathDragFn(oldKeyPath, newKeyPath);
                              const elementInstancesSpec = {
                                elements: elementsState.elementInstances,
                              };
                              dragFn(elementsSpec, elementInstancesSpec, oldKeyPath, newKeyPath);

                              _saveElements();
                            } else {
                              elementsState.selectedKeyPath = oldElementsDraggingKeyPath;
                            }
                          } else if (match = onmouseup.match(/^element:move:((?:elements|availableElements|clipboardElements):(?:[0-9]+:)*[0-9]+)$/)) {
                            const keyPath = menuUtils.parseKeyPath(match[1]);

                            if (!menuUtils.isSubKeyPath(keyPath, oldElementsDraggingKeyPath) && !menuUtils.isAdjacentKeyPath(keyPath, oldElementsDraggingKeyPath)) {
                              const elementsSpec = {
                                elements: elementsState.elements,
                                availableElements: elementsState.availableElements,
                                clipboardElements: elementsState.clipboardElements,
                              };
                              const elementInstancesSpec = {
                                elements: elementsState.elementInstances,
                              };
                              const oldKeyPath = oldElementsDraggingKeyPath;
                              const newKeyPath = keyPath;
                              const dragFn = _getKeyPathDragFn(oldKeyPath, newKeyPath);
                              dragFn(elementsSpec, elementInstancesSpec, oldKeyPath, newKeyPath);

                              _saveElements();
                            } else {
                              elementsState.selectedKeyPath = oldElementsDraggingKeyPath;
                            }
                          } else {
                            elementsState.selectedKeyPath = oldElementsDraggingKeyPath;
                          }

                          _updatePages();
                        }
                      }
                    }

                    return false;
                  };
                  const _doScroll = () => {
                    const {tab} = navbarState;

                    if (tab === 'readme') {
                      const menuHoverState = menuHoverStates[side ];
                      const {mousedownStartCoord} = menuHoverState;

                      if (mousedownStartCoord) {
                        const {intersectionPoint} = menuHoverState;
                        if (intersectionPoint) {
                          _setLayerScrollTop(menuHoverState);
                        }

                        menuHoverState.mousedownScrollLayer = null;
                        menuHoverState.mousedownStartCoord = null;

                        return true;
                      } else {
                        return false;
                      }
                    } else {
                      return false;
                    }
                  };

                  _doDrag() || _doScroll();
                };
                input.on('triggerup', triggerup);
                const grip = e => {
                  const {open} = menuState;

                  if (open) {
                    const {side} = e;
                    const {positioningSide} = elementsState;

                    if (positioningSide && side === positioningSide) {
                      const {selectedKeyPath, positioningName} = elementsState;
                      const element = menuUtils.getElementKeyPath({
                        elements: elementsState.elements,
                        availableElements: elementsState.availableElements,
                        clipboardElements: elementsState.clipboardElements,
                      }, selectedKeyPath);
                      const instance = menuUtils.getElementKeyPath({
                        elements: elementsState.elementInstances,
                      }, selectedKeyPath);

                      const oldValue = element.getAttribute(positioningName);
                      instance.setAttribute(positioningName, oldValue);

                      elementsState.positioningName = null;
                      elementsState.positioningSide = null;

                      _updatePages();
                    }
                  }
                };
                input.on('grip', grip);
                const menudown = () => {
                  const {open, animation} = menuState;

                  if (open) {
                    menuState.open = false; // XXX need to cancel other menu states as well
                    menuState.animation = anima.makeAnimation(TRANSITION_TIME);

                    /* menuMesh.visible = false;
                    keyboardMesh.visible = false; */
                    SIDES.forEach(side => {
                      menuBoxMeshes[side].visible = false;
                      menuDotMeshes[side].visible = false;
                    });
                  } else {
                    menuState.open = true;
                    menuState.animation = anima.makeAnimation(TRANSITION_TIME);

                    const newPosition = camera.position;
                    const newRotation = camera.quaternion;

                    menuMesh.position.copy(newPosition);
                    menuMesh.quaternion.copy(newRotation);

                    keyboardMesh.position.copy(newPosition);
                    keyboardMesh.quaternion.copy(newRotation);
                  }
                };
                input.on('menudown', menudown);

                const keydown = e => {
                  const {tab} = navbarState;

                  if (tab === 'readme') {
                    const {open} = menuState;

                    if (open) {
                      const {type} = focusState;

                      let match;
                      if (type === 'worlds:create') {
                        const applySpec = biolumi.applyStateKeyEvent(worldsState, itemsFontSpec, e);

                        if (applySpec) {
                          const {commit} = applySpec;

                          if (commit) {
                            const {worlds, inputText} = worldsState;
                            const name = inputText;

                            if (!worlds.some(world => world.name === name)) {
                              worldsState.worlds.push({
                                name,
                                description: '',
                              });
                            }
                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      } else if (match = type.match(/^worlds:rename:(.+)$/)) {
                        const applySpec = biolumi.applyStateKeyEvent(worldsState, itemsFontSpec, e);

                        if (applySpec) {
                          const {commit} = applySpec;

                          if (commit) {
                            const {worlds, inputText} = worldsState;
                            const oldName = match[1];
                            const newName = inputText;

                            if (!worlds.some(world => world.name === newName && world.name !== oldName)) {
                              const world = worlds.find(world => world.name === oldName);
                              world.name = newName;

                              worldsState.selectedName = newName;
                            }
                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      } else if (type === 'mods') {
                        const applySpec = biolumi.applyStateKeyEvent(modsState, mainFontSpec, e);

                        if (applySpec) {
                          _getRemoteMods(modsState.inputText)
                            .then(remoteMods => {
                              modsState.remoteMods = remoteMods,

                              _updatePages();
                            })
                            .catch(err => {
                              console.warn(err);
                            });

                          const {commit} = applySpec;
                          if (commit) {
                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      } else if (match = type.match(/^element:attribute:(.+)$/)) {
                        const applySpec = biolumi.applyStateKeyEvent(elementsState, subcontentFontSpec, e);

                        if (applySpec) {
                          const {commit} = applySpec;

                          if (commit) {
                            const attributeName = match[1];
                            const {selectedKeyPath, inputText} = elementsState;

                            const element = menuUtils.getElementKeyPath({
                              elements: elementsState.elements,
                              availableElements: elementsState.availableElements,
                              clipboardElements: elementsState.clipboardElements,
                            }, selectedKeyPath);
                            const instance = menuUtils.getElementKeyPath({
                              elements: elementsState.elementInstances,
                            }, selectedKeyPath);
                            const {attributeConfigs} = element;
                            const attributeConfig = attributeConfigs[attributeName];
                            const {type, min = ATTRIBUTE_DEFAULTS.MIN, max = ATTRIBUTE_DEFAULTS.MAX, step = ATTRIBUTE_DEFAULTS.STEP, options = ATTRIBUTE_DEFAULTS.OPTIONS} = attributeConfig;
                            const newValue = menuUtils.castValueStringToValue(inputText, type, min, max, step, options);
                            if (newValue !== null) {
                              const newAttributeValue = JSON.stringify(newValue);
                              element.setAttribute(attributeName, newAttributeValue);
                              instance.setAttribute(attributeName, newAttributeValue);

                              _saveElements();
                            }

                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      } else if (match = type.match(/^(file|elementAttributeFile)s:createdirectory$/)) {
                        const target = match[1];
                        const targetState = (() => {
                          switch (target) {
                            case 'file': return filesState;
                            case 'elementAttributeFile': return elementAttributeFilesState;
                            default: return null;
                          }
                        })();

                        const applySpec = biolumi.applyStateKeyEvent(targetState, itemsFontSpec, e);

                        if (applySpec) {
                          const {commit} = applySpec;

                          if (commit) {
                            targetState.uploading = true;

                            const {files, inputText} = targetState;
                            const name = inputText;
                            if (!files.some(file => file.name === name)) {
                              const {cwd} = targetState;
                              fs.createDirectory(menuUtils.pathJoin(cwd, name))
                                .then(() => fs.getDirectory(cwd)
                                  .then(files => {
                                    targetState.files = menuUtils.cleanFiles(files);
                                    targetState.uploading = false;

                                    _updatePages();
                                  })
                                )
                                .catch(err => {
                                  console.warn(err);

                                  targetState.uploading = false;

                                  _updatePages();
                                });
                            }

                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      } else if (match = type.match(/^(file|elementAttributeFile)s:rename:(.+)$/)) {
                        const target = match[1];
                        const name = match[2];
                        const targetState = (() => {
                          switch (target) {
                            case 'file': return filesState;
                            case 'elementAttributeFile': return elementAttributeFilesState;
                            default: return null;
                          }
                        })();

                        const applySpec = biolumi.applyStateKeyEvent(targetState, itemsFontSpec, e);

                        if (applySpec) {
                          const {commit} = applySpec;
                          if (commit) {
                            const {files, inputText} = targetState;
                            const oldName = name;
                            const newName = inputText;

                            if (!files.some(file => file.name === newName && file.name !== oldName)) {
                              targetState.uploading = true;

                              const {cwd} = targetState;
                              const src = menuUtils.pathJoin(cwd, oldName);
                              const dst = menuUtils.pathJoin(cwd, newName);
                              fs.move(src, dst)
                                .then(() => fs.getDirectory(cwd)
                                  .then(files => {
                                    targetState.files = menuUtils.cleanFiles(files);
                                    targetState.selectedName = newName;
                                    targetState.uploading = false;

                                    _updatePages();
                                  })
                                )
                                .catch(err => {
                                  console.warn(err);

                                  targetState.uploading = true;

                                  _updatePages();
                                });
                            }

                            focusState.type = '';
                          }

                          _updatePages();

                          e.stopImmediatePropagation();
                        }
                      }
                    }
                  }
                };
                input.on('keydown', keydown, {
                  priority: 1,
                });
                const keyboarddown = keydown;
                input.on('keyboarddown', keyboarddown, {
                  priority: 1,
                });

                cleanups.push(() => {
                  scene.remove(menuMesh);
                  scene.remove(keyboardMesh);

                  SIDES.forEach(side => {
                    scene.remove(menuBoxMeshes[side]);
                    scene.remove(menuDotMeshes[side]);

                    scene.remove(keyboardBoxMeshes[side]);
                  });

                  /* scene.remove(positioningMesh);
                  scene.remove(oldPositioningMesh); */

                  input.removeListener('trigger', trigger);
                  input.removeListener('triggerdown', triggerdown);
                  input.removeListener('triggerup', triggerup);
                  input.removeListener('grip', grip);
                  input.removeListener('menudown', menudown);
                  input.removeListener('keydown', keydown);
                  input.removeListener('keyboarddown', keyboarddown);
                });

                const _decomposeObjectMatrixWorld = object => {
                  const position = new THREE.Vector3();
                  const rotation = new THREE.Quaternion();
                  const scale = new THREE.Vector3();
                  object.matrixWorld.decompose(position, rotation, scale);
                  return {position, rotation, scale};
                };

                const menuHoverStates = {
                  left: biolumi.makeMenuHoverState(),
                  right: biolumi.makeMenuHoverState(),
                };

                const _makeNavbarHoverState = () => ({
                  anchor: null,
                });
                const navbarHoverStates = {
                  left: _makeNavbarHoverState(),
                  right: _makeNavbarHoverState(),
                };

                const _makeKeyboardHoverState = () => ({
                  key: null,
                });
                const keyboardHoverStates = {
                  left: _makeKeyboardHoverState(),
                  right: _makeKeyboardHoverState(),
                };

                localUpdates.push(() => {
                  const _updateMeshes = () => {
                    const {animation} = menuState;

                    if (animation) {
                      const {open} = menuState;

                      const startValue = open ? 0 : 1;
                      const endValue = 1 - startValue;
                      const factor = animation.getValue();
                      const value = ((1 - factor) * startValue) + (factor * endValue);

                      if (factor < 1) {
                        if (value > 0.001) {
                          menuMesh.scale.set(1, value, 1);
                          keyboardMesh.scale.set(value, 1, 1);

                          menuMesh.visible = true;
                          keyboardMesh.visible = true;
                        } else {
                          menuMesh.visible = false;
                          keyboardMesh.visible = false;
                        }
                      } else {
                        menuMesh.scale.set(1, 1, 1);
                        keyboardMesh.scale.set(1, 1, 1);

                        if (open) {
                          menuMesh.visible = true;
                          keyboardMesh.visible = true;
                        } else {
                          menuMesh.visible = false;
                          keyboardMesh.visible = false;
                        }

                        menuState.animation = null;
                      }
                    }
                  };
                  _updateMeshes();

                  const {open} = menuState;

                  if (open) {
                    const _updateTextures = () => {
                      const {tab} = navbarState;
                      const worldTime = currentWorld.getWorldTime();

                      if (tab === 'readme') {
                        const {
                          planeMesh: {
                            menuMaterial: planeMenuMaterial,
                          },
                        } = menuMesh;

                        biolumi.updateMenuMaterial({
                          ui: menuUi,
                          menuMaterial: planeMenuMaterial,
                          worldTime,
                        });
                      }

                      const {
                        navbarMesh: {
                          menuMaterial: navbarMenuMaterial,
                        },
                      } = menuMesh;
                      biolumi.updateMenuMaterial({
                        ui: navbarUi,
                        menuMaterial: navbarMenuMaterial,
                        worldTime,
                      });

                      SIDES.forEach(side => {
                        const menuHoverState = menuHoverStates[side];

                        const {mousedownStartCoord, intersectionPoint} = menuHoverState;
                        if (mousedownStartCoord && intersectionPoint) {
                          _setLayerScrollTop(menuHoverState);
                        }
                      });
                    };
                    const _updateAnchors = () => {
                      const status = webvr.getStatus();
                      const {gamepads} = status;

                      const {planeMesh, navbarMesh} = menuMesh;
                      const menuMatrixObject = _decomposeObjectMatrixWorld(planeMesh);
                      const navbarMatrixObject = _decomposeObjectMatrixWorld(navbarMesh);

                      SIDES.forEach(side => {
                        const gamepad = gamepads[side];

                        if (gamepad) {
                          const {position: controllerPosition, rotation: controllerRotation} = gamepad;

                          const menuHoverState = menuHoverStates[side];
                          const menuDotMesh = menuDotMeshes[side];
                          const menuBoxMesh = menuBoxMeshes[side];

                          const navbarHoverState = navbarHoverStates[side];
                          const navbarBoxMesh = navbarBoxMeshes[side];

                          const keyboardHoverState = keyboardHoverStates[side];
                          const keyboardBoxMesh = keyboardBoxMeshes[side];

                          const _updateMenuAnchors = () => {
                            const {tab} = navbarState;

                            if (tab === 'readme') {
                              biolumi.updateAnchors({
                                matrixObject: menuMatrixObject,
                                ui: menuUi,
                                hoverState: menuHoverState,
                                dotMesh: menuDotMesh,
                                boxMesh: menuBoxMesh,
                                width: WIDTH,
                                height: HEIGHT,
                                worldWidth: WORLD_WIDTH,
                                worldHeight: WORLD_HEIGHT,
                                worldDepth: WORLD_DEPTH,
                                controllerPosition,
                                controllerRotation,
                              });
                            }
                          };
                          const _updateNavbarAnchors = () => {
                            const {position: navbarPosition, rotation: navbarRotation, scale: navbarScale} = navbarMatrixObject;

                            const anchorBoxTargets = (() => {
                              const result = [];
                              const layers = navbarUi.getLayers();
                              for (let i = 0; i < layers.length; i++) {
                                const layer = layers[i];
                                const anchors = layer.getAnchors();

                                for (let j = 0; j < anchors.length; j++) {
                                  const anchor = anchors[j];
                                  const {rect} = anchor;

                                  const anchorBoxTarget = geometryUtils.makeBoxTargetOffset(
                                    navbarPosition,
                                    navbarRotation,
                                    navbarScale,
                                    new THREE.Vector3(
                                      -(NAVBAR_WORLD_WIDTH / 2) + (rect.left / NAVBAR_WIDTH) * NAVBAR_WORLD_WIDTH,
                                      (NAVBAR_WORLD_HEIGHT / 2) + (-rect.top / NAVBAR_HEIGHT) * NAVBAR_WORLD_HEIGHT,
                                      -NAVBAR_WORLD_DEPTH
                                    ),
                                    new THREE.Vector3(
                                      -(NAVBAR_WORLD_WIDTH / 2) + (rect.right / NAVBAR_WIDTH) * NAVBAR_WORLD_WIDTH,
                                      (NAVBAR_WORLD_HEIGHT / 2) + (-rect.bottom / NAVBAR_HEIGHT) * NAVBAR_WORLD_HEIGHT,
                                      NAVBAR_WORLD_DEPTH
                                    )
                                  );
                                  anchorBoxTarget.anchor = anchor;

                                  result.push(anchorBoxTarget);
                                }
                              }
                              return result;
                            })();
                            const anchorBoxTarget = (() => {
                              const nearAnchorBoxTargets = anchorBoxTargets
                                .map(anchorBoxTarget => ({
                                  anchorBoxTarget,
                                  distance: anchorBoxTarget.position.distanceTo(controllerPosition),
                                }))
                                .filter(({distance}) => distance < 0.1)
                                .sort((a, b) => a.distance - b.distance)
                                .map(({anchorBoxTarget}) => anchorBoxTarget);

                              if (nearAnchorBoxTargets.length > 0) {
                                return nearAnchorBoxTargets[0];
                              } else {
                                return null;
                              }
                            })();
                            if (anchorBoxTarget) {
                              const {anchor} = anchorBoxTarget;
                              navbarHoverState.anchor = anchor;

                              navbarBoxMesh.position.copy(anchorBoxTarget.position);
                              navbarBoxMesh.quaternion.copy(anchorBoxTarget.quaternion);
                              navbarBoxMesh.scale.set(Math.max(anchorBoxTarget.size.x, 0.001), Math.max(anchorBoxTarget.size.y, 0.001), Math.max(anchorBoxTarget.size.z, 0.001));

                              if (!navbarBoxMesh.visible) {
                                navbarBoxMesh.visible = true;
                              }
                            } else {
                              navbarHoverState.anchor = null;

                              if (navbarBoxMesh.visible) {
                                navbarBoxMesh.visible = false;
                              }
                            }
                          };
                          const _updateKeyboardAnchors = () => {
                            const {planeMesh} = keyboardMesh;
                            const {position: keyboardPosition, rotation: keyboardRotation, scale: keyboardScale} = _decomposeObjectMatrixWorld(planeMesh);

                            const {keySpecs} = keyboardMesh;
                            const anchorBoxTargets = keySpecs.map(keySpec => {
                              const {key, rect} = keySpec;

                              const anchorBoxTarget = geometryUtils.makeBoxTargetOffset(
                                keyboardPosition,
                                keyboardRotation,
                                keyboardScale,
                                new THREE.Vector3(
                                  -(KEYBOARD_WORLD_WIDTH / 2) + (rect.left / KEYBOARD_WIDTH) * KEYBOARD_WORLD_WIDTH,
                                  (KEYBOARD_WORLD_HEIGHT / 2) + (-rect.top / KEYBOARD_HEIGHT) * KEYBOARD_WORLD_HEIGHT,
                                  -WORLD_DEPTH
                                ),
                                new THREE.Vector3(
                                  -(KEYBOARD_WORLD_WIDTH / 2) + (rect.right / KEYBOARD_WIDTH) * KEYBOARD_WORLD_WIDTH,
                                  (KEYBOARD_WORLD_HEIGHT / 2) + (-rect.bottom / KEYBOARD_HEIGHT) * KEYBOARD_WORLD_HEIGHT,
                                  WORLD_DEPTH
                                )
                              );
                              anchorBoxTarget.key = key;
                              return anchorBoxTarget;
                            });
                            // NOTE: there should be at most one intersecting anchor box since keys do not overlap
                            const anchorBoxTarget = anchorBoxTargets.find(anchorBoxTarget => anchorBoxTarget.containsPoint(controllerPosition));

                            const {key: oldKey} = keyboardHoverState;
                            const newKey = anchorBoxTarget ? anchorBoxTarget.key : null;
                            keyboardHoverState.key = newKey;

                            if (oldKey && newKey !== oldKey) {
                              const key = oldKey;
                              const keyCode = biolumi.getKeyCode(key);

                              input.triggerEvent('keyboardup', {
                                key,
                                keyCode,
                                side,
                              });
                            }
                            if (newKey && newKey !== oldKey) {
                              const key = newKey;
                              const keyCode = biolumi.getKeyCode(key);

                              input.triggerEvent('keyboarddown', {
                                key,
                                keyCode,
                                side,
                              });
                              input.triggerEvent('keyboardpress', {
                                key,
                                keyCode,
                                side,
                              });
                            }

                            if (anchorBoxTarget) {
                              keyboardBoxMesh.position.copy(anchorBoxTarget.position);
                              keyboardBoxMesh.quaternion.copy(anchorBoxTarget.quaternion);
                              keyboardBoxMesh.scale.copy(anchorBoxTarget.size);

                              if (!keyboardBoxMesh.visible) {
                                keyboardBoxMesh.visible = true;
                              }
                            } else {
                              if (keyboardBoxMesh.visible) {
                                keyboardBoxMesh.visible = false;
                              }
                            }
                          };

                          _updateMenuAnchors();
                          _updateNavbarAnchors();
                          _updateKeyboardAnchors();
                        }
                      });
                    };

                    _updateTextures();
                    _updateAnchors();
                  }
                });

                menu = {
                  updatePages: _updatePages,
                };
              }
            });
          }
        };
        const _initializeWorld = () => {
          const worldName = 'proteus';
          return _requestDeleteWorld(worldName)
            .then(() => {
              if (live) {
                return _requestChangeWorld(worldName);
              }
            });
        };
        const _initialize = () => _initializeMenu()
          .then(() => _initializeWorld());

        return _initialize()
          .then(() => {
            class RendApi extends EventEmitter {
              constructor() {
                super();

                this.setMaxListeners(100);
              }

              getCurrentWorld() {
                return currentWorld;
              }

              getTab() {
                const {tab} = navbarState;
                return tab;
              }

              addMenuMesh(name, object) {
                menuMesh.add(object);
                menuMesh[name] = object;
              }

              removeMenuMesh(name) {
                const object = menuMesh[name];
                menuMesh.remove(object);
                menuMesh[name] = null;
              }

              requestModElementApi(name) {
                return archae.requestPlugin(name)
                  .then(pluginInstance => {
                    const tag = archae.getName(pluginInstance);

                    return modElementApis[tag] || null;
                  });
              }

              update() {
                this.emit('update');
              }

              updateEye(camera) {
                this.emit('updateEye', camera);
              }

              updateStart() {
                this.emit('updateStart');
              }

              updateEnd() {
                this.emit('updateEnd');
              }

              registerElement(pluginInstance, elementApi) {
                const tag = archae.getName(pluginInstance);

                _addModApiElement(tag, elementApi);
              }

              unregisterElement(pluginInstance) {
                const tag = archae.getName(pluginInstance);

                _removeModApiElement(tag);
              }
            }
            api = new RendApi();
            api.on('update', () => {
              for (let i = 0; i < localUpdates.length; i++) {
                const localUpdate = localUpdates[i];
                localUpdate();
              }
            });

            return api;
          });
      }
    });
  }

  unmount() {
    this._cleanup();
  }
}

const _pad = (n, width) => {
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
};

module.exports = Rend;
