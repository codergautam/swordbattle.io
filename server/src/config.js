require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8000,
  useSSL: process.env.USE_SSL === 'TRUE',
  debug: process.env.DEBUG === 'TRUE',
  serverSecret: process.env.SERVER_SECRET || 'server-secret',
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:8080',

  tickRate: 30,
  player: {
    speed: 1000,
    radius: 100,
    maxHealth: 100,
    regeneration: 2,
    viewport: {
      width: 1500,
      height: 1500,
      zoom: 0.7,
    },
  },
  sword: {
    swingDuration: 0.1,
    damage: 5,
    knockback: 50,
  },
  saveGame: {
    playtime: 30, // in minutes
    coins: 20000,
    kills: 50,
  },
  doubleRiverCollideFix: true // When enabled, only sends player collision to one river (when overlapping multiple)
};
