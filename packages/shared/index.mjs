import CoreTypes from './types.json' with { type: 'json' };

const Types = {
  ...CoreTypes,
  EntityTypes: CoreTypes.Entity,
  FlagTypes: CoreTypes.Flags,
  EvolutionTypes: CoreTypes.Evolution,
  UpgradeTypes: CoreTypes.Upgrade,
  BuffTypes: CoreTypes.Buff,
  BiomeTypes: CoreTypes.Biome,
  ShapeTypes: CoreTypes.Shape,
  InputTypes: CoreTypes.Input,
  DisconnectTypes: CoreTypes.DisconnectReason,
  CardTypes: CoreTypes.Card,
  CardCategoryTypes: CoreTypes.CardCategory,
};

export const Entity = Types.Entity;
export const Groups = Types.Groups;
export const AI = Types.AI;
export const Evolution = Types.Evolution;
export const Upgrade = Types.Upgrade;
export const Buff = Types.Buff;
export const Flags = Types.Flags;
export const Effect = Types.Effect;
export const Biome = Types.Biome;
export const Shape = Types.Shape;
export const Input = Types.Input;
export const DisconnectReason = Types.DisconnectReason;
export const Card = Types.Card;
export const CardCategory = Types.CardCategory;

export const EntityTypes = Types.EntityTypes;
export const FlagTypes = Types.FlagTypes;
export const EvolutionTypes = Types.EvolutionTypes;
export const UpgradeTypes = Types.UpgradeTypes;
export const BuffTypes = Types.BuffTypes;
export const BiomeTypes = Types.BiomeTypes;
export const ShapeTypes = Types.ShapeTypes;
export const InputTypes = Types.InputTypes;
export const DisconnectTypes = Types.DisconnectTypes;
export const CardTypes = Types.CardTypes;
export const CardCategoryTypes = Types.CardCategoryTypes;

export default Types;
