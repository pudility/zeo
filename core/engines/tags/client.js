import MultiMutex from 'multimutex';

import {
  WIDTH,
  HEIGHT,
  OPEN_WIDTH,
  OPEN_HEIGHT,

  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_DEPTH,
  WORLD_OPEN_WIDTH,
  WORLD_OPEN_HEIGHT,
} from './lib/constants/tags';
import tagsRender from './lib/render/tags';
import menuUtils from './lib/utils/menu';
import OBJLoader from './lib/three-extra/OBJLoader';

const SIDES = ['left', 'right'];

const tagFlagSymbol = Symbol();
const itemInstanceSymbol = Symbol();
const itemInstancingSymbol = Symbol();
const itemOpenSymbol = Symbol();
const itemPausedSymbol = Symbol();
const itemValueSymbol = Symbol();
const itemPreviewSymbol = Symbol();
const itemMutexSymbol = Symbol();
const ITEM_LOCK_KEY = 'key';

class Tags {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;
    const {metadata: {hub: {enabled: hubEnabled}}} = archae;

    let live = true;
    this._cleanup = () => {
      live = false;
    };

    return archae.requestPlugins([
      '/core/engines/three',
      '/core/engines/input',
      '/core/engines/webvr',
      '/core/engines/cyborg',
      '/core/engines/biolumi',
      '/core/engines/somnifer',
      '/core/engines/rend',
      '/core/plugins/js-utils',
      '/core/plugins/image-utils',
      '/core/plugins/creature-utils',
    ])
      .then(([
        three,
        input,
        webvr,
        cyborg,
        biolumi,
        somnifer,
        rend,
        jsUtils,
        imageUtils,
        creatureUtils,
      ]) => {
        if (live) {
          const {THREE, scene, camera} = three;
          const {events} = jsUtils;
          const {EventEmitter} = events;

          const transparentImg = biolumi.getTransparentImg();
          const {sound} = somnifer;

          const tagsRenderer = tagsRender.makeRenderer({creatureUtils});

          const THREEOBJLoader = OBJLoader(THREE);

          const _decomposeObjectMatrixWorld = object => _decomposeMatrix(object.matrixWorld);
          const _decomposeMatrix = matrix => {
            const position = new THREE.Vector3();
            const rotation = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            matrix.decompose(position, rotation, scale);
            return {position, rotation, scale};
          };

          const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000FF,
            wireframe: true,
            opacity: 0.5,
            transparent: true,
          });
          const subcontentFontSpec = {
            fonts: biolumi.getFonts(),
            fontSize: 20,
            lineHeight: 1.4,
            fontWeight: biolumi.getFontWeight(),
            fontStyle: biolumi.getFontStyle(),
          };

          const rootModulesElement = document.createElement('div');
          rootModulesElement.id = 'zeo-modules';
          document.body.appendChild(rootModulesElement);
          const rootModulesObserver = new MutationObserver(mutations => {
            for (let i = 0; i < mutations.length; i++) {
              const mutation = mutations[i];
              const {type} = mutation;

              if (type === 'childList') {
                const {addedNodes} = mutation;
                for (let j = 0; j < addedNodes.length; j++) {
                  const addedNode = addedNodes[j];
                  const moduleElement = addedNode;
                  const {item: moduleItem} = moduleElement;
                  const {displayName} = moduleItem;
                  const componentApi = componentApis[displayName];
                  const {attributes: componentAttributes} = componentApi;

                  const boundEntitySpecs = _getBoundEntitySpecs(componentAttributes);
                  for (let i = 0; i < boundEntitySpecs.length; i++) {
                    const boundEntitySpec = boundEntitySpecs[i];
                    const {tagMesh, matchingAttributes} = boundEntitySpec;
                    const {item: entityItem} = tagMesh;
                    const {instance: entityElement} = entityItem;

                    moduleElement.entityAddedCallback(entityElement);

                    for (let j = 0; j < matchingAttributes.length; j++) {
                      const matchingAttribute = matchingAttributes[j];
                      const {attributes: entityAttributes} = entityItem;
                      const attributeValue = entityAttributes[matchingAttribute];

                      moduleElement.entityAttributeValueChangedCallback(entityElement, matchingAttribute, null, attributeValue);
                    }
                  }
                }

                const {removedNodes} = mutation;
                for (let k = 0; k < removedNodes.length; k++) {
                  const removedNode = removedNodes[k];
                  const moduleElement = removedNode;
                  const {item: moduleItem} = moduleElement;
                  const {displayName} = moduleItem;
                  const componentApi = componentApis[displayName];
                  const {attributes: componentAttributes} = componentApi;

                  const boundEntitySpecs = _getBoundEntitySpecs(componentAttributes);
                  for (let i = 0; i < boundEntitySpecs.length; i++) {
                    const boundEntitySpec = boundEntitySpecs[i];
                    const {tagMesh, matchingAttributes} = boundEntitySpec;
                    const {item: entityItem} = tagMesh;
                    const {instance: entityElement} = entityItem;

                    moduleElement.entityRemovedCallback(entityElement);
                  }
                }
              // } else if (type === 'attributes') {
              }
            }
          });
          rootModulesObserver.observe(rootModulesElement, {
            childList: true,
            // attributes: true,
            subtree: true,
            // attributeOldValue: true,
          });

          const rootEntitiesElement = document.createElement('div');
          rootEntitiesElement.id = 'zeo-entities';
          document.body.appendChild(rootEntitiesElement);
          const rootEntitiesObserver = new MutationObserver(mutations => {
            for (let i = 0; i < mutations.length; i++) {
              const mutation = mutations[i];
              const {type} = mutation;

              if (type === 'childList') {
                const {addedNodes} = mutation;
                for (let j = 0; j < addedNodes.length; j++) {
                  const addedNode = addedNodes[j];
                  const entityElement = addedNode;
                  const {item: entityItem} = entityElement;
                  const {attributes: entityAttributes} = entityItem;

                  const boundComponentSpecs = _getBoundComponentSpecs(entityAttributes);
                  for (let k = 0; k < boundComponentSpecs.length; k++) {
                    const boundComponentSpec = boundComponentSpecs[k];
                    const {tag, matchingAttributes} = boundComponentSpec;

                    const componentApiInstance = componentApiInstances[tag];
                    componentApiInstance.entityAddedCallback(entityElement);

                    for (let l = 0; l < matchingAttributes.length; l++) {
                      const matchingAttribute = matchingAttributes[l];
                      const attributeValue = entityAttributes[matchingAttribute];
                      componentApiInstance.entityAttributeValueChangedCallback(entityElement, matchingAttribute, null, attributeValue);
                    }
                  }
                }

                const {removedNodes} = mutation;
                for (let k = 0; k < removedNodes.length; k++) {
                  const removedNode = removedNodes[k];
                  const entityElement = removedNode;
                  const {item: entityItem} = entityElement;
                  const {attributes: entityAttributes} = entityItem;

                  const boundComponentSpecs = _getBoundComponentSpecs(entityAttributes);
                  for (let l = 0; l < boundComponentSpecs.length; l++) {
                    const boundComponentSpec = boundComponentSpecs[l];
                    const {tag} = boundComponentSpec;
                    const componentApiInstance = componentApiInstances[tag];

                    componentApiInstance.entityRemovedCallback(entityElement);
                  }
                }
              } else if (type === 'attributes') {
                const {target: entityElement, attributeName, oldValue: oldValueString} = mutation;
                const newValueString = entityElement.getAttribute(attributeName);

                const boundComponentSpecs = _getBoundComponentSpecs({
                  [attributeName]: newValueString,
                });
                for (let i = 0; i < boundComponentSpecs.length; i++) {
                  const boundComponentSpec = boundComponentSpecs[i];
                  const {tag, matchingAttributes} = boundComponentSpec;
                  const componentApiInstance = componentApiInstances[tag];

                  for (let j = 0; j < matchingAttributes.length; j++) {
                    const attributeName = matchingAttributes[j];
                    const oldValue = JSON.parse(oldValueString);
                    const newValue = JSON.parse(newValueString);

                    componentApiInstance.entityAttributeValueChangedCallback(entityElement, attributeName, oldValue, newValue);
                  }
                }
              }
            }
          });
          rootEntitiesObserver.observe(rootEntitiesElement, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeOldValue: true,
          });

          class UiManager {
            constructor({width, height, color, metadata}) {
              this.width = width;
              this.height = height;
              this.color = color;
              this.metadata = metadata;

              this.uis = [];
            }

            addPage(pageSpec, options) {
              const {width, height, color, uis} = this;

              const ui = biolumi.makeUi({
                width: width,
                height: height,
                color,
              });
              uis.push(ui);

              return ui.addPage(pageSpec, options);
            }

            update() {
              const {uis} = this;

              for (let i = 0; i < uis.length; i++) {
                const ui = uis[i];
                ui.update();
              }
            }
          }
          const uiManager = new UiManager({
            width: WIDTH,
            height: HEIGHT,
            color: [1, 1, 1, 0],
            metadata: {
              open: false,
            },
          });
          const uiOpenManager = new UiManager({
            width: OPEN_WIDTH,
            height: OPEN_HEIGHT,
            color: [1, 1, 1, 0],
            metadata: {
              open: true,
            },
          });
          const uiStaticManager = new UiManager({
            width: WIDTH,
            height: HEIGHT,
            color: [1, 1, 1, 1],
            metadata: {
              open: false,
            },
          });

          const hoverStates = {
            left: biolumi.makeMenuHoverState(),
            right: biolumi.makeMenuHoverState(),
          };
          const dotMeshes = {
            left: biolumi.makeMenuDotMesh(),
            right: biolumi.makeMenuDotMesh(),
          };
          scene.add(dotMeshes.left);
          scene.add(dotMeshes.right);
          const boxMeshes = {
            left: biolumi.makeMenuBoxMesh(),
            right: biolumi.makeMenuBoxMesh(),
          };
          scene.add(boxMeshes.left);
          scene.add(boxMeshes.right);

          const _makeGrabBoxMesh = () => {
            const width = WORLD_WIDTH;
            const height = WORLD_HEIGHT;
            const depth = WORLD_DEPTH;

            const geometry = new THREE.BoxBufferGeometry(width, height, depth);
            const material = wireframeMaterial;

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

          const _makePositioningMesh = ({opacity = 1} = {}) => {
            const geometry = (() => {
              const result = new THREE.BufferGeometry();
              const positions = Float32Array.from([
                0, 0, 0,
                0.1, 0, 0,
                0, 0, 0,
                0, 0.1, 0,
                0, 0, 0,
                0, 0, 0.1,
              ]);
              result.addAttribute('position', new THREE.BufferAttribute(positions, 3));
              const colors = Float32Array.from([
                1, 0, 0,
                1, 0, 0,
                0, 1, 0,
                0, 1, 0,
                0, 0, 1,
                0, 0, 1,
              ]);
              result.addAttribute('color', new THREE.BufferAttribute(colors, 3));
              return result;
            })();
            const material = new THREE.LineBasicMaterial({
              // color: 0xFFFFFF,
              // color: 0x333333,
              vertexColors: THREE.VertexColors,
              opacity: opacity,
            });

            const mesh = new THREE.LineSegments(geometry, material);
            mesh.visible = false;
            return mesh;
          };
          const positioningMesh = _makePositioningMesh();
          scene.add(positioningMesh);
          const oldPositioningMesh = _makePositioningMesh({
            opacity: 0.5,
          });
          scene.add(oldPositioningMesh);

          const detailsState = {
            inputText: '',
            inputPlaceholder: 'Search npm',
            inputIndex: 0,
            inputValue: 0,
            positioningId: null,
            positioningName: null,
            positioningSide: null,
          };
          const focusState = {
            type: '',
          };

          const localUpdates = [];

          const _getItemPreviewMode = item => {
            const {mimeType} = item;

            if (mimeType && /^image\/(?:png|jpeg|gif|file)$/.test(mimeType)) {
              return 'image';
            } else if (/^audio\/(?:wav|mp3|mpeg|ogg|vorbis|webm|x-flac)$/.test(mimeType)) {
              return 'audio';
            } else if (/^video\/(?:mp4|webm|ogg)$/.test(mimeType)) {
              return 'video';
            } else if (/^mime\/(?:obj)$/.test(mimeType)) {
              return 'model';
            } else {
              return null;
            }
          };
          const _requestFileItemImageMesh = tagMesh => new Promise((accept, reject) => {
            const {item} = tagMesh;

            const geometry = new THREE.PlaneBufferGeometry(0.2, 0.2);
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

              const img = new Image();
              img.src = '/archae/fs/' + item.id;
              img.onload = () => {
                const boxImg = imageUtils.boxizeImage(img);

                texture.image = boxImg;
                texture.needsUpdate = true;
              };
              img.onerror = err => {
                console.warn(err);
              };

              const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false,
              });
              return material;
            })();

            const mesh = new THREE.Mesh(geometry, material);
            accept(mesh);
          });
          const _requestFileItemAudioMesh = tagMesh => new Promise((accept, reject) => {
            const {item} = tagMesh;

            const mesh = new THREE.Object3D();

            const audio = document.createElement('audio');
            audio.src = '/archae/fs/' + item.id;
            audio.oncanplay = () => {
              soundBody.setInputElement(audio);

              audio.currentTime = item.value * audio.duration;

              if (!item.paused) {
                audio.play();
              }

              localUpdates.push(localUpdate);

              audio.oncanplay = null;
            };
            audio.onerror = err => {
              console.warn(err);
            };
            mesh.audio = audio;

            const soundBody = new sound.Body();
            soundBody.setObject(mesh);

            const localUpdate = () => {
              const {value: prevValue} = item;
              const nextValue = audio.currentTime / audio.duration;
              if (Math.abs(nextValue - prevValue) >= (1 / 1000)) { // to reduce the frequency of texture updates
                item.value = nextValue;

                const {page} = tagMesh;
                page.update();
              }
            };

            mesh.destroy = () => {
              if (!audio.paused) {
                audio.pause();
              }

              const index = localUpdates.indexOf(localUpdate);
              if (index !== -1) {
                localUpdates.splice(index, 1);
              }
            };

            accept(mesh);
          });
          const _requestFileItemVideoMesh = tagMesh => new Promise((accept, reject) => {
            const {item} = tagMesh;

            const geometry = new THREE.PlaneBufferGeometry(WORLD_OPEN_WIDTH, (OPEN_HEIGHT - HEIGHT - 100) / OPEN_HEIGHT * WORLD_OPEN_HEIGHT);
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

              const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false,
              });
              return material;
            })();
            const mesh = new THREE.Mesh(geometry, material);

            const video = document.createElement('video');
            video.src = '/archae/fs/' + item.id;
            video.width = OPEN_WIDTH;
            video.height = (OPEN_HEIGHT - HEIGHT) - 100;
            video.oncanplay = () => {
              const {map: texture} = material;

              texture.image = video;
              texture.needsUpdate = true;

              soundBody.setInputElement(video);

              video.currentTime = item.value * video.duration;

              if (!item.paused) {
                video.play();
              }

              localUpdates.push(localUpdate);

              video.oncanplay = null;
            };
            video.onerror = err => {
              console.warn(err);
            };

            const soundBody = new sound.Body();
            soundBody.setObject(mesh);

            const localUpdate = () => {
              const {map: texture} = material;
              const {image: video} = texture;

              const {value: prevValue} = item;
              const nextValue = video.currentTime / video.duration;
              if (Math.abs(nextValue - prevValue) >= (1 / 1000)) { // to reduce the frequency of texture updates
                item.value = nextValue;

                const {planeOpenMesh: {page: openPage}} = tagMesh;
                openPage.update();
              }

              texture.needsUpdate = true;
            };

            mesh.destroy = () => {
              if (!video.paused) {
                video.pause();
              }

              const index = localUpdates.indexOf(localUpdate);
              if (index !== -1) {
                localUpdates.splice(index, 1);
              }
            };

            accept(mesh);
          });
          const _requestFileItemModelMesh = tagMesh => fetch('/archae/fs/' + tagMesh.item.id)
            .then(res => res.text()
              .then(modelText => new Promise((accept, reject) => {
                const loader = new THREEOBJLoader();

                // XXX this texture path needs to actually be fetchable from /archae/fs/ by path, since that's what the model will be referencing
                loader.setPath('/archae/fs/');
                const modelMesh = loader.parse(modelText);
                accept(modelMesh);
              }))
            );

          const _trigger = e => {
            const {side} = e;

            const _doClickOpen = () => {
              const hoverState = hoverStates[side];
              const {intersectionPoint} = hoverState;

              if (intersectionPoint) {
                const {anchor} = hoverState;
                const onclick = (anchor && anchor.onclick) || '';

                let match;
                if (match = onclick.match(/^tag:open:(.+)$/)) {
                  const id = match[1];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);

                  const {planeMesh, planeOpenMesh, item} = tagMesh;
                  item.open = true;
                  planeMesh.visible = false;
                  planeOpenMesh.visible = true;

                  if (item.type === 'file') {
                    if (!item.preview) {
                      const previewMesh = (() => {
                        const object = new THREE.Object3D();

                        const mode = _getItemPreviewMode(item);
                        if (mode === 'image') {
                          _requestFileItemImageMesh(tagMesh)
                            .then(imageMesh => {
                              imageMesh.position.y = -(WORLD_HEIGHT / 2) - ((WORLD_OPEN_HEIGHT - WORLD_HEIGHT) / 2);

                              object.add(imageMesh);
                            })
                            .catch(err => {
                              console.warn(err);
                            });
                        } else if (mode === 'audio') {
                          _requestFileItemAudioMesh(tagMesh)
                            .then(audioMesh => {
                              object.add(audioMesh);
                            })
                            .catch(err => {
                              console.warn(err);
                            });
                        } else if (mode === 'video') {
                          _requestFileItemVideoMesh(tagMesh)
                            .then(videoMesh => {
                              videoMesh.position.y = -(WORLD_HEIGHT / 2) - ((WORLD_OPEN_HEIGHT - WORLD_HEIGHT) / 2) + ((100 / OPEN_HEIGHT * WORLD_OPEN_HEIGHT) / 2);

                              object.add(videoMesh);
                            })
                            .catch(err => {
                              console.warn(err);
                            });
                        } else if (mode === 'model') {
                          _requestFileItemModelMesh(tagMesh)
                            .then(modelMesh => {
                              const boundingBox = new THREE.Box3().setFromObject(modelMesh);
                              const boundingBoxSize = boundingBox.getSize();
                              const meshCurrentScale = Math.max(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z);
                              const meshScaleFactor = (1 / meshCurrentScale) * 0.1125;
                              modelMesh.position.y = -(WORLD_HEIGHT / 2) - ((WORLD_OPEN_HEIGHT - WORLD_HEIGHT) / 2);
                              // XXX offset the model to center it based on its bounding box
                              modelMesh.scale.set(meshScaleFactor, meshScaleFactor, meshScaleFactor);

                              object.add(modelMesh);
                            })
                            .catch(err => {
                              console.warn(err);
                            });
                        }

                        return object;
                      })();
                      tagMesh.add(previewMesh);
                      item.preview = previewMesh;
                    } else {
                      item.preview.visible = true;
                    }
                  }

                  e.stopImmediatePropagation();

                  return true;
                } else if (match = onclick.match(/^tag:close:(.+)$/)) {
                  const id = match[1];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);

                  const {planeMesh, planeOpenMesh, item} = tagMesh;
                  item.open = false;
                  planeMesh.visible = true;
                  planeOpenMesh.visible = false;

                  if (item.type === 'file') {
                    if (item.preview && item.preview.visible) {
                      item.preview.visible = false;
                    }
                  }

                  e.stopImmediatePropagation();

                  return true;
                } else if (match = onclick.match(/^tag:download:(.+)$/)) {
                  const id = match[1];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);
                  const {item} = tagMesh;
                  const {name} = item;

                  tagsApi.emit('download', {
                    id,
                    name,
                  });
                } else if (match = onclick.match(/^module:link:(.+)$/)) {
                  const id = match[1];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);

                  tagsApi.emit('link', {
                    tagMesh,
                  });
                } else if (match = onclick.match(/^media:(play|pause):(.+)$/)) {
                  const action = match[1];
                  const id = match[2];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);
                  const {item, planeOpenMesh: {page: openPage}} = tagMesh;

                  if (action === 'play') {
                    item.play();
                  } else if (action === 'pause') {
                    item.pause();
                  }

                  openPage.update();
                } else if (match = onclick.match(/^media:seek:(.+)$/)) {
                  const id = match[1];
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);
                  const {item, planeOpenMesh: {page: openPage}} = tagMesh;

                  const {value} = hoverState;
                  item.seek(value);

                  openPage.update();
                } else {
                  return false;
                }
              } else {
                return false;
              }
            };
            const _doSetPosition = () => {
              const {positioningSide} = detailsState;

              if (positioningSide && side === positioningSide) {
                const {positioningId, positioningName} = detailsState;

                const newValue = (() => {
                  const {position, quaternion, scale} = positioningMesh;
                  return position.toArray().concat(quaternion.toArray()).concat(scale.toArray());
                })();
                tagsApi.emit('setAttribute', {
                  id: positioningId,
                  attribute: positioningName,
                  value: newValue,
                });

                detailsState.positioningId = null;
                detailsState.positioningName = null;
                detailsState.positioningSide = null;

                const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === positioningId);
                const {planeOpenMesh: {page: openPage}} = tagMesh;
                openPage.update();

                return true;
              } else {
                return false;
              }
            };
            const _doClickAttribute = () => {
              const hoverState = hoverStates[side];
              const {intersectionPoint} = hoverState;

              if (intersectionPoint) {
                const {anchor} = hoverState;
                const onclick = (anchor && anchor.onclick) || '';

                let match;
                if (match = onclick.match(/^attribute:(.+?):(.+?):(position|focus|set|tweak|toggle|choose)(?::(.+?))?$/)) {
                  const tagId = match[1];
                  const attributeName = match[2];
                  const action = match[3];
                  const value = match[4];

                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === tagId);
                  const {item} = tagMesh;
                  const {attributes} = item;
                  const attribute = attributes[attributeName];
                  const {value: attributeValue, type: attributeType} = attribute;

                  if (action === 'position') {
                    oldPositioningMesh.position.set(attributeValue[0], attributeValue[1], attributeValue[2]);
                    oldPositioningMesh.quaternion.set(attributeValue[3], attributeValue[4], attributeValue[5], attributeValue[6]);
                    oldPositioningMesh.scale.set(attributeValue[7], attributeValue[8], attributeValue[9]);

                    detailsState.positioningId = tagId;
                    detailsState.positioningName = attributeName;
                    detailsState.positioningSide = side;

                    focusState.type = '';
                  } else if (action === 'focus') {
                    const {value} = hoverState;

                    const textProperties = (() => {
                      if (attributeType === 'text') {
                        const valuePx = value * 400; // XXX update these
                        return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(attributeValue, attributeType), subcontentFontSpec, valuePx);
                      } else if (attributeType === 'number') {
                        const valuePx = value * 100;
                        return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(attributeValue, attributeType), subcontentFontSpec, valuePx);
                      } else if (attributeType === 'color') {
                        const valuePx = value * (400 - (40 + 4));
                        return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(attributeValue, attributeType), subcontentFontSpec, valuePx);
                      } else if (attributeType === 'file') {
                        const valuePx = value * 260;
                        return biolumi.getTextPropertiesFromCoord(menuUtils.castValueValueToString(attributeValue, attributeType), subcontentFontSpec, valuePx);
                      } else {
                        return null;
                      }
                    })();
                    if (textProperties) {
                      detailsState.inputText = menuUtils.castValueValueToString(attributeValue, attributeType);
                      const {index, px} = textProperties;
                      detailsState.inputIndex = index;
                      detailsState.inputValue = px;
                    }

                    focusState.type = 'attribute:' + tagId + ':' + attributeName;
                  } else if (action === 'set') {
                    tagsApi.emit('setAttribute', {
                      id: tagId,
                      attribute: attributeName,
                      value: value,
                    });

                    focusState.type = '';
                  } else if (action === 'tweak') {
                    const {value} = hoverState;
                    const {min, max, step} = attribute;

                    const newValue = (() => {
                      let n = min + (value * (max - min));
                      if (step > 0) {
                        n = Math.floor(n / step) * step;
                      }
                      return n;
                    })();
                    tagsApi.emit('setAttribute', {
                      id: tagId,
                      attribute: attributeName,
                      value: newValue,
                    });

                    focusState.type = '';
                  } else if (action === 'toggle') {
                    const newValue = !attributeValue;

                    tagsApi.emit('setAttribute', {
                      id: tagId,
                      attribute: attributeName,
                      value: newValue,
                    });
                  } else if (action === 'choose') {
                    /* elementsState.choosingName = attributeName;

                    _ensureFilesLoaded(elementAttributeFilesState);

                    // XXX needs to be rewritten to handle the new tags model
                    menuUi.addPage(({elementAttributeFiles: {cwd, files, inputText, inputValue, selectedName, clipboardPath, loading, uploading}, focus: {type: focusType}}) => ([
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
                        frameTime: FRAME_TIME,
                        pixelated: true,
                      }
                    ]), {
                      type: 'elementAttributeFiles',
                      state: {
                        elementAttributeFiles: elementAttributeFilesState,
                        focus: focusState,
                      },
                    }); */
                  }

                  const {planeOpenMesh: {page: openPage}} = tagMesh;
                  openPage.update();

                  return true;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            };

            _doClickOpen() || _doSetPosition() || _doClickAttribute();
          };
          input.on('trigger', _trigger);
          const _update = () => {
            const _updateControllers = () => {
              const _updateElementAnchors = () => {
                if (rend.isOpen() || hubEnabled) {
                  const {gamepads} = webvr.getStatus();
                  const controllers = cyborg.getControllers();
                  const controllerMeshes = SIDES.map(side => controllers[side].mesh);

                  SIDES.forEach(side => {
                    const gamepad = gamepads[side];

                    if (gamepad) {
                      const {position: controllerPosition, rotation: controllerRotation} = gamepad;
                      const hoverState = hoverStates[side];
                      const dotMesh = dotMeshes[side];
                      const boxMesh = boxMeshes[side];

                      biolumi.updateAnchors({
                        objects: tagMeshes.map(tagMesh => {
                          if (
                            (tagMesh.parent === scene) ||
                            controllerMeshes.some(controllerMesh => tagMesh.parent === controllerMesh)
                          ) {
                            const {item: {open}} = tagMesh;

                            if (!open) {
                              const {planeMesh} = tagMesh;
                              const matrixObject = _decomposeObjectMatrixWorld(planeMesh);
                              const {page} = planeMesh;

                              return {
                                matrixObject: matrixObject,
                                page: page,
                                width: WIDTH,
                                height: HEIGHT,
                                worldWidth: WORLD_WIDTH,
                                worldHeight: WORLD_HEIGHT,
                                worldDepth: WORLD_DEPTH,
                                metadata: tagMesh,
                              };
                            } else {
                              const {planeOpenMesh} = tagMesh;
                              const matrixObject = _decomposeObjectMatrixWorld(planeOpenMesh);
                              const {page} = planeOpenMesh;

                              return {
                                matrixObject: matrixObject,
                                page: page,
                                width: OPEN_WIDTH,
                                height: OPEN_HEIGHT,
                                worldWidth: WORLD_OPEN_WIDTH,
                                worldHeight: WORLD_OPEN_HEIGHT,
                                worldDepth: WORLD_DEPTH,
                                metadata: tagMesh,
                              };
                            }
                          } else {
                            return null;
                          }
                        }).filter(object => object !== null),
                        hoverState: hoverState,
                        dotMesh: dotMesh,
                        boxMesh: boxMesh,
                        controllerPosition,
                        controllerRotation,
                      });
                    }
                  });
                }
              };
              const _updatePositioningMesh = () => {
                const {positioningId, positioningName, positioningSide} = detailsState;

                if (positioningId && positioningName && positioningSide) {
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === positioningId);
                  const {gamepads} = webvr.getStatus();
                  const gamepad = gamepads[positioningSide];

                  if (gamepad) {
                    const {position: controllerPosition, rotation: controllerRotation, scale: controllerScale} = gamepad;
                    positioningMesh.position.copy(controllerPosition);
                    positioningMesh.quaternion.copy(controllerRotation);
                    positioningMesh.scale.copy(controllerScale);

                    const newValue = controllerPosition.toArray().concat(controllerRotation.toArray()).concat(controllerScale.toArray());
                    item.setAttribute(positioningName, newValue); // XXX figure out what to do with this live update
                  }

                  if (!positioningMesh.visible) {
                    positioningMesh.visible = true;
                  }
                  if (!oldPositioningMesh.visible) {
                    oldPositioningMesh.visible = true;
                  }
                } else {
                  if (positioningMesh.visible) {
                    positioningMesh.visible = false;
                  }
                  if (oldPositioningMesh.visible) {
                    oldPositioningMesh.visible = false;
                  }
                }
              };

              _updateElementAnchors();
              _updatePositioningMesh();
            };
            const _updateLocal = () => {
              for (let i = 0; i < localUpdates.length; i++) {
                const update = localUpdates[i];
                update();
              }
            };

            _updateControllers();
            _updateLocal();
          };
          rend.on('update', _update);

          this._cleanup = () => {
            for (let i = 0; i < tagMeshes.length; i++) {
              const tagMesh = tagMeshes[i];
              tagMesh.parent.remove(tagMesh);
            }
            SIDES.forEach(side => {
              scene.remove(dotMeshes[side]);
              scene.remove(boxMeshes[side]);

              scene.remove(grabBoxMeshes[side]);

              scene.remove(positioningMesh);
              scene.remove(oldPositioningMesh);
            });

            input.removeListener('trigger', _trigger);
            rend.removeListener('update', _update);
          };

          class Item {
            constructor(
              type,
              id,
              name,
              displayName,
              description,
              version,
              attributes,
              mimeType,
              matrix,
              metadata
            ) {
              this.type = type;
              this.id = id;
              this.name = name;
              this.displayName = displayName;
              this.description = description;
              this.version = version;
              this.attributes = attributes;
              /* this.attributes = (() => {
                const result = {};

                for (const k in attributes) {
                  const attribute = attributes[k];

                  const v = (() => {
                    const {type} = attribute;
                    
                    switch (type) {
                      case 'matrix':
                        return {
                          type: 'matrix',
                          value: attribute.value,
                        };
                      case 'text':
                        return {
                          type: 'text',
                          value: attribute.value,
                        };
                      case 'color':
                        return {
                          type: 'color',
                          value: attribute.value,
                        };
                      case 'select':
                        return {
                          type: 'select',
                          value: attribute.value,
                          options: Array.isArray(attribute.options) ? attribute.options : [],
                        };
                      case 'number':
                        return {
                          type: 'number',
                          value: attribute.value,
                          min: typeof attribute.min === 'number' ? attribute.min : 1,
                          max: typeof attribute.max === 'number' ? attribute.max : 10,
                          step: typeof attribute.step === 'number' ? attribute.step : 1,
                        };
                      case 'checkbox':
                        return {
                          type: 'checkbox',
                          value: attribute.value,
                        };
                      case 'file':
                        return {
                          type: 'file',
                          value: attribute.value,
                        };
                      default:
                        return null;
                    }
                  })();
                  if (v !== null) {
                    result[k] = v;
                  }
                }

                return result;
              })(); */
              this.mimeType = mimeType;
              this.matrix = matrix;
              this.metadata = metadata;

              this[itemInstanceSymbol] = null;
              this[itemInstancingSymbol] = false;
              this[itemOpenSymbol] = false;
              this[itemPausedSymbol] = true;
              this[itemValueSymbol] = 0;
              this[itemPreviewSymbol] = false;

              this[itemMutexSymbol] = new MultiMutex();
            }

            get instance() {
              return this[itemInstanceSymbol];
            }
            set instance(instance) {
              this[itemInstanceSymbol] = instance;
            }
            get instancing() {
              return this[itemInstancingSymbol];
            }
            set instancing(instancing) {
              this[itemInstancingSymbol] = instancing;
            }
            get open() {
              return this[itemOpenSymbol];
            }
            set open(open) {
              this[itemOpenSymbol] = open;
            }
            get paused() {
              return this[itemPausedSymbol];
            }
            set paused(paused) {
              this[itemPausedSymbol] = paused;
            }
            get value() {
              return this[itemValueSymbol];
            }
            set value(value) {
              this[itemValueSymbol] = value;
            }
            get preview() {
              return this[itemPreviewSymbol];
            }
            set preview(preview) {
              this[itemPreviewSymbol] = preview;
            }

            setAttribute(attributeName, newValue) {
              const {attributes} = this;
              attributes[attributeName] = newValue; // XXX this should technically be set after the DOM mutation handler so externally-triggered setAttribute()s are saved

              const {instance} = this;
              if (instance) {
                const entityElement = instance;
                const newValueString = JSON.stringify(newValue);

                entityElement.setAttribute(attributeName, newValueString);
              }
            }

            lock() {
              return this[itemMutexSymbol].lock(ITEM_LOCK_KEY);
            }

            play() {
              this.paused = false;

              const {preview} = this;
              if (preview) {
                const mode = _getItemPreviewMode(this);

                if (mode === 'audio') {
                  const {
                    children: [
                      {
                        audio,
                      },
                    ],
                  } = preview;
                  audio.play();
                } else if (mode === 'video') {
                  const {
                    children: [
                      {
                        material: {
                          map: {
                            image: video,
                          },
                        },
                      },
                    ],
                  } = preview;
                  video.play();
                }
              }
            }

            pause() {
              this.paused = true;

              const {preview} = this;
              if (preview) {
                const mode = _getItemPreviewMode(this);

                if (mode === 'audio') {
                  const {
                    children: [
                      {
                        audio,
                      },
                    ],
                  } = preview;
                  audio.pause();
                } else if (mode === 'video') {
                  const {
                    children: [
                      {
                        material: {
                          map: {
                            image: video,
                          },
                        },
                      },
                    ],
                  } = preview;
                  video.pause();
                }
              }
            }

            seek(value) {
              this.value = value;

              const {preview} = this;
              if (preview) {
                const mode = _getItemPreviewMode(this);

                if (mode === 'audio') {
                  const {
                    children: [
                      {
                        audio,
                      },
                    ],
                  } = preview;
                  audio.currentTime = value * audio.duration;
                } else if (mode === 'video') {
                  const {
                    children: [
                      {
                        material: {
                          map: {
                            image: video,
                          },
                        },
                      },
                    ],
                  } = preview;
                  video.currentTime = value * video.duration;
                }
              }
            }

            destroy() {
              const {preview} = this;

              if (preview && preview.destroy) {
                preview.destroy();
              }
            }
          }

          const tagMeshes = [];
          rend.registerAuxObject('tagMeshes', tagMeshes);

          const componentApis = {};
          const componentApiInstances = {};
          const elementApis = {};

          const _getBoundComponentSpecs = entityAttributes => {
            const result = [];

            for (const tag in componentApis) {
              const componentApi = componentApis[tag];
              const {attributes: componentAttributes} = componentApi;

              const matchingAttributes = Object.keys(componentAttributes).filter(attributeName => (attributeName in entityAttributes));
              if (matchingAttributes.length > 0) {
                result.push({
                  tag,
                  matchingAttributes,
                });
              }
            }

            return result;
          };
          const _getBoundEntitySpecs = componentAttributes => {
            const result = [];

            for (let i = 0; i < tagMeshes.length; i++) {
              const tagMesh = tagMeshes[i];
              const {item} = tagMesh;
              const {type} = item;

              if (type === 'entity' && !(item.metadata && item.metadata.isStatic)) {
                const {attributes: entityAttributes} = item;

                const matchingAttributes = Object.keys(entityAttributes).filter(attributeName => (attributeName in componentAttributes));
                if (matchingAttributes.length > 0) {
                  result.push({
                    tagMesh,
                    matchingAttributes,
                  });
                }
              }
            }

            return result;
          };

          class TagsApi extends EventEmitter {
            constructor() {
              super();

              this.listen();
            }

            registerComponent(pluginInstance, componentApi) {
              const tag = archae.getName(pluginInstance);

              componentApis[tag] = componentApi;
            }

            unregisterComponent(pluginInstance) {
              const tag = archae.getName(pluginInstance);

              delete componentApis[tag];
            }

            registerElement(pluginInstance, elementApi) {
              const tag = archae.getName(pluginInstance);

              elementApis[tag] = elementApi;
            }

            unregisterElement(pluginInstance) {
              const tag = archae.getName(pluginInstance);

              delete elementApis[tag];
            }

            makeTag(itemSpec) {
              const object = new THREE.Object3D();
              object[tagFlagSymbol] = true;

              const item = new Item(
                itemSpec.type,
                itemSpec.id,
                itemSpec.name,
                itemSpec.displayName,
                itemSpec.description,
                itemSpec.version,
                itemSpec.attributes,
                itemSpec.mimeType,
                itemSpec.matrix,
                itemSpec.metadata
              );
              object.item = item;

              object.position.set(item.matrix[0], item.matrix[1], item.matrix[2]);
              object.quaternion.set(item.matrix[3], item.matrix[4], item.matrix[5], item.matrix[6]);
              object.scale.set(item.matrix[7], item.matrix[8], item.matrix[9]);

              const _addUiManagerPage = uiManager => {
                const {metadata: {open}} = uiManager;

                const mesh = uiManager.addPage(({
                  item,
                  details: {
                    inputText,
                    inputValue,
                    positioningId,
                    positioningName,
                  },
                  focus: {
                    type: focusType,
                  }
                }) => {
                  const {type} = item;
                  const focusAttributeSpec = (() => {
                    const match = focusType.match(/^attribute:(.+?):(.+?)$/);
                    return match && {
                      tagId: match[1],
                      attributeName: match[2],
                    };
                  })();
                  const mode = _getItemPreviewMode(item);
                  const src = (() => {
                    switch (type) {
                      case 'module':
                        return tagsRenderer.getModuleSrc({item, inputText, inputValue, positioningId, positioningName, focusAttributeSpec, open});
                      case 'element':
                        return tagsRenderer.getElementSrc({item, inputText, inputValue, positioningId, positioningName, focusAttributeSpec, open});
                      case 'entity':
                        return tagsRenderer.getEntitySrc({item});
                      case 'file':
                        return tagsRenderer.getFileSrc({item, mode, open});
                      default:
                        return null;
                    }
                  })();

                  return {
                    type: 'html',
                    src: src,
                    w: !open ? WIDTH : OPEN_WIDTH,
                    h: !open ? HEIGHT : OPEN_HEIGHT,
                  };
                }, {
                  type: 'tag',
                  state: {
                    item: item,
                    details: detailsState,
                    focus: focusState,
                  },
                  worldWidth: !open ? WORLD_WIDTH : WORLD_OPEN_WIDTH,
                  worldHeight: !open ? WORLD_HEIGHT : WORLD_OPEN_HEIGHT,
                });
                mesh.receiveShadow = true;

                return mesh;
              };

              const isStatic = Boolean(itemSpec.metadata && itemSpec.metadata.isStatic);
              if (!isStatic) { 
                const planeMesh = _addUiManagerPage(uiManager);
                object.add(planeMesh);
                object.planeMesh = planeMesh;

                const planeOpenMesh = _addUiManagerPage(uiOpenManager);
                planeOpenMesh.position.x = (WORLD_OPEN_WIDTH - WORLD_WIDTH) / 2;
                planeOpenMesh.position.y = -(WORLD_OPEN_HEIGHT - WORLD_HEIGHT) / 2;
                planeOpenMesh.visible = false;
                object.add(planeOpenMesh);
                object.planeOpenMesh = planeOpenMesh;
              } else {
                const planeMesh = _addUiManagerPage(uiStaticManager);
                object.add(planeMesh);
                object.planeMesh = planeMesh;
              }

              const _setAttribute = (attribute, value) => {
                item.setAttribute(attribute, value);

                const {planeMesh: {page}} = object;
                page.update();
              };
              object.setAttribute = _setAttribute;

              tagMeshes.push(object);

              return object;
            }

            destroyTag(tagMesh) {
              const index = tagMeshes.indexOf(tagMesh);

              if (index !== -1) {
                const {item} = tagMesh;
                item.destroy();

                tagMeshes.splice(index, 1);
              }
            }

            reifyModule(tagMesh) {
              const {item} = tagMesh;
              const {instance, instancing} = item;

              if (!instance && !instancing) {
                const {name} = item;

                item.lock()
                  .then(unlock => {
                    archae.requestPlugin(name)
                      .then(pluginInstance => {
                        const name = archae.getName(pluginInstance);

                        const tag = name;
                        let componentApi = componentApis[tag];
                        if (!HTMLElement.isPrototypeOf(componentApi)) {
                          componentApi = HTMLElement;
                        }
                        const {id} = item;
                        const baseClass = componentApi;

                        const moduleElement = menuUtils.makeZeoModuleElement({
                          tag,
                          baseClass,
                        });
                        moduleElement.item = item;
                        item.instance = moduleElement;
                        componentApiInstances[tag] = moduleElement;

                        item.instancing = false;

                        rootModulesElement.appendChild(moduleElement);

                        const _updateInstanceUi = () => {
                          const {planeMesh: {page}, planeOpenMesh: {page: openPage}} = tagMesh;
                          page.update();
                          openPage.update();
                        };
                        _updateInstanceUi();

                        const _updateNpmUi = () => {
                          const tagMesh = tagMeshes.find(tagMesh =>
                            tagMesh.item.type === 'module' &&
                            tagMesh.item.name === item.name &&
                            tagMesh.item.metadata.isStatic
                          );
                          if (tagMesh) {
                            const {item} = tagMesh;
                            item.metadata.exists = true;

                            const {planeMesh: {page}} = tagMesh;
                            page.update();
                          }
                        };
                        _updateNpmUi();

                        unlock();
                      })
                      .catch(err => {
                        console.warn(err);

                        unlock();
                      });
                  });

                item.instancing = true;

                const {planeMesh: {page}, planeOpenMesh: {page: openPage}} = tagMesh;
                page.update();
                openPage.update();
              }
            }

            unreifyModule(tagMesh) {
              const {item} = tagMesh;

              item.lock()
                .then(unlock => {
                  const {instance} = item;

                  if (instance) {
                    const moduleElement = instance;
                    item.instance = null;

                    const {name} = item;
                    componentApiInstances[name] = null;

                    const _updateNpmUi = () => {
                      const tagMesh = tagMeshes.find(tagMesh =>
                        tagMesh.item.type === 'module' &&
                        tagMesh.item.name === item.name &&
                        tagMesh.item.metadata.isStatic
                      );
                      if (tagMesh) {
                        const {item} = tagMesh;
                        item.metadata.exists = false;

                        const {planeMesh: {page}} = tagMesh;
                        page.update();
                      }
                    };
                    _updateNpmUi();

                    rootModulesElement.removeChild(moduleElement);
                  }

                  unlock();
                });
            }

            reifyEntity(tagMesh) {
              const {item} = tagMesh;
              const {instance} = item;

              if (!instance) {
                const {attributes: entityAttributes} = item;
                
                const entityElement = menuUtils.makeZeoEntityElement();
                entityElement.item = item;
                item.instance = entityElement;

                rootEntitiesElement.appendChild(entityElement);
              }
            }

            unreifyEntity(tagMesh) {
              const {item} = tagMesh;
              const {instance} = item;

              if (instance) {
                const entityElement = instance;
                item.instance = null;

                rootEntitiesElement.removeChild(entityElement);
              }
            }

            reifyTag(tagMesh) {
              const {item} = tagMesh;
              const {instance, instancing} = item;

              if (!instance && !instancing) {
                const {name} = item;

                item.lock()
                  .then(unlock => {
                    archae.requestPlugin(name)
                      .then(pluginInstance => {
                        const name = archae.getName(pluginInstance);

                        const tag = name;
                        let elementApi = elementApis[tag];
                        if (!HTMLElement.isPrototypeOf(elementApi)) {
                          elementApi = HTMLElement;
                        }
                        const {id, attributes} = item;
                        const baseClass = elementApi;

                        const element = menuUtils.makeZeoEntityElement({
                          tag,
                          attributes,
                          baseClass,
                        });
                        element.onsetattribute = (attribute, value) => {
                          tagsApi.emit('setAttribute', {id, attribute, value});
                        };
                        item.instance = element;
                        rootEntitiesElement.appendChild(element);

                        item.instancing = false;
                        item.attributes = _clone(attributes);

                        const {planeMesh: {page}, planeOpenMesh: {page: openPage}} = tagMesh;
                        page.update();
                        openPage.update();

                        unlock();
                      })
                      .catch(err => {
                        console.warn(err);

                        unlock();
                      });
                  });

                item.instancing = true;

                const {planeMesh: {page}, planeOpenMesh: {page: openPage}} = tagMesh;
                page.update();
                openPage.update();
              }
            }

            unreifyTag(tagMesh) {
              const {item} = tagMesh;

              item.lock()
                .then(unlock => {
                  const {instance} = item;

                  if (instance) {
                    if (typeof instance.destructor === 'function') {
                      instance.destructor();
                    }
                    item.instance = null;

                    rootEntitiesElement.removeChild(instance);
                  }

                  unlock();
                });
            }

            getRootModulesElement() {
              return rootModulesElement;
            }

            getRootEntitiesElement() {
              return rootEntitiesElement;
            }

            getPointedTagMesh(side) {
              return hoverStates[side].metadata;
            }

            listen() {
              this.on('setAttribute', setAttrbuteSpec => {
                if (this.listeners('setAttribute').length === 1) { // if this is the only listener, we need to set the attribute on ourselves
                  const {id, attribute, value} = setAttrbuteSpec;
                  const tagMesh = tagMeshes.find(tagMesh => tagMesh.item.id === id);
                  const {item} = tagMesh;
                  item.setAttribute(attribute, value);
                }
              });
            }
          };
          const tagsApi = new TagsApi();

          return tagsApi;
        }
      });
  }

  unmount() {
    this._cleanup();
  }
}

const _clone = o => JSON.parse(JSON.stringify(o));

module.exports = Tags;
