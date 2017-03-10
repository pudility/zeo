import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_DEPTH,

  TAGS_WIDTH,
  TAGS_HEIGHT,
  TAGS_ASPECT_RATIO,
  TAGS_WORLD_WIDTH,
  TAGS_WORLD_HEIGHT,
  TAGS_WORLD_DEPTH,

  SERVER_WIDTH,
  SERVER_HEIGHT,
  SERVER_WORLD_WIDTH,
  SERVER_WORLD_HEIGHT,
  SERVER_WORLD_DEPTH,

  SPHERE_RADIUS,

  DEFAULT_USER_HEIGHT,
} from './lib/constants/menu';
import menuRenderer from './lib/render/menu';

const DEFAULT_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const NUM_INVENTORY_ITEMS = 4;

const SIDES = ['left', 'right'];
const FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'];

class Hub {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;
    const {metadata: {hub: {url: hubUrl, enabled: hubEnabled}}} = archae;

    let live = true;
    this._cleanup = () => {
      live = false;
    };

    if (hubEnabled) {
      const _requestBlobDataUrl = blob => new Promise((accept, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          accept(e.target.result);
        };
        reader.readAsDataURL(blob);
     });
      const _requestLogoImg = () => fetch('/img/logo-large.png')
        .then(res => res.blob()
          .then(blob => _requestBlobDataUrl(blob))
        );
      const _requestZCakeModSpec = () => fetch('/archae/rend/mods?q=' + encodeURIComponent('/core/plugins/z-cake'))
        .then(res => res.json()
          .then(itemSpec => {
            itemSpec.isStatic = true;

            return itemSpec;
          })
        );

      return Promise.all([
        archae.requestPlugins([
          '/core/engines/bootstrap',
          '/core/engines/input',
          '/core/engines/three',
          '/core/engines/webvr',
          '/core/engines/biolumi',
          '/core/engines/cyborg',
          '/core/engines/rend',
          '/core/engines/tags',
          '/core/plugins/geometry-utils',
        ]),
        _requestLogoImg(),
        _requestZCakeModSpec(),
      ])
        .then(([
          [
            bootstrap,
            input,
            three,
            webvr,
            biolumi,
            cyborg,
            rend,
            tags,
            geometryUtils,
          ],
          logoImg,
          zCakeItemSpec,
        ]) => {
          if (live) {
            const {THREE, scene, camera} = three;

            const transparentMaterial = biolumi.getTransparentMaterial();
            const transparentImg = biolumi.getTransparentImg();

            const _decomposeObjectMatrixWorld = object => {
              const position = new THREE.Vector3();
              const rotation = new THREE.Quaternion();
              const scale = new THREE.Vector3();
              object.matrixWorld.decompose(position, rotation, scale);
              return {position, rotation, scale};
            };

            const wireframeHighlightMaterial = new THREE.MeshBasicMaterial({
              color: 0x0000FF,
              wireframe: true,
              opacity: 0.5,
              transparent: true,
            });

            const controllerMeshOffset = new THREE.Vector3(0, 0, -0.02);
            const controllerMeshQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
            const oneVector = new THREE.Vector3(1, 1, 1);
            const backVector = new THREE.Vector3(0, 0, 1);
            const sphereDiameterVector = new THREE.Vector3(SPHERE_RADIUS * 2, SPHERE_RADIUS * 2, SPHERE_RADIUS * 2);

            const menuUi = biolumi.makeUi({
              width: WIDTH,
              height: HEIGHT,
            });

            const mainFontSpec = {
              fonts: biolumi.getFonts(),
              fontSize: 40,
              lineHeight: 1.4,
              fontWeight: biolumi.getFontWeight(),
              fontStyle: biolumi.getFontStyle(),
            };
            const hubState = {
              page: 0,
              searchText: '',
              username: '',
              inputText: '',
              inputIndex: 0,
              inputValue: 0,
              loading: false,
              error: null,
            };
            const focusState = {
              type: '',
            };

            const menuMesh = (() => {
              const object = new THREE.Object3D();
              object.position.y = DEFAULT_USER_HEIGHT;

              const planeMesh = (() => {
                const mesh = menuUi.addPage(({
                  hub: {
                    page,
                    searchText,
                    inputIndex,
                    inputValue,
                    loading,
                    error,
                  },
                  focus: {
                    type: focusType,
                  },
                  logoImg,
                }) => {
                  return [
                    {
                      type: 'html',
                      src: menuRenderer.getHubSrc({
                        page,
                        searchText,
                        inputIndex,
                        inputValue,
                        loading,
                        error,
                        focusType,
                        logoImg,
                      }),
                      x: 0,
                      y: 0,
                      w: WIDTH,
                      h: HEIGHT,
                    },
                  ];
                }, {
                  type: 'hub',
                  state: {
                    hub: hubState,
                    focus: focusState,
                    logoImg: logoImg,
                  },
                  worldWidth: WORLD_WIDTH,
                  worldHeight: WORLD_HEIGHT,
                });
                mesh.position.z = -1;
                mesh.receiveShadow = true;

                return mesh;
              })();
              object.add(planeMesh);
              object.planeMesh = planeMesh;

              const scale = 2;
              const cakeTagMesh = tags.makeTag(zCakeItemSpec);
              cakeTagMesh.position.y = -0.2;
              cakeTagMesh.position.z = -1 + 0.01;
              cakeTagMesh.scale.set(scale, scale, 1);
              cakeTagMesh.initialScale = cakeTagMesh.scale.clone();
              cakeTagMesh.visible = false;
              object.add(cakeTagMesh);
              object.cakeTagMesh = cakeTagMesh;

              const shadowMesh = (() => {
                const geometry = new THREE.BoxBufferGeometry(WORLD_WIDTH, WORLD_HEIGHT, 0.01);
                const material = transparentMaterial.clone();
                material.depthWrite = false;

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                return mesh;
              })();
              object.add(shadowMesh);

              return object;
            })();
            scene.add(menuMesh);

            const menuHoverStates = {
              left: biolumi.makeMenuHoverState(),
              right: biolumi.makeMenuHoverState(),
            };

            const _makeGrabState = () => ({
              tagMesh: null,
            });
            const grabStates = {
              left: _makeGrabState(),
              right: _makeGrabState(),
            };

            const _makeGrabbableState = () => ({
              hoverMesh: null,
            });
            const grabbableStates = {
              left: _makeGrabbableState(),
              right: _makeGrabbableState(),
            };

            const _makeGrabBoxMesh = () => {
              const width = TAGS_WORLD_WIDTH;
              const height = TAGS_WORLD_HEIGHT;
              const depth = TAGS_WORLD_DEPTH;

              const geometry = new THREE.BoxBufferGeometry(width, height, depth);
              const material = wireframeHighlightMaterial;

              const mesh = new THREE.Mesh(geometry, material);
              mesh.position.y = 1.2;
              mesh.rotation.order = camera.rotation.order;
              mesh.rotation.y = Math.PI / 2;
              mesh.depthWrite = false;
              mesh.visible = false;
              return mesh;
            };
            const grabBoxMeshes = {
              left: _makeGrabBoxMesh(),
              right: _makeGrabBoxMesh(),
            };
            scene.add(grabBoxMeshes.left);
            scene.add(grabBoxMeshes.right);

            const tagHoverStates = {
              left: biolumi.makeMenuHoverState(),
              right: biolumi.makeMenuHoverState(),
            };
            const tagDotMeshes = {
              left: biolumi.makeMenuDotMesh(),
              right: biolumi.makeMenuDotMesh(),
            };
            scene.add(tagDotMeshes.left);
            scene.add(tagDotMeshes.right);
            const tagBoxMeshes = {
              left: biolumi.makeMenuBoxMesh(),
              right: biolumi.makeMenuBoxMesh(),
            };
            scene.add(tagBoxMeshes.left);
            scene.add(tagBoxMeshes.right);

            const _makeEnvHoverState = () => ({
              hoveredServerMesh: null,
            });
            const envHoverStates = {
              left: _makeEnvHoverState(),
              right: _makeEnvHoverState(),
            };

            const menuDotMeshes = {
              left: biolumi.makeMenuDotMesh(),
              right: biolumi.makeMenuDotMesh(),
            };
            scene.add(menuDotMeshes.left);
            scene.add(menuDotMeshes.right);

            const menuBoxMeshes = {
              left: biolumi.makeMenuBoxMesh(),
              right: biolumi.makeMenuBoxMesh(),
            };
            scene.add(menuBoxMeshes.left);
            scene.add(menuBoxMeshes.right);

            const envDotMeshes = {
              left: biolumi.makeMenuDotMesh(),
              right: biolumi.makeMenuDotMesh(),
            };
            scene.add(envDotMeshes.left);
            scene.add(envDotMeshes.right);

            const _makeEnvBoxMesh = () => {
              const size = SPHERE_RADIUS * 2;

              const mesh = biolumi.makeMenuBoxMesh();
              const {geometry} = mesh;
              geometry.applyMatrix(new THREE.Matrix4().makeScale(size, size, size));
              return mesh;
            };
            const envBoxMeshes = {
              left: _makeEnvBoxMesh(),
              right: _makeEnvBoxMesh(),
            };
            scene.add(envBoxMeshes.left);
            scene.add(envBoxMeshes.right);

            const _getServerMeshes = servers => {
              const result = Array(servers.length);

              const _makeServerEnvMesh = server => {
                const _requestImageFile = p => new Promise((accept, reject) => {
                  const img = new Image();
                  img.src = 'https://' + hubUrl + p;
                  img.onload = () => {
                    accept(img);
                  };
                  img.onerror = err => {
                    reject(err);
                  };
                });
                const _requestCubeMapImgs = server => Promise.all(FACES.map(face => _requestImageFile('/servers/img/cubemap/' + encodeURIComponent(server.url) + '/'+ face + '.png')))
                  .then(cubeMapImgs => {
                    const result = {};
                    for (let i = 0; i < cubeMapImgs.length; i++) {
                      const cubeMapImg = cubeMapImgs[i];
                      const face = FACES[i];
                      result[face] = cubeMapImg;
                    }
                    return result;
                  });

                const mesh = (() => {
                  const geometry = new THREE.SphereBufferGeometry(SPHERE_RADIUS, 15, 8);
                  const material = (() => {
                    const texture = new THREE.CubeTexture(
                      [
                        transparentImg,
                        transparentImg,
                        transparentImg,
                        transparentImg,
                        transparentImg,
                        transparentImg,
                      ],
                      THREE.UVMapping,
                      THREE.ClampToEdgeWrapping,
                      THREE.ClampToEdgeWrapping,
                      THREE.NearestFilter,
                      THREE.NearestFilter,
                      THREE.RGBAFormat,
                      THREE.UnsignedByteType,
                      1
                    );
                    texture.needsUpdate = true;

                    const material = new THREE.MeshLambertMaterial({
                      envMap: texture,
                      // shininess: 10,
                    });
                    return material;
                  })();

                  const mesh = new THREE.Mesh(geometry, material);
                  mesh.castShadow = true;

                  return mesh;
                })();

                _requestCubeMapImgs(server) // load the actual cube map asynchronously
                  .then(faceImgs => {
                    const images = [
                      'right',
                      'left',
                      'top',
                      'bottom',
                      'front',
                      'back',
                    ].map(face => faceImgs[face]);

                    const {material: {envMap: texture}} = mesh;
                    texture.images = images;
                    texture.needsUpdate = true;
                  })
                  .catch(err => {
                    console.warn(err);
                  });

                setTimeout(() => {
                  const {position: envMeshPosition, rotation: envMeshRotation, scale: envMeshScale} = _decomposeObjectMatrixWorld(mesh); // the mesh is in the scene at this point
                  const boxTarget = geometryUtils.makeBoxTarget(envMeshPosition, envMeshRotation, envMeshScale, sphereDiameterVector);
                  mesh.boxTarget = boxTarget;
                });

                return mesh;
              };
              const _makeServerMenuMesh = server => {
                const object = new THREE.Object3D();

                const _requestServerIcon = server => fetch('https://' + hubUrl + '/servers/img/icon/' + encodeURIComponent(server.url))
                  .then(res => res.blob()
                    .then(blob => _requestBlobDataUrl(blob))
                  );
                _requestServerIcon(server)
                   .then(serverIcon => {
                      const planeMesh = (() => {
                        const serverUi = biolumi.makeUi({
                          width: SERVER_WIDTH,
                          height: SERVER_HEIGHT,
                        });

                        const mesh = serverUi.addPage(({
                          server: {
                            worldname,
                            description,
                          },
                          serverIcon,
                        }) => {
                          return [
                            {
                              type: 'html',
                              src: menuRenderer.getServerSrc({
                                worldname,
                                description,
                                serverIcon,
                              }),
                              x: 0,
                              y: 0,
                              w: SERVER_WIDTH,
                              h: SERVER_HEIGHT,
                            },
                          ];
                        }, {
                          type: 'hub',
                          state: {
                            server: {
                              worldname: server.worldname,
                              description: server.url,
                            },
                            serverIcon,
                          },
                          worldWidth: SERVER_WORLD_WIDTH,
                          worldHeight: SERVER_WORLD_HEIGHT,
                        });
                        mesh.position.y = 0.45;
                        mesh.receiveShadow = true;
                        mesh.ui = serverUi;

                        serverUi.update();

                        return mesh;
                      })();
                      object.add(planeMesh);
                      object.planeMesh = planeMesh;
                    })
                    .catch(err => {
                      console.warn(err);
                    });

                const shadowMesh = (() => {
                  const geometry = new THREE.BoxBufferGeometry(SERVER_WORLD_WIDTH, SERVER_WORLD_HEIGHT, 0.01);
                  const material = transparentMaterial.clone();
                  material.depthWrite = false;

                  const mesh = new THREE.Mesh(geometry, material);
                  mesh.castShadow = true;
                  return mesh;
                })();
                object.add(shadowMesh);

                return object;
              };

              for (let i = 0; i < servers.length; i++) {
                const server = servers[i];

                const mesh = (() => {
                  const object = new THREE.Object3D();
                  object.position.x = -2 + (i * 1);
                  object.position.y = 1.2;
                  object.server = server;

                  const envMesh = _makeServerEnvMesh(server, i);
                  object.add(envMesh);
                  object.envMesh = envMesh;

                  const menuMesh = _makeServerMenuMesh(server);
                  object.add(menuMesh);
                  object.menuMesh = menuMesh;

                  return object;
                })();
                result[i] = mesh;
              }

              return result;
            };
            const serversMesh = (() => {
              const object = new THREE.Object3D();

              const servers = bootstrap.getServers();
              const serverMeshes = _getServerMeshes(servers);
              for (let i = 0; i < serverMeshes.length; i++) {
                const serverMesh = serverMeshes[i];
                object.add(serverMesh);
              }
              object.serverMeshes = serverMeshes;

              return object;
            })();
            scene.add(serversMesh);
            serversMesh.updateMatrixWorld();

            const _updatePages = () => {
              menuUi.update();
            };
            _updatePages();

            const _addTag = (side, srcTagMesh) => {
              const itemSpec = _clone(srcTagMesh.item);
              itemSpec.id = _makeId();
              const tagMesh = tags.makeTag(itemSpec);

              const grabState = grabStates[side];
              grabState.tagMesh = tagMesh;

              const controllers = cyborg.getControllers();
              const controller = controllers[side];
              const {mesh: controllerMesh} = controller;
              tagMesh.position.copy(controllerMeshOffset);
              tagMesh.quaternion.copy(controllerMeshQuaternion);
              tagMesh.scale.copy(oneVector);
              controllerMesh.add(tagMesh);
            };

            const _trigger = e => {
              const {side} = e;

              const _doMenuMeshClick = () => {
                const menuHoverState = menuHoverStates[side];
                const {anchor} = menuHoverState;
                const onclick = (anchor && anchor.onclick) || '';

                const _setPage = page => {
                  hubState.page = page;;

                  _updatePages();

                  const {cakeTagMesh} = menuMesh;
                  cakeTagMesh.visible = page === 1;
                };

                if (onclick === 'hub:next') {
                  const {page} = hubState;
                  _setPage(page + 1);

                  return true;
                } else if (onclick === 'hub:back') {
                  const {page} = hubState;
                  _setPage(page - 1);

                  return true;
                } else if (onclick === 'hub:tutorial') {
                  const {page} = hubState;
                  _setPage(0);

                  return true;
                } else if (onclick === 'hub:apiDocs') {
                  document.location.href = 'https://zeovr.io/docs';

                  return true; // can't happen
                } else {
                  return false;
                }
              };
              const _doTagMeshClick = () => {
                const {side} = e;
                const {gamepads} = webvr.getStatus();
                const gamepad = gamepads[side];

                if (gamepad) {
                  const {buttons: {grip: {pressed: gripPressed}}} = gamepad;

                  if (gripPressed) {
                    const tagHoverState = tagHoverStates[side];
                    const {intersectionPoint} = tagHoverState;
                    const grabState = grabStates[side];
                    const {tagMesh: grabMesh} = grabState;

                    if (intersectionPoint && !grabMesh) {
                      const {metadata: pointMesh} = tagHoverState;

                      _addTag(side, pointMesh);

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
              const _doServerMeshClick = () => {
                const envHoverState = envHoverStates[side];
                const {hoveredServerMesh} = envHoverState;

                if (hoveredServerMesh) {
                  const {server} = hoveredServerMesh;

                  const {url} = server;
                  const t = _getQueryVariable(window.location.href, 't');
                  document.location = 'https://' + server.url + (t ? ('?t=' + encodeURIComponent(t)) : '');

                  // can't happen
                  e.stopImmediatePropagation();

                  return true;
                } else {
                  return false;
                }
              };

              _doMenuMeshClick() || _doTagMeshClick() ||  _doServerMeshClick();
            };
            input.on('trigger', _trigger, {
              priority: 1,
            });
            const _gripdown = e => {
              const {side} = e;
              const grabbableState = grabbableStates[side];
              const {hoverMesh} = grabbableState;

              if (hoverMesh) {
                _addTag(side, hoverMesh);

                e.stopImmediatePropagation();
              }
            };
            input.on('gripdown', _gripdown, {
              priority: 1,
            });
            const _gripup = e => {
              const {side} = e;
              const grabState = grabStates[side];
              const {tagMesh} = grabState;

              if (tagMesh) {
                const {position, rotation, scale} = _decomposeObjectMatrixWorld(tagMesh);
                scene.add(tagMesh);
                tagMesh.position.copy(position);
                tagMesh.quaternion.copy(rotation);
                tagMesh.scale.copy(scale);

                const {item} = tagMesh;
                const {attributes} = item;
                if (attributes.position) {
                  const matrixArray = position.toArray().concat(rotation.toArray()).concat(scale.toArray());
                  item.setAttribute('position', matrixArray);
                }

                tags.reifyTag(tagMesh);

                e.stopImmediatePropagation();
              }
            };
            input.on('gripup', _gripup, {
              priority: 1,
            });
            const _update = () => {
              const _updateMenuAnchors = () => {
                const {gamepads} = webvr.getStatus();

                const {planeMesh} = menuMesh;
                const menuMatrixObject = _decomposeObjectMatrixWorld(planeMesh);
                const {page} = planeMesh;

                SIDES.forEach(side => {
                  const gamepad = gamepads[side];

                  if (gamepad) {
                    const {position: controllerPosition, rotation: controllerRotation} = gamepad;

                    const menuHoverState = menuHoverStates[side];
                    const menuDotMesh = menuDotMeshes[side];
                    const menuBoxMesh = menuBoxMeshes[side];

                    biolumi.updateAnchors({
                      objects: [{
                        matrixObject: menuMatrixObject,
                        page: page,
                        width: WIDTH,
                        height: HEIGHT,
                        worldWidth: WORLD_WIDTH,
                        worldHeight: WORLD_HEIGHT,
                        worldDepth: WORLD_DEPTH,
                      }],
                      hoverState: menuHoverState,
                      dotMesh: menuDotMesh,
                      boxMesh: menuBoxMesh,
                      controllerPosition,
                      controllerRotation,
                    });
                  }
                });
              };
              const _updateTagGrabAnchors = () => {
                const {cakeTagMesh} = menuMesh;
                const {visible} = menuMesh;

                if (visible) {
                  const _getHoverGrabbable = (side) => {
                    const grabState = grabStates[side];
                    const {tagMesh: grabMesh} = grabState;

                    if (!grabMesh) {
                      const {gamepads} = webvr.getStatus();
                      const gamepad = gamepads[side];

                      if (gamepad) {
                        const {position: controllerPosition} = gamepad;
                        const {position: cakeTagMeshPosition} = _decomposeObjectMatrixWorld(cakeTagMesh);

                        if (controllerPosition.distanceTo(cakeTagMeshPosition) <= 0.2) {
                          return cakeTagMesh;
                        } else {
                          return null;
                        }
                      } else {
                        return null;
                      }
                    } else {
                      return null;
                    }
                  };

                  SIDES.forEach(side => {
                    const grabbableState = grabbableStates[side];
                    const grabBoxMesh = grabBoxMeshes[side];

                    const hoverMesh = _getHoverGrabbable(side);

                    grabbableState.hoverMesh = hoverMesh;

                    if (hoverMesh) {
                      const {position: tagMeshPosition, rotation: tagMeshRotation, scale: tagMeshScale} = _decomposeObjectMatrixWorld(hoverMesh);
                      grabBoxMesh.position.copy(tagMeshPosition);
                      grabBoxMesh.quaternion.copy(tagMeshRotation);
                      grabBoxMesh.scale.copy(tagMeshScale);

                      if (!grabBoxMesh.visible) {
                        grabBoxMesh.visible = true;
                      }
                    } else {
                      grabbableState.hoverMesh = null;

                      if (grabBoxMesh.visible) {
                        grabBoxMesh.visible = false;
                      }
                    }
                  });
                } else {
                  SIDES.forEach(side => {
                    const grabbableState = grabbableStates[side];
                    const grabBoxMesh = grabBoxMeshes[side];

                    grabbableState.hoverMesh = null;

                    if (grabBoxMesh.visible) {
                      grabBoxMesh.visible = false;
                    }
                  });
                }
              };
              const _updateTagPointerAnchors = () => {
                const {gamepads} = webvr.getStatus();
                const {cakeTagMesh} = menuMesh;

                SIDES.forEach(side => {
                  const gamepad = gamepads[side];

                  if (gamepad) {
                    const {position: controllerPosition, rotation: controllerRotation} = gamepad;
                    const tagHoverState = tagHoverStates[side];
                    const tagDotMesh = tagDotMeshes[side];
                    const tagBoxMesh = tagBoxMeshes[side];

                    const {planeMesh, initialScale} = cakeTagMesh;
                    const matrixObject = _decomposeObjectMatrixWorld(planeMesh);
                    const {page} = planeMesh;

                    biolumi.updateAnchors({
                      objects: [{
                        matrixObject: matrixObject,
                        page: page,
                        width: TAGS_WIDTH,
                        height: TAGS_HEIGHT,
                        worldWidth: TAGS_WORLD_WIDTH * initialScale.x,
                        worldHeight: TAGS_WORLD_HEIGHT * initialScale.y,
                        worldDepth: TAGS_WORLD_DEPTH * initialScale.z,
                        metadata: cakeTagMesh,
                      }],
                      hoverState: tagHoverState,
                      dotMesh: tagDotMesh,
                      boxMesh: tagBoxMesh,
                      controllerPosition,
                      controllerRotation,
                    });
                  }
                });
              };
              const _updateEnvAnchors = () => {
                const {gamepads} = webvr.getStatus();
                const {serverMeshes} = serversMesh;

                SIDES.forEach(side => {
                  const gamepad = gamepads[side];
                  const envHoverState = envHoverStates[side];
                  const envDotMesh = envDotMeshes[side];
                  const envBoxMesh = envBoxMeshes[side];

                  if (gamepad) {
                    const {position: controllerPosition, rotation: controllerRotation} = gamepad;
                    const controllerLine = geometryUtils.makeControllerLine(controllerPosition, controllerRotation);

                    const intersectionSpecs = serverMeshes.map(serverMesh => {
                      const {envMesh} = serverMesh;
                      const {boxTarget} = envMesh;

                      if (boxTarget) { // we add the box target asynchronously on next tick
                        const intersectionPoint = boxTarget.intersectLine(controllerLine);

                        if (intersectionPoint) {
                          const distance = intersectionPoint.distanceTo(controllerPosition);

                          return {
                            intersectionPoint,
                            distance,
                            serverMesh,
                          };
                        } else {
                          return null;
                        }
                      } else {
                        return null;
                      }
                    }).filter(intersectionSpec => intersectionSpec !== null);

                    if (intersectionSpecs.length > 0) {
                      const intersectionSpec = intersectionSpecs.sort((a, b) => a.distance - b.distance)[0];
                      const {intersectionPoint, serverMesh} = intersectionSpec;
                      const {envMesh} = serverMesh;
                      const {position: envMeshPosition, rotation: envMeshRotation, scale: envMeshScale} = _decomposeObjectMatrixWorld(envMesh);

                      envDotMesh.position.copy(intersectionPoint);
                      envBoxMesh.position.copy(envMeshPosition);
                      envBoxMesh.quaternion.copy(envMeshRotation);
                      envBoxMesh.scale.copy(envMeshScale);

                      envHoverState.hoveredServerMesh = serverMesh;
                      envDotMesh.visible = true;
                      envBoxMesh.visible = true;
                    } else {
                      envHoverState.hoveredServerMesh = null;
                      envDotMesh.visible = false;
                      envBoxMesh.visible = false;
                    }
                  } else {
                    envHoverState.hoveredServerMesh = null;
                    envDotMesh.visible = false;
                    envBoxMesh.visible = false;
                  }
                });
              };
              const _updateServerMeshes = () => {
                const {hmd} = webvr.getStatus();
                const {serverMeshes} = serversMesh;

                for (let i = 0; i < serverMeshes.length; i++) {
                  const serverMesh = serverMeshes[i];
                  const {menuMesh} = serverMesh;
                  const {position: menuMeshPosition} = _decomposeObjectMatrixWorld(menuMesh);
                  const serverMeshNormal = hmd.position.clone().sub(menuMeshPosition);
                  serverMeshNormal.y = 0;
                  serverMeshNormal.normalize();
                  menuMesh.quaternion.setFromUnitVectors(
                    backVector,
                    serverMeshNormal
                  );
                }
              };

              _updateMenuAnchors();
              _updateTagGrabAnchors();
              _updateTagPointerAnchors();
              _updateEnvAnchors();
              _updateServerMeshes();
            };
            rend.on('update', _update);

            this._cleanup = () => {
              scene.remove(menuMesh);
              SIDES.forEach(side => {
                scene.remove(menuDotMeshes[side]);
                scene.remove(menuBoxMeshes[side]);

                scene.remove(grabBoxMeshes[side]);
                scene.remove(tagDotMeshes[side]);
                scene.remove(tagBoxMeshes[side]);

                scene.remove(envDotMeshes[side]);
                scene.remove(envBoxMeshes[side]);
              });
              serverMeshes.forEach(serverMesh => {
                scene.remove(serverMesh);
              });

              input.removeListener('trigger', _trigger);
              input.removeListener('gripdown', _gripdown);
              input.removeListener('gripup', _gripup);
              rend.removeListener('update', _update);
            };
          }
        });
    }
  }

  unmount() {
    this._cleanup();
  }
}

const _clone = o => JSON.parse(JSON.stringify(o));
const _makeId = () => Math.random().toString(36).substring(7);
const _getQueryVariable = (url, variable) => {
  const match = url.match(/\?(.+)$/);
  const query = match ? match[1] : '';
  const vars = query.split('&');

  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split('=');

    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
};

module.exports = Hub;
