import { EntityTypes } from '../Types';

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
  [EntityTypes.Yeti]: 11,

  [EntityTypes.Player]: 20,
  [EntityTypes.Sword]: 21,
  [EntityTypes.Fireball]: 22,
  [EntityTypes.Roku]: 23,
  
  [EntityTypes.Bush]: 30,
  [EntityTypes.IceMound]: 30,

  [EntityTypes.Chimera]: 31,
} as const;
