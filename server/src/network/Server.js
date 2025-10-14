const uws = require('uWebSockets.js');
const { v4: uuidv4 } = require('uuid');
const Protocol = require('./protocol/Protocol');
const Client = require('./Client');
const { getBannedIps } = require('../moderation');
const config = require('../config');
const axios = require('axios');

class Server {
  constructor(game) {
    this.game = game;
    this.clients = new Map();
    this.disconnectedClients = new Set();

    // track clients per ip to limit abuse
    this.ipClients = new Map();

    // configurable max connections per IP (fallback to 3)
    this.maxConnectionsPerIp = (config.server && config.server.maxConnectionsPerIp) ? config.server.maxConnectionsPerIp : 3;
  }

  get online() {
    return this.game.players.size;
  }

  async verifyRecaptcha(token, remoteip) {
    const secret = (config && config.recaptchaSecret) ? config.recaptchaSecret : process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
      // if no secret configured, skip verification (useful for dev)
      return true;
    }

    try {
      const resp = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret,
          response: token,
          remoteip,
        },
        timeout: 5000,
      });
      return !!(resp.data && resp.data.success);
    } catch (e) {
      console.error('[Server] recaptcha verify error', e?.message || e);
      return false;
    }
  }

  initialize(app) {
    app.ws('/*', {
      compression: uws.SHARED_COMPRESSOR,
      idleTimeout: 32,
      maxPayloadLength: 2048,
      upgrade: (res, req, context) => {

        res.upgrade({ id: uuidv4(), ip: req.getHeader('x-forwarded-for') || req.getHeader('cf-connecting-ip') || '' },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'), context,
        );
      },
      open: (socket) => {
        const client = new Client(this.game, socket);

        // quick safety: check banned list
        if (getBannedIps().includes(client.ip)) {
          try { client.socket.close(); } catch(e) {}
          console.log(`Client ${client.id} (${client.ip}) tried to connect but is banned.`);
          return;
        }

        // enforce per-ip connection limits to prevent bot floods/crashes
        const existing = this.ipClients.get(client.ip);
        const count = existing ? existing.size : 0;
        if (count >= this.maxConnectionsPerIp) {
          try {
            // politely close connection without creating a full client record
            client.socket.close();
          } catch(e) {}
          console.log(`Rejected connection ${client.id} from ${client.ip} — too many connections (${count} >= ${this.maxConnectionsPerIp}).`);
          return;
        }

        this.addClient(client);

        // keep newly added clients in non-ready state until they pass captcha (Client defaults to isReady=false)
        // a client must send a message with { captchaToken: '...' } as the first step
      },
      message: (socket, message) => {
        try {
          const client = this.clients.get(socket.id);
          if (!client) return; // ignore messages for unknown sockets

          const data = Protocol.decode(message);
          if (!data) return;

          // if the client hasn't completed captcha, expect a captchaToken field first
          if (!client.captchaVerified) {
            if (data.captchaToken) {
              // verify asynchronously and mark client ready on success
              this.verifyRecaptcha(data.captchaToken, client.ip).then((ok) => {
                if (ok) {
                  client.captchaVerified = true;
                  client.isReady = true;
                  console.log(`Client ${client.id} (${client.ip}) passed captcha.`);
                } else {
                  client.failedCaptchaAttempts = (client.failedCaptchaAttempts || 0) + 1;
                  console.log(`Client ${client.id} (${client.ip}) failed captcha attempt ${client.failedCaptchaAttempts}.`);
                  // after several failed attempts, drop connection to reduce load
                  if (client.failedCaptchaAttempts >= 3) {
                    try { client.socket.close(); } catch(e) {}
                    console.log(`Client ${client.id} (${client.ip}) disconnected after repeated captcha failures.`);
                    this.removeClient(client);
                  }
                }
              }).catch((e) => {
                console.error('[Server] captcha verification unexpected error', e);
              });
            } else {
              // ignore other messages until captcha passed
              return;
            }
            return;
          }

          if (data) {
            client.addMessage(data);
          }
        } catch (e) {
          // protect server from any decoding/runtime errors per-connection
          console.error('[Server] message handling error', e?.message || e);
        }
      },
      close: (socket, code) => {
        try {
          const client = this.clients.get(socket.id);
          if (!client) return;
          client.isSocketClosed = true;
          if (client.player && !client.player.removed) {
            client.player.remove()
          }
          this.removeClient(client);
          console.log(`Client disconnected with code ${code}.`);
        } catch (e) {
        }
      }
    });
  }

  getInformation() {
    return {
      online: this.online,
    };
  }

  addClient(client) {
    client.server = this;
    this.clients.set(client.id, client);

    // register in ipClients map
    if (!this.ipClients.has(client.ip)) {
      this.ipClients.set(client.ip, new Set());
    }
    this.ipClients.get(client.ip).add(client.id);
  }

  removeClient(client) {
    // mark for removal and clean up ip bookkeeping
    this.disconnectedClients.add(client);
    try {
      const set = this.ipClients.get(client.ip);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) this.ipClients.delete(client.ip);
      }
    } catch (e) {}
  }

  tick(dt) {
    for (const client of this.clients.values()) {
      if (!client.isReady) continue;

      client.update(dt);
      for (const message of client.messages) {
        this.game.processClientMessage(client, message);
      }
      client.messages = [];
    }

    this.game.tick(dt);

    for (const client of this.disconnectedClients) {
      this.game.removeClient(client);
      this.clients.delete(client.id);
      this.disconnectedClients.delete(client);
    }
    for (const client of this.clients.values()) {
      const payload = this.game.createPayload(client);
      client.send(payload);
    }

    this.game.endTick();
    this.clients.forEach(client => client.cleanup());

    // calculate top entity types
    // const topEntityTypes = new Map();
    // for (const entity of this.game.entities) {
    //   if (entity.removed) continue;
    //   if (!topEntityTypes.has(entity.type)) {
    //     topEntityTypes.set(entity.type, 0);
    //   }
    //   topEntityTypes.set(entity.type, topEntityTypes.get(entity.type) + 1);
    // }
    // console.log('top 5 entity types by count:', [...topEntityTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5), 'total:', this.game.entities.size);
  }
}

module.exports = Server;