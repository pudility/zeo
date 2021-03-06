const path = require('path');

class Stage {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const { _archae: archae } = this;
    const { express, app } = archae.getCore();

    const stageImgStatic = express.static(path.join(__dirname, 'img'));
    function serveStageImg(req, res, next) {
      stageImgStatic(req, res, next);
    }
    app.use('/archae/stage/img', serveStageImg);

    this._cleanup = () => {
      function removeMiddlewares(route, i, routes) {
        if (route.handle.name === 'serveStageImg') {
          routes.splice(i, 1);
        }
        if (route.route) {
          route.route.stack.forEach(removeMiddlewares);
        }
      }
      app._router.stack.forEach(removeMiddlewares);
    };
  }

  unmount() {
    this._cleanup();
  }
}

module.exports = Stage;
