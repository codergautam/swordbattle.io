require('dotenv').config();
const path = require('path');
const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid')

const Game = require('./game/Game');
const { Server, Client } = require('./game/Server');
const { pack, unpack } = require('msgpackr');
const config = require('./config');

let app;
if (process.env.USE_SSL === 'TRUE') {
  app = uws.SSLApp({
    key_file_name: path.resolve(__dirname, 'ssl/key.pem'),
    cert_file_name: path.resolve(__dirname, 'ssl/cert.pem'),
  });
} else {
  app = uws.App();
}

const port = process.env.PORT || 8000;
app.listen('0.0.0.0', port, (ws) => {
  if (ws) {
    start();
    console.log(`Game started on port ${port}.`);
  }
});

function start() {
  const clients = new Map();
  const game = new Game();
  game.initialize();
  const server = new Server(game);

  app.ws('/*', {
    compression: uws.SHARED_COMPRESSOR,
    idleTimeout: 32,
    open: (socket) => {
      socket.id = uuidv4();
      console.log(`Client ${socket.id} connected.`);
      const client = new Client(socket);
      clients.set(socket.id, client);
    },
    message: (socket, message) => {
      const client = clients.get(socket.id);
      const payload = unpack(message);

      if (payload.isPing) {
        const pong = pack({ isPong: true });
        socket.send(pong, { binary: true, compress: true });
      } else {
        if (!client.server) {
          server.addClient(client);
        }
        client.addMessage(payload);
      }
    },
    close: (socket, code) => {
      const client = clients.get(socket.id);
      client.isSocketClosed = true;
      if (client && client.server) {
        client.server.removeClient(client);
      }
      clients.delete(socket.id);
      console.log(`Client disconnected with code ${code}.`);
    }
  });

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
