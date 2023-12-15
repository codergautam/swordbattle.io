const path = require('path');
const uws = require('uWebSockets.js');

const Game = require('./game/Game');
const Loop = require('./utilities/Loop');
const Server = require('./network/Server');
const config = require('./config');

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

function start() {
  const game = new Game();
  game.initialize();
  const server = new Server(game);
  server.initialize(app);

  // Gameloop
  const frameTime = 1000 / config.tickRate;
  const dt = frameTime / 1000;
  const loop = new Loop(frameTime);
  loop.setEventHandler(() => {
    server.tick(dt);
  });
  loop.onTpsUpdate = (tps) => {
    game.tps = tps;
    loop.entityCnt = game.entities.size;
  }
  loop.start();
}