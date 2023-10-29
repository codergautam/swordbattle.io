const path = require('path');
const uws = require('uWebSockets.js');

const Game = require('./game/Game');
const Server = require('./network/Server');
const config = require('./config');

let app;
if (config.useSSL) {
  app = uws.SSLApp({
    key_file_name: path.resolve(__dirname, 'ssl/key.pem'),
    cert_file_name: path.resolve(__dirname, 'ssl/cert.pem'),
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

function start() {
  const game = new Game();
  game.initialize();
  const server = new Server(game);
  server.initialize(app);

  // Gameloop
  const frameRate = config.tickRate;
  const frameDuration = 1000 / frameRate;
  
  let lastFrameTime = performance.now();
  let lastTpsCheck = 0;
  let ticks = 0;
  
  function gameLoop() {
    const now = performance.now();
    if (lastFrameTime + frameDuration < now) {
      const deltaTime = now - lastFrameTime;
      lastFrameTime = now;
      if (lastTpsCheck + 1000 < now) {
        game.tps = ticks;
        ticks = 0;
        lastTpsCheck = now;
      }
      ticks += 1;

      server.tick(deltaTime / 1000);
    }

    // if we are more than 16 milliseconds away from the next tick
    if (now - lastFrameTime < frameDuration - 16) {
      setTimeout(gameLoop);
    } else {
      setImmediate(gameLoop);
    }
  }
  
  gameLoop();
}
