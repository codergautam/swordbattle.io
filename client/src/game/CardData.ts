export interface MinorCardInfo {
  name: string;
  category: string;
  color: number;
  values: number[];  // percentage values (e.g. 20 = 20%)
  max: number;
  description: string;
  icon: string;      // texture key for upgrade image
}

export interface MajorCardInfo {
  name: string;
  category: string;
  color: number;
  positiveText: string;
  negativeText: string;
  icon: string;      // texture key for upgrade image
}

export const MinorCardData: Record<number, MinorCardInfo> = {
  1:  { name: 'Sharp Stabs',      category: 'Offensive', color: 0xe83a3a, values: [20, 16, 13, 10, 8],  max: 5, description: 'Sword damage',       icon: 'card_damage' },
  2:  { name: 'Quick Swing',      category: 'Offensive', color: 0x5b9ee6, values: [12, 10, 8, 6, 5],    max: 5, description: 'Attack speed',       icon: 'card_attackspeed' },
  3:  { name: 'Heavy Hits',       category: 'Offensive', color: 0xd95530, values: [15, 12, 10, 8, 6],   max: 5, description: 'Knockback dealt',    icon: 'card_knockback' },
  4:  { name: 'Sharpshooter',     category: 'Offensive', color: 0x2d8c4e, values: [18, 14, 11, 9, 7],   max: 5, description: 'Throw damage',       icon: 'card_throwdamage' },
  5:  { name: 'Defense Training', category: 'Defensive', color: 0xb050d0, values: [18, 14, 11, 9, 7],   max: 5, description: 'Max health',         icon: 'card_maxhealth' },
  6:  { name: 'Regenerate',       category: 'Defensive', color: 0x55e855, values: [22, 18, 14, 11, 8],  max: 5, description: 'Regen rate',         icon: 'card_regenrate' },
  7:  { name: 'Fast Heal',        category: 'Defensive', color: 0x40c8b8, values: [15, 12, 10, 8, 6],   max: 5, description: 'Regen cooldown',     icon: 'card_regencooldown' },
  8:  { name: 'Weighted Player',  category: 'Defensive', color: 0x3366ee, values: [15, 12, 10, 8, 6],   max: 5, description: 'Knockback resist',   icon: 'card_knockbackresist' },
  9:  { name: 'Swiftness',        category: 'Utility',   color: 0x2850e0, values: [10, 8, 7, 5, 4],     max: 5, description: 'Move speed',         icon: 'card_movespeed' },
  10: { name: 'Coin Magnet',      category: 'Utility',   color: 0xe04040, values: [25, 20, 15],          max: 3, description: 'Coin collection',    icon: 'card_coinmagnet' },
  11: { name: 'Sniper Vision',    category: 'Utility',   color: 0xe0e0e0, values: [12, 10, 8],           max: 3, description: 'View distance',      icon: 'card_viewdistance' },
  12: { name: 'Throwpower',       category: 'Utility',   color: 0x60d8a0, values: [12, 10, 8, 6, 5],    max: 5, description: 'Throw cooldown',     icon: 'card_throwcooldown' },
  13: { name: 'Size Scale',       category: 'Utility',   color: 0xc8c070, values: [5, 4, 3, 2, 2],      max: 5, description: 'Player size',        icon: 'card_playersize' },
};

export const MajorCardData: Record<number, MajorCardInfo> = {
  // Swordsmanship
  101: { name: 'Cleave',              category: 'Swordsmanship', color: 0xffd700, positiveText: '+50% swing arc',                    negativeText: '-25% knockback dealt',            icon: 'card_cleave' },
  102: { name: 'Double Hit',          category: 'Swordsmanship', color: 0xffd700, positiveText: 'Deal 40% damage on swing release',  negativeText: '-30% damage if only release hits', icon: 'card_doublehit' },
  103: { name: 'Aggression',          category: 'Swordsmanship', color: 0xffd700, positiveText: '+50% damage for 2s after being hit',  negativeText: '-25% damage for 1s after boost',  icon: 'card_aggression' },

  // Throwing
  104: { name: 'Twin Throw',          category: 'Throwing',      color: 0xffd700, positiveText: 'Throw 2 swords',                   negativeText: '-30% throw dmg, +25% cooldown',   icon: 'card_twinthrow' },
  105: { name: 'Boomerang',           category: 'Throwing',      color: 0xffd700, positiveText: 'Sword returns after throw',         negativeText: '-30% range, -35% damage',          icon: 'card_boomerang' },
  106: { name: 'Spare Sword',         category: 'Throwing',      color: 0xffd700, positiveText: 'Throw a copy, keep your sword',    negativeText: '-25% throw speed, -30% throw dmg', icon: 'card_sparesword' },

  // Predator
  107: { name: 'Finisher',            category: 'Predator',      color: 0xffd700, positiveText: '+25% vs under 40% HP targets',     negativeText: '-15% vs over 80% HP targets',     icon: 'card_finisher' },
  108: { name: 'Regensteal',          category: 'Predator',      color: 0xffd700, positiveText: 'Hits reduce regen wait by 0.5s',   negativeText: '-25% regen rate',                  icon: 'card_regensteal' },
  109: { name: 'Boxer',               category: 'Predator',      color: 0xffd700, positiveText: '-50% throw dmg/knockback taken',   negativeText: 'Also affects own throws',          icon: 'card_boxer' },

  // Stand Ground
  110: { name: 'Tracking',            category: 'Stand Ground',  color: 0xffd700, positiveText: 'Hit by faster player: match their speed (2s)', negativeText: 'Faster than attacker: slow to their speed (2s)', icon: 'card_tracking' },
  111: { name: 'Ensnare',             category: 'Stand Ground',  color: 0xffd700, positiveText: 'Hit enemies: -7% speed (3x, 3s)',  negativeText: '-10% speed permanently',            icon: 'card_ensnare' },
  112: { name: 'Acceleration',        category: 'Stand Ground',  color: 0xffd700, positiveText: '+5% speed per hit dealt (2s)',     negativeText: '-5% speed per hit taken (2s)',      icon: 'card_acceleration' },

  // Vampiric
  113: { name: 'Vampire Aspect',      category: 'Vampiric',      color: 0xffd700, positiveText: 'Heal 10% of melee damage dealt',  negativeText: '-8% max HP',                       icon: 'card_vampireaspect' },
  114: { name: 'Soul Harvest',        category: 'Vampiric',      color: 0xffd700, positiveText: 'Kill = full heal',                 negativeText: '-15% regen rate',                  icon: 'card_soulharvest' },
  115: { name: 'Blood Frenzy',        category: 'Vampiric',      color: 0xffd700, positiveText: 'Under 35% HP: +25% dmg, +5% speed', negativeText: 'Over 80% HP: -10% damage',      icon: 'card_bloodfrenzy' },

  // Fortification
  116: { name: 'Rejuvenation',        category: 'Fortification', color: 0xffd700, positiveText: 'Regen ramps over time (up to 3x)',negativeText: '-25% base regen',                  icon: 'card_rejuvenation' },
  117: { name: 'Adaptive Armor',      category: 'Fortification', color: 0xffd700, positiveText: 'Taking 3 hits in 5s = 30% defense for 4s', negativeText: 'During defense: -10% damage dealt', icon: 'card_adaptivearmor' },
  118: { name: 'Disengage',           category: 'Fortification', color: 0xffd700, positiveText: 'After getting hit: +25% speed for 2s', negativeText: '-35% damage while speed boosted', icon: 'card_disengage' },

  // Prospector
  119: { name: 'Midas Touch',         category: 'Prospector',    color: 0xffd700, positiveText: '+35% gold from all sources',       negativeText: '+25% damage taken',                icon: 'card_midastouch' },
  120: { name: 'Chest Keys',          category: 'Prospector',    color: 0xffd700, positiveText: 'Deal double damage to chests',     negativeText: 'Chests drop half coins',           icon: 'card_chestkeys' },
  121: { name: 'Scavenger',           category: 'Prospector',    color: 0xffd700, positiveText: 'Ground-spawned coins value 1 -> 50', negativeText: '-10% chest coins',              icon: 'card_scavenger' },

  // Pacifism
  122: { name: 'Ceasefire',           category: 'Pacifism',      color: 0xffd700, positiveText: 'Nearby players deal -25% damage',  negativeText: 'Affects your damage too',          icon: 'card_ceasefire' },
  123: { name: 'PvE Master',          category: 'Pacifism',      color: 0xffd700, positiveText: '+25% chest damage',                negativeText: '-50% coins from player kills',     icon: 'card_pvemaster' },
  124: { name: 'Tank Shell',          category: 'Pacifism',      color: 0xffd700, positiveText: '+25% damage reduction',            negativeText: '-50% knockback dealt',             icon: 'card_tankshell' },

  // Beast Slayer
  125: { name: 'Hunting Instinct',    category: 'Beast Slayer',  color: 0xffd700, positiveText: '+40% damage vs mobs, +20% mob coins', negativeText: '-25% damage vs players',       icon: 'card_huntinginstinct' },
  126: { name: 'Butcherer',           category: 'Beast Slayer',  color: 0xffd700, positiveText: 'Mobs don\'t get angry when hit',   negativeText: '-50% knockback vs mobs',           icon: 'card_butcherer' },
  127: { name: 'Boss Hunter',         category: 'Beast Slayer',  color: 0xffd700, positiveText: '+25% boss damage',                 negativeText: '-80% damage vs mobs, bosses deal more damage', icon: 'card_bosshunter' },

  // Endurance
  128: { name: 'Fortress',            category: 'Endurance',     color: 0xffd700, positiveText: '+1% defense per 100k gold (max 35%)', negativeText: '-20% player damage dealt',     icon: 'card_fortress' },
  129: { name: 'Regeneration Mastery', category: 'Endurance',    color: 0xffd700, positiveText: 'Instant regen start (no wait)',    negativeText: '-50% regen rate',                  icon: 'card_regenmastery' },
  130: { name: 'Insurance',           category: 'Endurance',     color: 0xffd700, positiveText: 'Keep 40% coins next respawn',       negativeText: 'Respawn with 0 coins after that death', icon: 'card_insurance' },
};

export function isMinorCard(id: number): boolean {
  return id >= 1 && id <= 13;
}

export function isMajorCard(id: number): boolean {
  return id >= 101 && id <= 130;
}

export function getCardInfo(id: number): MinorCardInfo | MajorCardInfo | null {
  return MinorCardData[id] || MajorCardData[id] || null;
}

export function getMinorTotalPercent(cardId: number, stacks: number): number {
  const card = MinorCardData[cardId];
  if (!card || stacks === 0) return 0;
  let sum = 0;
  for (let i = 0; i < stacks && i < card.values.length; i++) {
    sum += card.values[i];
  }
  return Math.round(sum);
}

export function getMinorNextValue(cardId: number, stacks: number): number | null {
  const card = MinorCardData[cardId];
  if (!card || stacks >= card.max) return null;
  return card.values[stacks];
}

export function countStacks(chosenCards: number[]): Record<number, number> {
  const stacks: Record<number, number> = {};
  for (const id of chosenCards) {
    stacks[id] = (stacks[id] || 0) + 1;
  }
  return stacks;
}
