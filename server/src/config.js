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
    swingDurationIncrease: 0.02,
    maxSwingDuration: 0.5,
    damage: 10,
    knockback: 250,
  },
  saveGame: {
    playtime: 30, // in minutes
    coins: 20000,
    kills: 50,
  },
};
