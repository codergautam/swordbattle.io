const config = require('./config');

const secret = config.moderationSecret;
let bannedIps = ['72.46.85.221', '207.188.6.167'];

async function listCommand(game) {
  // list all users in game and their ip
  const players = [];
  for (const player of game.players.values()) {
    if (player.isBot || !player.client) continue;
    players.push({
      id: player.id,
      name: player.name,
      ip: player.client.ip,
    });
  }

  return {
    players,
  };
}

async function banIp(game, params) {
  if(!params.ip) throw new Error('Missing ip param');
  bannedIps.push(params.ip);
  bannedIps = [...new Set(bannedIps)];

  // ban ip
  let playersKicked = 0;

  for (const player of game.players.values()) {
    if (player.isBot || !player.client) continue;
    if (player.client.ip === params.ip) {
      player.client.socket.close();
      playersKicked++;
    }
  }

  return {
    playersKicked,
    bannedIps
  };
}

async function giveCoins(game, params) {
  if(!params.id) throw new Error('Missing id param');
  if(!params.coins) throw new Error('Missing coins param');
  for (const player of game.players.values()) {
    if (player.id === parseInt(params.id)) {
      player.levels.addCoins(parseInt(params.coins));
      return {
        coins: player.levels.coins,
      };
    }
  }
  return {
    coins: 0,
  };
}

module.exports = {
  initModeration: function (game, app) {
    app.get('/moderation/:secret/:command', (res, req) => {
      try {
        const fullUrl = req.getUrl();
        // split url into parts
        const parts = fullUrl.split('/');

        req.params = {
          secret: parts[2],
          command: parts[3],
        }

        // get query params
        const query = req.getQuery();
        if (query) {
          const params = query.split('&');
          for (const param of params) {
            const [key, value] = param.split('=');
            req.params[key] = value;
          }
        }

        if (req.params.secret !== secret) {
          res.writeStatus('403 Forbidden');
          res.end();
          return;
        }

        const command = req.params.command;
        const cmds = [['list', listCommand], ['banip', banIp], ['givecoins', giveCoins]];

        if (!cmds.find(c => c[0] === command)) {
          res.writeStatus('400 Bad Request');
          res.end();
          return;
        }

        cmds.find(c => c[0] === command)[1](game, req.params, app).then((json) => {
          res.writeHeader('Content-Type', 'application/json');
          res.writeStatus('200 OK');
          res.end(JSON.stringify(json));
        }).catch((e) => {
          res.writeStatus('500 Internal Server Error');
          res.end('Internal Server Error+<br><br>' + e?.message);
        });
      } catch (err) {
        console.error(err);
        res.writeStatus('500 Internal Server Error');
        res.end('Internal Server Error+<br><br>' + err?.message);
      }
    });
  },
  getBannedIps: function () {
    return bannedIps;
  },
}