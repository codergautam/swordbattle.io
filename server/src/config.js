require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8000,
  useSSL: process.env.USE_SSL === 'TRUE',
  sslData: {
    key: process.env.SSL_KEY || '',
    cert: process.env.SSL_CERT || '',
  },
  debug: process.env.DEBUG === 'TRUE',
  serverSecret: process.env.SERVER_SECRET || 'server-secret',
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:8080',

  tickRate: 20,
  player: {
    speed: 700,
    radius: 100,
    maxHealth: 100,
    regeneration: 2,
    viewport: {
      width: 1500,
      height: 1500,
      zoom: 0.7,
      spectateZoom: 0.9,
    },
  },
  sword: {
    initialSwingDuration: 0.1,
    swingDurationIncrease: 1.05,
    maxSwingDuration: 3,
    damage: 10,
    knockback: 150,
  },
  saveGame: {
    playtime: 30, // in minutes
    coins: 20000,
    kills: 50,
  },
  world: {
    worldHeight: 30000,
    worldWidth: 30000,
  }
};
