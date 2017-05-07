import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_DEPTH,
} from './lib/constants/payment';
import paymentRenderer from './lib/render/payment';

const ASSET_TAG_MESH_SCALE = 1.5;
const DEFAULT_MATRIX = [
  0, 0, 0,
  0, 0, 0, 1,
  1, 1, 1,
];

const SIDES = ['left', 'right'];

class Payment {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;
    const {metadata: {site: {url: siteUrl}, home: {enabled: homeEnabled}, server: {enabled: serverEnabled}}} = archae;

    let live = true;
    this._cleanup = () => {
      live = false;
    };

    return archae.requestPlugins([
      '/core/engines/three',
      '/core/engines/input',
      '/core/engines/webvr',
      '/core/engines/biolumi',
      '/core/engines/rend',
      '/core/engines/tags',
    ]).then(([
      three,
      input,
      webvr,
      biolumi,
      rend,
      tags,
    ]) => {
      if (live) {
        const {THREE, scene, camera} = three;

        const transparentMaterial = biolumi.getTransparentMaterial();

        const _decomposeObjectMatrixWorld = object => _decomposeMatrix(object.matrixWorld);
        const _decomposeMatrix = matrix => {
          const position = new THREE.Vector3();
          const rotation = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          matrix.decompose(position, rotation, scale);
          return {position, rotation, scale};
        };

        const paymentMeshes = [];
        const _makePaymentMesh = cb => {
          const id = _makeId();

          const paymentUi = biolumi.makeUi({
            width: WIDTH,
            height: HEIGHT,
          });
          const mesh = paymentUi.makePage(({
            // nothing
          }) => {
            return {
              type: 'html',
              src: paymentRenderer.getPaymentSrc({id}),
              x: 0,
              y: 0,
              w: WIDTH,
              h: HEIGHT,
            };
          }, {
            type: 'payment',
            state: {
              // nothing
            },
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
          });

          const {hmd: hmdStatus} = webvr.getStatus();
          mesh.position.copy(
            hmdStatus.position.clone()
              .add(new THREE.Vector3(0, -0.5, -0.5))
          );
          const hmdRotation = new THREE.Euler().setFromQuaternion(hmdStatus.rotation, camera.rotation.order);
          mesh.rotation.set(-Math.PI / 4, hmdRotation.y, 0, camera.rotation.order);
          mesh.receiveShadow = true;

          mesh.paymentId = id;
          mesh.confirm = () => {
            cb();
          };
          mesh.cancel = () => {
            const err = new Error('user canceled payment');
            cb(err);
          };

          const {page} = mesh;
          page.initialUpdate();
          rend.addPage(page);

          mesh.destroy = (destroy => function() {
            destroy.apply(this, arguments);

            rend.removePage(page);
          })(mesh.destroy);

          return mesh;
        };

        const _trigger = e => {
          const {side} = e;
          const hoverState = rend.getHoverState(side);
          const {intersectionPoint} = hoverState;

          if (intersectionPoint) {
            const {anchor} = hoverState;
            const onclick = (anchor && anchor.onclick) || '';

            let match;
            if (match = onclick.match(/^payment:confirm:(.+)$/)) {
              const id = match[1];
              const paymentMesh = paymentMeshes.find(paymentMesh => paymentMesh.paymentId === id);

              console.log('confirm', {id, paymentMesh}); // XXX

              scene.remove(paymentMesh);
              paymentMesh.destroy();
            } else if (match = onclick.match(/^payment:cancel:(.+)$/)) {
              const id = match[1];
              const paymentMesh = paymentMeshes.find(paymentMesh => paymentMesh.paymentId === id);

              console.log('cancel', {id, paymentMesh}); // XXX

              scene.remove(paymentMesh);
              paymentMesh.destroy();
            }
          }
        };
        input.on('trigger', _trigger, {
          priority: 1,
        });

        this._cleanup = () => {
          for (let i = 0; i < paymentMeshes.length; i++) {
            const paymentMesh = paymentMeshes[i];
            scene.remove(paymentMesh);
            paymentMesh.destroy();
          }
        };

        const _requestPayment = ({srcAsset, srcQuantity, dstAsset, dstQuantity}) => new Promise((accept, reject) => {
          const paymentMesh = _makePaymentMesh(err => {
            if (!err) {
              accept();
            } else {
              reject(err);
            }
          });
          scene.add(paymentMesh);
          paymentMeshes.push(paymentMesh);
        });

        return {
          requestPayment: _requestPayment,
        };
      }
    });
  }

  unmount() {
    this._cleanup();
  }
}
const _makeId = () => Math.random().toString(36).substring(7);

module.exports = Payment;