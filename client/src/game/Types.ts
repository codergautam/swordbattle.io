export enum EntityTypes {
  Player = 1,
  Coin = 2,
  House1 = 3,
  MossyRock = 4,
  Pond = 5,
  Sword = 6,
  Bush = 7,
  IceMound = 8,
  IcePond = 9,
  IceSpike = 10,
  Rock = 11,
  LavaRock = 12,
  LavaPool = 13,
  Chest = 14,

  Wolf = 15,
  Bunny = 16,
  Moose = 17,
  Yeti = 18,
  Chimera = 19,
  Roku = 20,
  Cat = 23,

  Fireball = 21,
  Snowball = 22,
}

export enum FlagTypes {
  EnemyHit = 1,
  Damaged = 2,
  LavaDamaged = 3,
  GetCoin = 4,
  ChestHit = 5,
  ChestDestroy = 6,
  SwordSwing = 7,
  SwordThrow = 8,
  PlayerKill = 9,
  PlayerDeath = 10,
}

export enum EvolutionTypes {
  Default = 0,
  Tank = 1,
  Berserker = 2,
  Vampire = 3,
  Knight = 4,
  Samurai = 5,
  Rook = 6,
  Stalker = 7,
  Warrior = 8,
  Fisherman = 9,
}

export enum BuffTypes {
  Speed = 1,
  Size = 2,
  Health = 3,
  Regeneration = 4,
  Damage = 5,
}

export enum BiomeTypes {
  Fire = 1,
  Earth = 2,
  Ice = 3,
  River = 4,
  Safezone = 5,
}

export enum ShapeTypes {
  Point = 1,
  Circle = 2,
  Polygon = 3,
}

export enum InputTypes {
  Up = 1,
  Right = 2,
  Down = 3,
  Left = 4,
  SwordSwing = 5,
  SwordThrow = 6,
  Ability = 7,
}

export enum DisconnectTypes {
  Server = 1,
  Player = 2,
  Mob = 3,
}
