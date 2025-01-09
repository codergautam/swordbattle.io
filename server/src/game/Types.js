const Entity = {
  Player: 1,
  Coin: 2,
  House1: 3,
  MossyRock: 4,
  Pond: 5,
  Sword: 6,
  Bush: 7,
  IceMound: 8,
  IcePond: 9,
  IceSpike: 10,
  Rock: 11,
  LavaRock: 12,
  LavaPool: 13,
  Chest: 14,

  Wolf: 15,
  Bunny: 16,
  Moose: 17,
  Yeti: 18,
  Chimera: 19,
  Roku: 20,
  Cat: 23,
  Santa: 24,
  Fox: 25,

  Fireball: 21,
  Snowball: 22,
};

const Mobs = [
  Entity.Wolf, Entity.Fox, Entity.Bunny, Entity.Moose, Entity.Yeti, Entity.Santa, Entity.Chimera, Entity.Roku, Entity.Cat,
];
const Groups = {
  Obstacles: [
    Entity.Player, Entity.Sword, Entity.Coin,
    Entity.IceSpike, Entity.Rock, Entity.MossyRock, Entity.LavaRock,
    Entity.Fireball, Entity.Snowball, Entity.Chest,
    ...Mobs,
  ],
  Mobs,
};

module.exports = {
  Entity,
  Groups,
  AI: {
    Player: 1,
  },
  Evolution: {
    Basic: 0,
    Tank: 1,
    Berserker: 2,
    Vampire: 3,
    Knight: 4,
    Samurai: 5,
    Rook: 6,
    Stalker: 7,
  },
  Buff: {
    Speed: 1,
    Size: 2,
    Health: 3,
    Regeneration: 4,
    Damage: 5,
  },
  Flags: {
    EnemyHit: 1,
    Damaged: 2,
    LavaDamaged: 3,
    GetCoin: 4,
    ChestHit: 5,
    ChestDestroy: 6,
    SwordSwing: 7,
    SwordThrow: 8,
    PlayerKill: 9,
    PlayerDeath: 10,
  },
  Effect: {
    Custom: 1,
    Speed: 2,
    Slipping: 3,
    Burning: 4,
  },
  Biome: {
    Fire: 1,
    Earth: 2,
    Ice: 3,
    River: 4,
    Safezone: 5,
  },
  Shape: {
    Point: 1,
    Circle: 2,
    Polygon: 3,
  },
  Input: {
    Up: 1,
    Right: 2,
    Down: 3,
    Left: 4,
    SwordSwing: 5,
    SwordThrow: 6,
    Ability: 7,
  },
  DisconnectReason: {
    Server: 1,
    Player: 2,
    Mob: 3
  }
}
