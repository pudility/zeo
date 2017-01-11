class Heartlink {
  constructor(archae) {
    this._archae = archae;
  }

  mount() {
    const {_archae: archae} = this;

    return archae.requestPlugins([
      '/core/plugins/js-utils',
    ]).then(([
      jsUtils,
    ]) => {
      const {events} = jsUtils;
      const {EventEmitter} = events;

      const playerStatuses = new Map();

      const connection = new WebSocket('wss://' + location.host + '/archae/heartlink');
      let queue = [];
      connection.onopen = () => {
        if (queue.length > 0) {
          for (let i = 0; i < queue.length; i++) {
            const e = queue[i];
            const es = JSON.stringify(e);
            connection.send(es);
          }

          queue = [];
        }
      };
      connection.onerror = err => {
        console.warn(err);
      };
      connection.onmessage = msg => {
        const m = JSON.parse(msg.data);
        const {type} = m;
        if (type === 'statuses') {
          const {statuses} = m;
          for (let i = 0; i < statuses.length; i++) {
            const statusEntry = statuses[i];
            _handleStatusEntry(statusEntry);
          }
        } else if (type === 'status') {
          const statusEntry = m;
          _handleStatusEntry(statusEntry);
        }
      };

      const _handleStatusEntry = statusEntry => {
        const {id, status} = statusEntry;

        if (status) {
          if (!playerStatuses.has(id)) {
            player.emit('playerEnter', {id, status});
          } else {
            player.emit('playerStatusUpdate', {id, status});
          }

          playerStatuses.set(id, status);
        } else {
          player.emit('playerLeave', {id});

          playerStatuses.delete(id);
        }
      };

      class Player extends EventEmitter {
        getPlayerStatuses() {
          return playerStatuses;
        }

        updateStatus(status) {
          const e = {
            type: 'status',
            status,
          };

          if (connection.readyState === WebSocket.OPEN) {
            const es = JSON.stringify(e);
            connection.send(es);
          } else {
            queue.push(e);
          }
        }
      }

      const player = new Player();

      this._cleanup = () => {
        connection.close();
      };

      const _getPlayer = () => player;

      return {
        getPlayer: _getPlayer,
      };
    });
  }

  unmount() {
    this._cleanup();
  }
}

module.exports = Heartlink;
