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

const timestampFailures = new Map();
const TIMESTAMP_FAIL_THRESHOLD = 5;
const TIMESTAMP_FAIL_WINDOW = 300000;

const serverinfoRateLimit = new Map();
const SERVERINFO_MAX_REQUESTS_PER_MINUTE = 200;
const SERVERINFO_MAX_REQUESTS_PER_10_SECONDS = 50;
const serverinfoProxyTracker = new Map();
const serverinfoBannedIPs = new Set();
const serverinfoBannedProxies = new Set();

function checkServerinfoRateLimit(ip, proxyIp) {
  const now = Date.now();

  if (serverinfoBannedIPs.has(ip)) {
    return false;
  }

  if (proxyIp && serverinfoBannedProxies.has(proxyIp)) {
    return false;
  }

  const data = serverinfoRateLimit.get(ip);

  if (!data) {
    serverinfoRateLimit.set(ip, {
      count: 1,
      resetTime: now + 60000,
      shortTermCount: 1,
      shortTermResetTime: now + 10000
    });
    return true;
  }

  if (now > data.resetTime) {
    data.count = 1;
    data.resetTime = now + 60000;
  } else {
    data.count++;
  }

  if (now > data.shortTermResetTime) {
    data.shortTermCount = 1;
    data.shortTermResetTime = now + 10000;
  } else {
    data.shortTermCount++;
  }

  if (data.count > SERVERINFO_MAX_REQUESTS_PER_MINUTE) {
    console.warn(`[SERVERINFO_BAN] IP ${ip} exceeded /serverinfo rate limit (${data.count} req/min). Banning for 5 minutes.`);
    serverinfoBannedIPs.add(ip);
    setTimeout(() => {
      serverinfoBannedIPs.delete(ip);
      serverinfoRateLimit.delete(ip);
    }, 300000);
    return false;
  }

  if (data.shortTermCount > SERVERINFO_MAX_REQUESTS_PER_10_SECONDS) {
    console.warn(`[SERVERINFO_BAN] IP ${ip} exceeded /serverinfo burst limit (${data.shortTermCount} req/10s). Banning for 2 minutes.`);
    serverinfoBannedIPs.add(ip);
    setTimeout(() => {
      serverinfoBannedIPs.delete(ip);
      serverinfoRateLimit.delete(ip);
    }, 120000);
    return false;
  }

  if (proxyIp) {
    if (!serverinfoProxyTracker.has(proxyIp)) {
      serverinfoProxyTracker.set(proxyIp, { requests: [], firstSeen: now });
    }
    const proxyData = serverinfoProxyTracker.get(proxyIp);
    proxyData.requests.push(now);
    proxyData.requests = proxyData.requests.filter(t => now - t < 10000);

    if (proxyData.requests.length > 100) {
      console.warn(`[SERVERINFO_BAN] Proxy IP ${proxyIp} flooding /serverinfo (${proxyData.requests.length} req/10s). Temporarily banning proxy for 5 minutes.`);
      serverinfoBannedProxies.add(proxyIp);
      setTimeout(() => {
        serverinfoBannedProxies.delete(proxyIp);
      }, 300000);
      return false;
    }
  }

  return true;
}

function getClientIP(req) {
  const xForwardedFor = req.getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }
  return '';
}

function getProxyIP(req) {
  const xForwardedFor = req.getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 1) {
      return ips[ips.length - 1];
    }
  }
  return null;
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
      const url = req.getUrl();
      const query = req.getQuery();
      const clientIP = getClientIP(req);
      const proxyIP = getProxyIP(req);

      if (!query || query.length === 0) {
        console.warn(`[SERVERINFO_BLOCK] IP ${clientIP} sent /serverinfo without query parameter. Blocking.`);
        setCorsHeaders(res);
        res.writeStatus('403 Forbidden');
        res.end('Forbidden');
        serverinfoBannedIPs.add(clientIP);
        setTimeout(() => {
          serverinfoBannedIPs.delete(clientIP);
        }, 600000);
        return;
      }

      // Validate timestamp freshness
      const now = Date.now();
      const timestampMatch = query.match(/^(\d+)/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1], 10);
        const timeDiff = Math.abs(now - timestamp);
        const MAX_TIME_DIFF = 120000;

        if (timeDiff > MAX_TIME_DIFF) {
          let failData = timestampFailures.get(clientIP);
          if (!failData || now - failData.firstFail > TIMESTAMP_FAIL_WINDOW) {
            failData = { count: 1, firstFail: now };
            timestampFailures.set(clientIP, failData);
          } else {
            failData.count++;
          }

          if (failData.count >= TIMESTAMP_FAIL_THRESHOLD) {
            console.warn(`[SERVERINFO_BLOCK] IP ${clientIP} sent /serverinfo with invalid timestamp ${failData.count} times (diff: ${timeDiff}ms). Blocking.`);
            setCorsHeaders(res);
            res.writeStatus('403 Forbidden');
            res.end('Forbidden');
            serverinfoBannedIPs.add(clientIP);
            setTimeout(() => {
              serverinfoBannedIPs.delete(clientIP);
              timestampFailures.delete(clientIP);
            }, 600000);
            return;
          } else {
            setCorsHeaders(res);
            res.writeStatus('403 Forbidden');
            res.end('Forbidden');
            return;
          }
        }
      }

      if (!checkServerinfoRateLimit(clientIP, proxyIP)) {
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