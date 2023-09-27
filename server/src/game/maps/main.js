const Types = require('../Types');

module.exports = {
  chestCount: 50,
  coinsCount: 100,
  biomes: [
    {
      type: 'safezone',
      pos: [0, 0],
      radius: 3000,
      objects: [
        {
          type: Types.Entity.Coin,
          amount: 30,
          position: 'random',
          respawnable: true,
        },
        {
          type: Types.Entity.Chest,
          amount: 1,
          position: 'random',
          respawnable: true,
        },
      ],
    },

    {
      type: 'river',
      pos: [0, 0],
      radius: 4000,
    },

    {
      type: 'river',
      pos: [-15000, -15000],
      points: [
        [2000, 0],
        [13500, 11500],
        [11500, 13500],
        [0, 2000],
        [0, 0],
      ],
      objects: [
        {
          type: Types.Entity.Rock,
          amount: 30,
          position: 'random',
          size: [200, 450],
        },
      ],
    },

    {
      type: 'river',
      pos: [15000, -15000],
      points: [
        [0, 2000],
        [-11500, 13500],
        [-13500, 11500],
        [-2000, 0],
        [0, 0],
      ],
      objects: [
        {
          type: Types.Entity.Rock,
          amount: 30,
          position: 'random',
          size: [200, 450],
        },
      ],
    },

    {
      type: 'river',
      pos: [0, 3500],
      points: [
        [-1500, 0],
        [1500, 0],
        [1500, 11500],
        [-1500, 11500],
      ],
      objects: [
        {
          type: Types.Entity.Rock,
          amount: 30,
          position: 'random',
          size: [200, 450],
        },
      ],
    },

    {
      type: 'ice',
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
          amount: 20,
          position: 'random',
          size: [300, 700],
        },
        {
          type: Types.Entity.IceSpike,
          amount: 20,
          position: 'random',
          size: [200, 600],
        },
        {
          type: Types.Entity.IcePond,
          amount: 1,
          position: [-2000, -8000],
          size: 5000,
        },
      ],
    },

    {
      type: 'earth',
      pos: [-15000, -13000],
      points: [
        [11500, 11500],
        [13500, 16500],
        [13500, 28000],
        [0, 28000],
        [0, 0],
      ],
      objects: [
        {
          type: Types.Entity.MossyRock,
          amount: 50,
          position: 'random',
          size: [250, 1250],
        },
        {
          type: Types.Entity.Bush,
          amount: 100,
          position: 'random',
          size: [100, 400],
        },
        {
          type: Types.Entity.Pond,
          amount: 1,
          position: [-10000, 5000],
          size: 5000,
        },
        {
          type: Types.Entity.Coin,
          amount: 300,
          position: 'random',
          respawnable: true,
        },
      ],
    },

    {
      type: 'fire',
      pos: [15000, -13000],
      points: [
        [0, 0],
        [0, 28000],
        [-13500, 28000],
        [-13500, 16500],
        [-11500, 11500],
      ],
      objects: [
        {
          type: Types.Entity.LavaRock,
          amount: 30,
          position: 'random',
          size: [150, 650],
        },
        {
          type: Types.Entity.LavaPool,
          amount: 30,
          position: 'random',
          size: [200, 700],
        },
        {
          type: Types.Entity.LavaPool,
          amount: 1,
          position: [9000, 4000],
          size: 5000,
        },
      ],
    },
  ],
};
