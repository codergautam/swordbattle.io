const Types = require('../Types');

module.exports = {
  coinsCount: 0,
  aiPlayersCount: 20,
  biomes: [
    {
      type: Types.Biome.Safezone,
      pos: [0, 0],
      radius: 2000,
      objects: [
      ],
    },
    {
      type: Types.Biome.River,
      pos: [0, 0],
      radius: 4000,
    },

    {
      type: Types.Biome.River,
      pos: [-15000, -15000],
      points: [
        [2000, 0],
        [13500, 11500],
        [11500, 13500],
        [0, 2000],
        [0, 0],
      ],
      objects: [
      ],
    },

    {
      type: Types.Biome.River,
      pos: [15000, -15000],
      points: [
        [0, 2000],
        [-11500, 13500],
        [-13500, 11500],
        [-2000, 0],
        [0, 0],
      ],
      objects: [
      ],
    },

    {
      type: Types.Biome.River,
      pos: [15000, 15000],
      points: [
        [-2000, 0],
        [-13500, -11500],
        [-11500, -13500],
        [0, -2000],
        [0, 0],
      ],
      objects: [
      ],
    },

    {
      type: Types.Biome.River,
      pos: [-15000, 15000],
      points: [
        [0, -2000],
        [11500, -13500],
        [13500, -11500],
        [2000, 0],
        [0, 0],
      ],
      objects: [
      ],
    },

    {
      type: Types.Biome.Ice,
      pos: [-13000, -15000],
      points: [
        [26000, 0],
        [14500, 11500],
        [11500, 11500],
        [0, 0],
      ],
      objects: [
        {
          type: Types.Entity.IceMound,
          amount: 40,
          position: 'random',
          size: [300, 700],
        },
        {
          type: Types.Entity.IceSpike,
          amount: 25,
          position: 'random',
          size: [200, 600],
        },
        {
          type: Types.Entity.IcePond,
          amount: 13,
          position: 'random',
          size: [600, 900],
        },
        {
          type: Types.Entity.IcePond,
          amount: 1,
          position: [0, -10000],
          size: 3000,
        },
        /*
        {
          type: Types.Entity.House1,
          amount: 1,
          width: 2500,
          height: 1400,
          position: [-1000, -13000],
        },
        */
        {
          type: Types.Entity.Yeti,
          amount: 6,
          position: 'random',
          respawnable: true,
          size: [80, 110],
        },
        {
          type: Types.Entity.Yeti,
          amount: 1,
          position: 'random',
          respawnable: true,
          respawnTime: [60 * 15, 60 * 20], // 10-30 minutes
          size: [300, 400],
          health: 750,
          isBoss: true,
          damage: 4,
          speed: 20,
        },
        {
          type: Types.Entity.Chest,
          amount: 20,
          position: 'random',
          respawnable: true,
        },
        {
          type: Types.Entity.Coin,
          amount: 500,
          position: 'random',
          respawnable: true,
        },
        {
          type: Types.Entity.Rock,
          amount: 10,
          position: 'random',
          size: [200, 400],
        },
      ],
    },

    {
      type: Types.Biome.Earth,
      pos: [-15000, -13000],
      points: [
        [11500, 11500],
        [12500, 13500],
        [0, 26000],
        [0, 0],
      ],
      objects: [
        {
          type: Types.Entity.Bush,
          amount: 160,
          position: 'random',
          size: [100, 400],
        },
        {
          type: Types.Entity.Pond,
          amount: 1,
          position: [-10000, -500],
          size: 4500,
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
          amount: 20,
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
          amount: 9,
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
          amount: 18,
          position: 'random',
          respawnable: true,
          size: [40, 60],
        },
        {
          type: Types.Entity.Rock,
          amount: 20,
          position: 'random',
          size: [200, 400],
        },
        {
          type: Types.Entity.Moose,
          amount: 5,
          position: 'random',
          respawnable: true,
          size: [190, 250],
        },
        {
          type: Types.Entity.Chest,
          amount: 18,
          position: 'random',
          respawnable: true,
        },
      ],
    },

    {
      type: Types.Biome.Fire,
      pos: [15000, -13000],
      points: [
        [0, 0],
        [0, 26000],
        [-12500, 13500],
        [-11500, 11500],
      ],
      objects: [
        {
          type: Types.Entity.LavaPool,
          amount: 30,
          position: 'random',
          size: [200, 700],
        },
        {
          type: Types.Entity.LavaPool,
          amount: 1,
          position: [10000, -500],
          size: 5000,
        },
        {
          type: Types.Entity.Chimera,
          amount: 7,
          position: 'random',
          respawnable: true,
          size: [70, 120],
        },
        {
          type: Types.Entity.Roku,
          amount: 1,
          position: 'random',
          respawnable: true,
          respawnTime: [60 * 10, 60 * 15],
          size: [500, 600],
          health: 1000,
          isBoss: true,
          damage: 20,
          rotationSpeed: 5,
          fireballSize: 100,
        },
        {
          type: Types.Entity.Rock,
          amount: 10,
          position: 'random',
          size: [200, 400],
        },
        {
          type: Types.Entity.Chest,
          amount: 20,
          position: 'random',
          respawnable: true,
        },
        {
          type: Types.Entity.Coin,
          amount: 500,
          position: 'random',
          respawnable: true,
        }
      ],
    },
    {
      type: Types.Biome.Desert,
      pos: [13000, 15000],
      points: [
        [-26000, 0],
        [-14500, -11500],
        [-11500, -11500],
        [0, 0],
      ],
    },
  ],
};
