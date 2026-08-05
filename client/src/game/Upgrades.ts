import { UpgradeTypes, EvolutionTypes } from './Types';

const icon = '\u{1F527}';

export const Upgrades: Record<number, [string, string, string]> = {
  [UpgradeTypes.Toughened]: ['Defense', 'Skip selecting an evolution, and instead gain more health and resistance.', icon],
  [UpgradeTypes.Footwork]: ['Offense', 'Skip selecting an evolution, and instead gain a speed boost after hitting players.', icon],
  [UpgradeTypes.ClasslessAbility]: ['Ability', 'Grants a short ability that speeds your swing and boosts regen.', icon],
  [UpgradeTypes.Handling]: ['Handling', 'Increase your move speed and health while your sword is being thrown.', icon],
  [UpgradeTypes.Lavacopy]: ['Burner', 'Surround yourself with a small lava field that burns nearby enemies.', icon],
  [UpgradeTypes.Pacifist]: ['Pacifist', 'Deal and take half damage against other players.', icon],
  [UpgradeTypes.Collector]: ['Collector', '+50% coins from all sources.', icon],
  [UpgradeTypes.Battleswords]: ['Daggers', 'Wield two swords at once! Hold to auto-attack. Throws both swords at once.', icon],

  [UpgradeTypes.Momentum]: ['Momentum', 'Hitting players gives a small damage boost for 2s.', icon],
  [UpgradeTypes.Gale]: ['Gale', 'Gain a burst of movement speed after 2s without being hit.', icon],
  [UpgradeTypes.Lunge]: ['Lance', 'Throwing your sword does a small dash forward.', icon],
  [UpgradeTypes.Riposte]: ['Riposte', 'Hitting back soon after being hit deals bonus damage and knockback.', icon],
  [UpgradeTypes.Striketwice]: ['Reprise', 'Every swing quickly strikes twice.', icon],
  [UpgradeTypes.Twothrow]: ['Javelins', 'Throw an extra sword with each throw.', icon],

  [UpgradeTypes.Overrun]: ['Force', 'Walking into an enemy shoves them away.', icon],
  [UpgradeTypes.Charging]: ['Charging', 'Moving in one direction builds up a gradual speed boost.', icon],
  [UpgradeTypes.Recovery]: ['Recovery', 'Standing still greatly boosts your regeneration.', icon],
  [UpgradeTypes.Blocker]: ['Blocker', 'Blocks thrown swords and their damage.', icon],
  [UpgradeTypes.Spikes]: ['Spikes', 'Reflect half the damage attackers deal back at them. Doesn\'t cancel enemy regen', icon],
  [UpgradeTypes.Kinesis]: ['Kinesis', 'Enemies that hit you get knocked back by their own force.', icon],

  [UpgradeTypes.Adapting]: ['Adapting', 'Below half HP, deal less damage, but regen faster and partially block damage.', icon],
  [UpgradeTypes.Normalize]: ['Normalize', 'Deal more damage to enemies with higher health than you, and less damage to enemies with lower health.', icon],
  [UpgradeTypes.Transfer]: ['Transfer', 'Trade movement speed for much faster swings.', icon],
  [UpgradeTypes.Haste]: ['Haste', 'Hitting enemy players gives a 10% speed boost for 3s. Stacks up to 3 times!', icon],

  [UpgradeTypes.Sanguine]: ['Sanguine', 'Hitting mobs gives lifesteal while out of player combat.', icon],
  [UpgradeTypes.Lifetaker]: ['Lifetaker', 'Hitting players under half HP grants increased lifesteal.', icon],
  [UpgradeTypes.Deathsender]: ['Deathsend', 'Replace lifesteal with bleeding (enemies that hit you take damage too). Does not cancel enemy regen', icon],
  [UpgradeTypes.Vitality]: ['Vitality', 'Landing hits instantly starts your regeneration.', icon],

  [UpgradeTypes.Ramming]: ['Ramming', 'Dashing into an enemy deals knockback and damage.', icon],
  [UpgradeTypes.Teleport]: ['Teleport', 'Your dashes become instant teleports, ignoring collision.', icon],
  [UpgradeTypes.KingRook]: ['King Rook', 'Removes the restriction on diagonal movement.', icon],
  [UpgradeTypes.Castle]: ['Castle', 'Store up to two ability charges.', icon],

  [UpgradeTypes.Iaido]: ['Iaido', 'Avoiding swings for 1.5s makes your next swing more powerful.', icon],
  [UpgradeTypes.Meditation]: ['Meditation', 'Your regeneration ramps up the longer you avoid damage.', icon],
  [UpgradeTypes.Katana]: ['Katana', 'Swing much faster, but both your sword and defense become weaker.', icon],
  [UpgradeTypes.Kunais]: ['Kunais', 'Throwing releases three small swords in a spread.', icon],

  [UpgradeTypes.ArcherCombo]: ['Combo', "Hitting a throw boosts your next throw's damage and charge speed.", icon],
  [UpgradeTypes.Homing]: ['Homing', 'Throws home toward nearby enemies and fly faster.', icon],

  [UpgradeTypes.Deflect]: ['Deflect', 'Reflect half the knockback from attackers back at them.', icon],
  [UpgradeTypes.Pacing]: ['Pacing', 'Become smaller but move much faster.', icon],

  [UpgradeTypes.TwoBoost]: ['Two-Boost', 'Your boost also triggers on hitting enemies, not just from being hit.', icon],
  [UpgradeTypes.Flighter]: ['Flighter', 'Your boost grants defensive stats instead of offense.', icon],

  [UpgradeTypes.Slam]: ['Slam', 'Ability swings deal massive knockback.', icon],
  [UpgradeTypes.Fortress]: ['Fortress', 'Avoid all knockback while standing still.', icon],

  [UpgradeTypes.Blindness]: ['Blindness', 'Hitting enemies obscures their vision.', icon],
  [UpgradeTypes.Vision]: ['Vision', 'See much farther while your ability is active.', icon],

  [UpgradeTypes.Sardines]: ['Sardines', 'Getting attacked spawns angry fish to hunt enemies down.', icon],
  [UpgradeTypes.Brace]: ['Brace', 'Take 75% less damage for 2s after reeling in an enemy.', icon],

  [UpgradeTypes.Hunter]: ['Hunter', 'Deal double damage to mobs.', icon],
  [UpgradeTypes.Offense]: ['Offense', 'After being attacked, gain stats to help fight back.', icon],
};

export const UpgradeOwners: Record<number, number> = {
  [UpgradeTypes.Toughened]: EvolutionTypes.Default, [UpgradeTypes.Footwork]: EvolutionTypes.Default,
  [UpgradeTypes.ClasslessAbility]: EvolutionTypes.Default, [UpgradeTypes.Handling]: EvolutionTypes.Default,
  [UpgradeTypes.Lavacopy]: EvolutionTypes.Default, [UpgradeTypes.Pacifist]: EvolutionTypes.Default,
  [UpgradeTypes.Collector]: EvolutionTypes.Default, [UpgradeTypes.Battleswords]: EvolutionTypes.Default,
  [UpgradeTypes.Momentum]: EvolutionTypes.Knight, [UpgradeTypes.Gale]: EvolutionTypes.Knight,
  [UpgradeTypes.Lunge]: EvolutionTypes.Knight, [UpgradeTypes.Riposte]: EvolutionTypes.Knight,
  [UpgradeTypes.Striketwice]: EvolutionTypes.Knight, [UpgradeTypes.Twothrow]: EvolutionTypes.Knight,
  [UpgradeTypes.Overrun]: EvolutionTypes.Tank, [UpgradeTypes.Charging]: EvolutionTypes.Tank,
  [UpgradeTypes.Recovery]: EvolutionTypes.Tank, [UpgradeTypes.Blocker]: EvolutionTypes.Tank,
  [UpgradeTypes.Spikes]: EvolutionTypes.Tank, [UpgradeTypes.Kinesis]: EvolutionTypes.Tank,
  [UpgradeTypes.Adapting]: EvolutionTypes.Berserker, [UpgradeTypes.Normalize]: EvolutionTypes.Berserker,
  [UpgradeTypes.Transfer]: EvolutionTypes.Berserker, [UpgradeTypes.Haste]: EvolutionTypes.Berserker,
  [UpgradeTypes.Sanguine]: EvolutionTypes.Vampire, [UpgradeTypes.Lifetaker]: EvolutionTypes.Vampire,
  [UpgradeTypes.Deathsender]: EvolutionTypes.Vampire, [UpgradeTypes.Vitality]: EvolutionTypes.Vampire,
  [UpgradeTypes.Ramming]: EvolutionTypes.Rook, [UpgradeTypes.Teleport]: EvolutionTypes.Rook,
  [UpgradeTypes.KingRook]: EvolutionTypes.Rook, [UpgradeTypes.Castle]: EvolutionTypes.Rook,
  [UpgradeTypes.Iaido]: EvolutionTypes.Samurai, [UpgradeTypes.Meditation]: EvolutionTypes.Samurai,
  [UpgradeTypes.Katana]: EvolutionTypes.Samurai, [UpgradeTypes.Kunais]: EvolutionTypes.Samurai,
  [UpgradeTypes.ArcherCombo]: EvolutionTypes.Archer, [UpgradeTypes.Homing]: EvolutionTypes.Archer,
  [UpgradeTypes.Deflect]: EvolutionTypes.Warrior, [UpgradeTypes.Pacing]: EvolutionTypes.Warrior,
  [UpgradeTypes.TwoBoost]: EvolutionTypes.Fighter, [UpgradeTypes.Flighter]: EvolutionTypes.Fighter,
  [UpgradeTypes.Slam]: EvolutionTypes.Defender, [UpgradeTypes.Fortress]: EvolutionTypes.Defender,
  [UpgradeTypes.Blindness]: EvolutionTypes.Stalker, [UpgradeTypes.Vision]: EvolutionTypes.Stalker,
  [UpgradeTypes.Sardines]: EvolutionTypes.Fisherman, [UpgradeTypes.Brace]: EvolutionTypes.Fisherman,
  [UpgradeTypes.Hunter]: EvolutionTypes.Lumberjack, [UpgradeTypes.Offense]: EvolutionTypes.Lumberjack,
};
