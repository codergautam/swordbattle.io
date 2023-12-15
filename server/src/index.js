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
  loop.setEventHandler(() => server.tick(dt));
  loop.setOnTpsUpdate((tps) => {
    game.tps = tps
    loop.setEntityCnt(game.entities.size);
  });
  loop.start();

  // const frameRate = config.tickRate;
  // const frameDuration = 1000 / frameRate;

  // let lastFrameTime = performance.now();
  // let lastTpsCheck = 0;
  // let ticks = 0;

  // function gameLoop() {
  //   const now = performance.now();
  //   if (lastFrameTime + frameDuration < now) {
  //     const deltaTime = now - lastFrameTime;
  //     lastFrameTime = now;
  //     if (lastTpsCheck + 1000 < now) {
  //       game.tps = ticks;
  //       ticks = 0;
  //       lastTpsCheck = now;
  //     }
  //     ticks += 1;

  //     // console.time('tick');
  //     // server.tick(deltaTime / 1000);
  //       console.log(`TPS: ${game.tps}`, deltaTime);
  //     // console.timeEnd('tick');
  //   }

  //   // if we are more than 16 milliseconds away from the next tick
  //   if (now - lastFrameTime < frameDuration - 16) {
  //     setTimeout(gameLoop);
  //   } else {
  //     setImmediate(gameLoop);
  //   }
  // }

  // gameLoop();
}
