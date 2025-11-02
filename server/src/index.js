const path = require('path');
const uws = require('uWebSockets.js');

const Game = require('./game/Game');
const Loop = require('./utilities/Loop');
const Server = require('./network/Server');
const config = require('./config');
const {initModeration} = require('./moderation');
const { writeHeapSnapshot } = require('node:v8');
const fs = require('fs');
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);

// Rate limiting for serverinfo endpoint
const serverinfoRateLimit = new Map(); // IP -> { count, resetTime }
const SERVERINFO_MAX_REQUESTS_PER_MINUTE = 30;

// Check rate limit for serverinfo requests
function checkServerinfoRateLimit(ip) {
  const now = Date.now();
  const data = serverinfoRateLimit.get(ip);
  
  if (!data) {
    serverinfoRateLimit.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + 60000;
    return true;
  }
  
  data.count++;
  return data.count <= SERVERINFO_MAX_REQUESTS_PER_MINUTE;
}

// Get client IP from request
function getClientIP(req) {
  const xForwardedFor = req.getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }
  return '';
}

let app;
if (config.useSSL) {
  app = uws.SSLApp({
    key_file_name: path.resolve(config.sslData.key),
    cert_file_name: path.resolve(config.sslData.cert),
  });
} else {
  app = uws.App();
}

app.listen('0.0.0.0', config.port, (ws) => {
  if (ws) {
    start();
    console.log(`Game started on port ${config.port}.`);
  }
});

function setCorsHeaders(response) {
  response.writeHeader('Access-Control-Allow-Origin', '*');
  response.writeHeader('Access-Control-Allow-Methods', 'GET');
  response.writeHeader('Access-Control-Allow-Headers', 'content-type');
}

app.options('/ping', (res) => {
  setCorsHeaders(res);
});
app.get('/ping', (res) => {
  setCorsHeaders(res);
  res.writeHeader('Content-Type', 'text/plain');
  res.writeStatus('200 OK');
  res.end('pong');
});

/*app.get('/heapdump', async (res) => {
  setCorsHeaders(res);

  const filename = writeHeapSnapshot();

  // Ensure cleanup in case of request abortion
  res.onAborted(() => {
    fs.unlinkSync(filename); // Clean up the file if the client aborts the connection
  });

  try {
    // Read the file into memory - be cautious with large files
    const data = await readFileAsync(filename);

    res.writeHeader('Content-Type', 'application/octet-stream');
    res.writeHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`);
    res.end(data);

    // Clean up the file after sending
    fs.unlinkSync(filename);
  } catch (error) {
    console.error('Failed to serve heap dump', error);
    if (!res.aborted) {
      res.writeStatus('500 Internal Server Error');
      res.end('Failed to generate or serve heap dump');
    }
    // Attempt to clean up even in case of failure
    fs.unlinkSync(filename);
  }
});*/

function start() {
  const game = new Game();
  game.initialize();
  const server = new Server(game);
  server.initialize(app);
  app.get('/serverinfo', (res, req) => {
    try {
      const clientIP = getClientIP(req);
      
      // Check rate limit
      if (!checkServerinfoRateLimit(clientIP)) {
        console.warn(`[RATE_LIMIT] /serverinfo: IP ${clientIP} exceeded rate limit`);
        setCorsHeaders(res);
        res.writeStatus('429 Too Many Requests');
        res.end('Too Many Requests');
        return;
      }
      
      setCorsHeaders(res);
      res.writeHeader('Content-Type', 'application/json');
      res.writeStatus('200 OK');
      res.end(JSON.stringify({
        tps: game.tps,
        entityCnt: game.entities.size,
        playerCnt: game.players.size,
        realPlayersCnt: [...game.players.values()].filter(p => !p.isBot).length,
      }));
    } catch (err) {
      console.error('[ERROR] /serverinfo error:', err);
      setCorsHeaders(res);
      res.writeStatus('500 Internal Server Error');
      res.end('Internal Server Error');
    }
  });
  initModeration(game, app);

  // Gameloop
  const frameTime = 1000 / config.tickRate;
  const dt = frameTime / 1000;
  const loop = new Loop(frameTime, game);
  loop.setEventHandler(() => {
    server.tick(dt);
  });
  loop.onTpsUpdate = (tps) => {
    game.tps = tps;
    loop.entityCnt = game.entities.size;
  }
  loop.start();

  function stop(reason) {
    try {
    console.log('Stopping game...', reason);
    for (const client of server.clients.values()) {
      console.log(`Disconnecting client ${client.id}`);
      if (client.player) {
        console.log(`Saving game for player ${client.player.id} (${client.player.name})`);
        try {
        const data = {
          coins: client.player.levels?.coins,
          kills: client.player.kills,
          playtime: client.player.playtime,
        };

        client.saveGame(data);
      } catch (err) {
        console.error('Failed to save game for player', client.player.id, client.player.name, err);
      }
      }
    }

    console.log('All games saved. Exiting...');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  }

  process.on('SIGTERM', () => {
    stop('SIGTERM');
  });

  process.on('SIGINT', () => {
    stop('SIGINT');
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception', err);
    stop('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection', reason, promise);
    stop('unhandledRejection');
  });
}