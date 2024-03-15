import { EntityTypes } from '../Types';
import { BaseEntity } from './BaseEntity';
import Chest from './Chest';
import Coin from './Coin';
import Fireball from './Fireball';
import Player from './Player';
import Snowball from './Snowball';
import Sword from './Sword';
import Bush from './mapObjects/Bush';
import House1 from './mapObjects/House1';
import IceMound from './mapObjects/IceMound';
import IcePond from './mapObjects/IcePond';
import IceSpike from './mapObjects/IceSpike';
import LavaPool from './mapObjects/LavaPool';
import LavaRock from './mapObjects/LavaRock';
import MossyRock from './mapObjects/MossyRock';
import Pond from './mapObjects/Pond';
import Rock from './mapObjects/Rock';
import BunnyMob from './mobs/Bunny';
import ChimeraMob from './mobs/Chimera';
import MooseMob from './mobs/Moose';
import RokuMob from './mobs/Roku';
import WolfMob from './mobs/Wolf';
import YetiMob from './mobs/Yeti';

export const EntityDepth: Record<any, number> = {
  [EntityTypes.Pond]: 1,
  [EntityTypes.LavaPool]: 2,
  [EntityTypes.IcePond]: 3,
  [EntityTypes.IceSpike]: 4,
  [EntityTypes.Coin]: 5,
  [EntityTypes.Chest]: 6,

  [EntityTypes.Rock]: 10,
  [EntityTypes.LavaRock]: 10,
  [EntityTypes.MossyRock]: 10,

  [EntityTypes.Wolf]: 11,
  [EntityTypes.Bunny]: 11,
  [EntityTypes.Moose]: 11,

  [EntityTypes.Player]: 20,
  [EntityTypes.Sword]: 21,
  [EntityTypes.Fireball]: 22,
  [EntityTypes.Snowball]: 22,
  [EntityTypes.Roku]: 23,
  [EntityTypes.Yeti]: 23,

  [EntityTypes.Bush]: 30,
  [EntityTypes.IceMound]: 30,

  [EntityTypes.Chimera]: 31,
} as const;

export const GetEntityClass = (type: EntityTypes): typeof BaseEntity => {
  switch (type) {
    case EntityTypes.Player: return Player;
    case EntityTypes.Coin: return Coin;
    case EntityTypes.House1: return House1;
    case EntityTypes.Chest: return Chest;
    case EntityTypes.Sword: return Sword;

    case EntityTypes.Wolf: return WolfMob;
    case EntityTypes.Bunny: return BunnyMob;
    case EntityTypes.Moose: return MooseMob;
    case EntityTypes.Chimera: return ChimeraMob;
    case EntityTypes.Yeti: return YetiMob;
    case EntityTypes.Roku: return RokuMob;
    case EntityTypes.Fireball: return Fireball;
    case EntityTypes.Snowball: return Snowball;

    case EntityTypes.Rock: return Rock;
    case EntityTypes.Bush: return Bush;
    case EntityTypes.Pond: return Pond;
    case EntityTypes.MossyRock: return MossyRock;
    case EntityTypes.IcePond: return IcePond;
    case EntityTypes.IceMound: return IceMound;
    case EntityTypes.IceSpike: return IceSpike;
    case EntityTypes.LavaRock: return LavaRock;
    case EntityTypes.LavaPool: return LavaPool;

    default:
      console.trace('Unknown entity type: ', type);
      return BaseEntity;
  }
}
