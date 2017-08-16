const {
  NUM_CELLS,

  NUM_CELLS_HEIGHT,

  RANGE,
} = require('./lib/constants/constants');
const protocolUtils = require('./lib/utils/protocol-utils');

const TEXTURE_SIZE = 1024;
const NUM_POSITIONS_CHUNK = 200 * 1024;
const HEIGHTFIELD_PLUGIN = 'plugins-heightfield';
const LIGHTMAP_PLUGIN = 'plugins-lightmap';
const DAY_NIGHT_SKYBOX_PLUGIN = 'plugins-day-night-skybox';

const GRASS_SHADER = {
  uniforms: {
    map: {
      type: 't',
      value: null,
    },
    lightMap: {
      type: 't',
      value: null,
    },
    d: {
      type: 'v2',
      value: null,
    },
    sunIntensity: {
      type: 'f',
      value: 0,
    },
  },
  vertexShader: `\
precision highp float;
precision highp int;
/*uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv; */

varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vUv = uv;

  vec4 mvPosition = modelViewMatrix * vec4( position.xyz, 1.0 );
  gl_Position = projectionMatrix * mvPosition;

	vPosition = position.xyz;
}
`,
  fragmentShader: `\
precision highp float;
precision highp int;
#define ALPHATEST 0.7
// uniform mat4 viewMatrix;
uniform vec3 ambientLightColor;
uniform sampler2D map;
uniform sampler2D lightMap;
uniform vec2 d;
uniform float sunIntensity;

varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec4 diffuseColor = texture2D( map, vUv );

  float u = (
    floor(clamp(vPosition.x - d.x, 0.0, ${(NUM_CELLS).toFixed(8)})) +
    (floor(clamp(vPosition.z - d.y, 0.0, ${(NUM_CELLS).toFixed(8)})) * ${(NUM_CELLS + 1).toFixed(8)}) +
    0.5
  ) / (${(NUM_CELLS + 1).toFixed(8)} * ${(NUM_CELLS + 1).toFixed(8)});
  float v = (floor(vPosition.y) + 0.5) / ${NUM_CELLS_HEIGHT.toFixed(8)};
  vec3 lightColor = texture2D( lightMap, vec2(u, v) ).rgb * 1.0;

#ifdef ALPHATEST
	if ( diffuseColor.a < ALPHATEST ) discard;
#endif

  vec3 outgoingLight = (ambientLightColor * 0.2 + diffuseColor.rgb) * (0.1 + sunIntensity * 0.9) +
    diffuseColor.rgb * (
      min((lightColor.rgb - 0.5) * 2.0, 0.0) * sunIntensity +
      max((lightColor.rgb - 0.5) * 2.0, 0.0) * (1.0 - sunIntensity)
    );

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
}
`
};

class Grass {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;
    const {three, render, pose, elements, stage, utils: {js: {bffr}, random: {chnkr}}} = zeo;
    const {THREE} = three;

    const upVector = new THREE.Vector3(0, 1, 0);
    const buffers = bffr(NUM_POSITIONS_CHUNK, RANGE * RANGE * 9);

    let live = true;
    this._cleanup = () => {
      live = false;
    };

    const _ensureHeightfieldElement = () => elements.requestElement(HEIGHTFIELD_PLUGIN)
      .then(() => {});

    class QueueEntry {
      constructor(id, cb) {
        this.id = id;
        this.cb = cb;
      }
    }

    const worker = new Worker('archae/plugins/_plugins_grass/build/worker.js');
    const queues = [];
    worker.requestGenerate = (x, y) => _ensureHeightfieldElement()
      .then(() => new Promise((accept, reject) => {
        const id = _makeId();
        const buffer = buffers.alloc();
        worker.postMessage({
          type: 'chunk',
          id,
          x,
          y,
          buffer,
        }, [buffer]);
        queues.push(new QueueEntry(id, accept));
      }));
    worker.requestTexture = () => new Promise((accept, reject) => {
        const id = _makeId();
      const buffer = new ArrayBuffer(TEXTURE_SIZE * TEXTURE_SIZE  * 4);
      worker.postMessage({
        type: 'texture',
        id,
        buffer,
      }, [buffer]);
      queues.push(new QueueEntry(id, buffer => {
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_SIZE;
        canvas.height = TEXTURE_SIZE;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData.data.set(new Uint8Array(buffer));
        ctx.putImageData(imageData, 0, 0);

        accept(canvas);
      }));
    });
    let pendingResponseId = null;
    worker.onmessage = e => {
      const {data} = e;
      if (typeof data === 'string') {
        const m = JSON.parse(data);
        const {type, args} = m;

        if (type === 'response') {
          const [id] = args;
          pendingResponseId = id;
        } else {
          console.warn('heightfield got unknown worker message type:', JSON.stringify(type));
        }
      } else {
        const queueEntryIndex = queues.findIndex(queueEntry => queueEntry.id === pendingResponseId);
        const queueEntry = queues[queueEntryIndex];
        queueEntry.cb(data);
        queues.splice(queueEntryIndex, 1);
        pendingResponseId = null;
      }
    };

    worker.requestTexture()
      .then(mapTextureImg => {
        if (live) {
          const mapTexture = new THREE.Texture(
            mapTextureImg,
            THREE.UVMapping,
            THREE.ClampToEdgeWrapping,
            THREE.ClampToEdgeWrapping,
            // THREE.LinearMipMapLinearFilter,
            // THREE.LinearMipMapLinearFilter,
            THREE.NearestMipMapLinearFilter,
            THREE.NearestMipMapLinearFilter,
            // THREE.NearestMipMapNearestFilter,
            // THREE.NearestMipMapNearestFilter,
            // THREE.LinearFilter,
            // THREE.LinearFilter,
            // THREE.NearestFilter,
            // THREE.NearestFilter,
            THREE.RGBAFormat,
            THREE.UnsignedByteType,
            16
          );
          mapTexture.needsUpdate = true;

          let lightmapper = null;
          const _bindLightmapper = lightmapElement => {
            lightmapper = lightmapElement.lightmapper;

            _bindLightmaps();
          };
          const _unbindLightmapper = () => {
            _unbindLightmaps();

            lightmapper = null;
          };
          const _bindLightmaps = () => {
            for (let i = 0; i < grassChunkMeshes.length; i++) {
              _bindLightmap(grassChunkMeshes[i]);
            }
          };
          const _unbindLightmaps = () => {
            for (let i = 0; i < grassChunkMeshes.length; i++) {
              _unbindLightmap(grassChunkMeshes[i]);
            }
          };
          const _bindLightmap = grassChunkMesh => {
            const lightmap = lightmapper.getLightmapAt(grassChunkMesh.offset.x * NUM_CELLS, grassChunkMesh.offset.y * NUM_CELLS);
            grassChunkMesh.material.uniforms.lightMap.value = lightmap.texture;
            grassChunkMesh.lightmap = lightmap;
          };
          const _unbindLightmap = grassChunkMesh => {
            const {lightmap} = grassChunkMesh;
            lightmapper.releaseLightmap(lightmap);
            grassChunkMesh.lightmap = null;
          };
          const elementListener = elements.makeListener(LIGHTMAP_PLUGIN);
          elementListener.on('add', entityElement => {
            _bindLightmapper(entityElement);
          });
          elementListener.on('remove', () => {
            _unbindLightmapper();
          });

          const _requestGrassGenerate = (x, y) => worker.requestGenerate(x, y)
            .then(grassChunkBuffer => protocolUtils.parseGrassGeometry(grassChunkBuffer));

          const _makeGrassChunkMesh = (grassChunkData, x, z) => {
            const mesh = (() => {
              const {positions, uvs, indices, boundingSphere} = grassChunkData;

              const geometry = (() => {
                const geometry = new THREE.BufferGeometry();
                geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                geometry.boundingSphere = new THREE.Sphere(
                  new THREE.Vector3().fromArray(boundingSphere, 0),
                  boundingSphere[3]
                );

                return geometry;
              })();
              const uniforms = Object.assign(
                THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
                THREE.UniformsUtils.clone(GRASS_SHADER.uniforms)
              );
              uniforms.map.value = mapTexture;
              uniforms.d.value = new THREE.Vector2(x * NUM_CELLS, z * NUM_CELLS);
              const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: GRASS_SHADER.vertexShader,
                fragmentShader: GRASS_SHADER.fragmentShader,
                lights: true,
                side: THREE.DoubleSide,
                transparent: true,
                /* extensions: {
                  derivatives: true,
                }, */
              });

              const mesh = new THREE.Mesh(geometry, material);

              mesh.offset = new THREE.Vector2(x, z);
              mesh.lightmap = null;
              if (lightmapper) {
                _bindLightmap(mesh);
              }

              return mesh;
            })();

            mesh.destroy = () => {
              mesh.geometry.dispose();

              const {buffer} = grassChunkData;
              buffers.free(buffer);

              if (mesh.lightmap) {
                _unbindLightmap(mesh);
              }
            };

            return mesh;
          };

          const chunker = chnkr.makeChunker({
            resolution: NUM_CELLS,
            range: RANGE,
          });
          const grassChunkMeshes = [];

          const _requestRefreshGrassChunks = () => {
            const {hmd} = pose.getStatus();
            const {worldPosition: hmdPosition} = hmd;
            const {added, removed} = chunker.update(hmdPosition.x, hmdPosition.z);

            const addedPromises = added.map(chunk => {
              const {x, z} = chunk;

              return _requestGrassGenerate(x, z)
                .then(grassChunkData => {
                  const grassChunkMesh = _makeGrassChunkMesh(grassChunkData, x, z);
                  stage.add('main', grassChunkMesh);

                  grassChunkMeshes.push(grassChunkMesh);

                  chunk.data = grassChunkMesh;
                });
            });
            return Promise.all(addedPromises)
              .then(() => {
                for (let i = 0; i < removed.length; i++) {
                  const chunk = removed[i];
                  const {data: grassChunkMesh} = chunk;
                  stage.remove('main', grassChunkMesh);

                  grassChunkMeshes.splice(grassChunkMeshes.indexOf(grassChunkMesh), 1);

                  grassChunkMesh.destroy();
                }
              })
          };

          let live = true;
          const _recurse = () => {
            _requestRefreshGrassChunks()
              .then(() => {
                if (live) {
                  setTimeout(_recurse, 1000);
                }
              })
              .catch(err => {
                if (live) {
                  console.warn(err);

                  setTimeout(_recurse, 1000);
                }
              });
          };
          _recurse();

          const _update = () => {
            const dayNightSkyboxEntity = elements.getEntitiesElement().querySelector(DAY_NIGHT_SKYBOX_PLUGIN);
            const sunIntensity = (dayNightSkyboxEntity && dayNightSkyboxEntity.getSunIntensity) ? dayNightSkyboxEntity.getSunIntensity() : 0;

            for (let i = 0; i < grassChunkMeshes.length; i++) {
              const grassChunkMesh = grassChunkMeshes[i];
              grassChunkMesh.material.uniforms.sunIntensity.value = sunIntensity;
            }
          };
          render.on('update', _update);

          this._cleanup = () => {
            live = false;

            // XXX remove old grass meshes here

            elements.destroyListener(elementListener);

            render.removeListener('update', _update);
          };
        }
      });
  }

  unmount() {
    this._cleanup();
  }
}
let _id = 0;
const _makeId = () => {
  const result = _id;
  _id = (_id + 1) | 0;
  return result;
};

module.exports = Grass;
