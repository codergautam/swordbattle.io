const Types = require('../Types');

module.exports = {
  coinsCount: 0,
  aiPlayersCount: 20,
  biomes: [
    {
      type: Types.Biome.Safezone,
      pos: [0, 0],
      radius: 1000,
      objects: [
      ],
    },
    /* {
      type: Types.Biome.River,
      pos: [0, 0],
      radius: 2000,
    },

    {
      type: Types.Biome.River,
      pos: [-7500, -7500],
      points: [
        [1000, 0],
        [6750, 5750],
        [5750, 6750],
        [0, 1000],
        [0, 0],
      ],
      objects: [
      ],
    },

    {
      type: Types.Biome.River,
      pos: [7500, -7500],
      points: [
        [0, 1000],
        [-5750, 6750],
        [-6750, 5750],
        [-1000, 0],
        [0, 0],
      ],
      objects: [
      ],
    },
    {
      type: Types.Biome.River,
      pos: [0, 1750],
      points: [
        [-750, 0],
        [750, 0],
        [750, 5750],
        [-750, 5750],
      ],
      objects: [
      ],
    },
      */
    {
      type: Types.Biome.Earth,
      pos: [0, 0],
      points: [
        [7500, -7500],
        [7500, 7500],
        [-7500, 7500],
        [-7500, -7500],
      ],
      objects: [
        {
          type: Types.Entity.Bush,
          amount: 150,
          position: 'random',
          size: [100, 400],
        },
        /*
        {
          type: Types.Entity.House1,
          amount: 1,
          width: 2000,
          height: 1500,
          position: [-10000, 2000],
        },
        {
          type: Types.Entity.House1,
          amount: 1,
          position: [-12000, -2000],
        },
        */
        {
          type: Types.Entity.Pond,
          amount: 35,
          position: 'random',
          size: [400, 900],
        },
        {
          type: Types.Entity.Coin,
          amount: 500,
          position: 'random',
          respawnable: true,
        },
        {
          type: Types.Entity.Wolf,
          amount: 11,
          position: 'random',
          respawnable: true,
          size: [85, 105],
        },
        {
          type: Types.Entity.Cat,
          amount: 11,
          position: 'random',
          respawnable: true,
          size: [70, 90],
        },
        {
          type: Types.Entity.Bunny,
          amount: 21,
          position: 'random',
          respawnable: true,
          size: [40, 60],
        },
        {
          type: Types.Entity.Rock,
          amount: 40,
          position: 'random',
          size: [200, 400],
        },
        {
          type: Types.Entity.Moose,
          amount: 9,
          position: 'random',
          respawnable: true,
          size: [190, 250],
        },
        {
          type: Types.Entity.Chest,
          amount: 10,
          position: 'random',
          respawnable: true,
        }
        ],
      },
    ],
  };