const MinorCards = {
  1:  { id: 1,  name: 'Sharp Stabs',      category: 'offensive', values: [0.08, 0.07, 0.06, 0.05, 0.05, 0.04, 0.04], max: 7, stat: 'damage' },
  2:  { id: 2,  name: 'Quick Swing',      category: 'offensive', values: [0.06, 0.05, 0.05, 0.04, 0.04, 0.03, 0.03], max: 7, stat: 'attackSpeed', inverse: true },
  4:  { id: 4,  name: 'Sharpshooter',     category: 'offensive', values: [0.08, 0.07, 0.06, 0.05, 0.05, 0.04, 0.04], max: 7, stat: 'throwPower' },
  5:  { id: 5,  name: 'Defense Training', category: 'defensive', values: [0.08, 0.07, 0.06, 0.05, 0.05, 0.04, 0.04], max: 7, stat: 'maxHp' },
  7:  { id: 7,  name: 'Fast Heal',        category: 'defensive', values: [0.08, 0.07, 0.06, 0.05, 0.05, 0.04, 0.04], max: 7, stat: 'regenPower' },
  9:  { id: 9,  name: 'Swiftness',        category: 'utility',   values: [0.05, 0.04, 0.04, 0.03, 0.03, 0.03, 0.02], max: 7, stat: 'speed' },
  11: { id: 11, name: 'Sniper Vision',    category: 'utility',   values: [0.08, 0.06, 0.05, 0.04, 0.03],              max: 5, stat: 'vision', inverse: true },
};

const MajorCards = {
  // Swordsmanship
  101: { id: 101, name: 'Cleave',              category: 'swordsmanship', positiveText: '+50% swing arc',                    negativeText: '-25% knockback dealt',           stubEffect: { stat: 'damage', value: 0.10 } },
  102: { id: 102, name: 'Double Hit',           category: 'swordsmanship', positiveText: 'Releasing swings does an extra hit',       negativeText: 'Deal 60% damage for each hit', stubEffect: { stat: 'damage', value: 0.10 } },
  103: { id: 103, name: 'Aggression',           category: 'swordsmanship', positiveText: '+50% damage for 2s after being hit', negativeText: '-25% damage for 1s after boost', stubEffect: { stat: 'damage', value: 0.10 } },

  // Throwing
  104: { id: 104, name: 'Twin Throw',           category: 'throwing',      positiveText: 'Throw 2 swords in a row',                   negativeText: '-30% throw damage, +25% cooldown', stubEffect: { stat: 'damage', value: 0.10 } },
  105: { id: 105, name: 'Boomerang',            category: 'throwing',      positiveText: 'Sword returns after throw',         negativeText: '-30% range, -35% damage',          stubEffect: { stat: 'damage', value: 0.10 } },
  106: { id: 106, name: 'Spare Sword',          category: 'throwing',      positiveText: 'Keep melee attack while throwing',         negativeText: '-25% throw speed, -30% throw dmg', stubEffect: { stat: 'damage', value: 0.10 } },

  // Predator
  107: { id: 107, name: 'Finisher',             category: 'predator',      positiveText: '+25% damage vs under 40% HP targets',     negativeText: '-15% damage vs over 80% HP targets',     stubEffect: { stat: 'damage', value: 0.10 } },
  108: { id: 108, name: 'Regensteal',           category: 'predator',      positiveText: 'Hits reduce regen wait by 0.5s',   negativeText: '-25% regen rate',                  stubEffect: { stat: 'damage', value: 0.10 } },
  109: { id: 109, name: 'Boxer',                category: 'predator',      positiveText: '-50% throw damage/knockback taken', negativeText: 'Also affects own throws',           stubEffect: { stat: 'damage', value: 0.10 } },

  // Stand Ground
  110: { id: 110, name: 'Tracking',             category: 'standGround',   positiveText: 'Hit by faster player: match their speed (2s)', negativeText: 'Faster than attacker: slow to their speed (2s)', stubEffect: { stat: 'speed', value: 0.10 } },
  111: { id: 111, name: 'Ensnare',              category: 'standGround',   positiveText: 'Hit enemies: -7% speed (3x, 3s)',   negativeText: '-10% speed permanently',            stubEffect: { stat: 'speed', value: 0.10 } },
  112: { id: 112, name: 'Acceleration',          category: 'standGround',   positiveText: '+5% speed per hit dealt (2s)',      negativeText: '-5% speed per hit taken (2s)',      stubEffect: { stat: 'speed', value: 0.10 } },

  // Vampiric
  113: { id: 113, name: 'Vampire Aspect',       category: 'vampiric',      positiveText: 'Heal 10% of melee damage dealt',   negativeText: '-8% max HP',                       stubEffect: { stat: 'damage', value: 0.10 } },
  114: { id: 114, name: 'Soul Harvest',         category: 'vampiric',      positiveText: 'Kill a player = full heal',                  negativeText: '-15% regen rate',                  stubEffect: { stat: 'damage', value: 0.10 } },
  115: { id: 115, name: 'Blood Frenzy',         category: 'vampiric',      positiveText: 'Under 35% HP: +25% damage, +5% speed',   negativeText: 'Over 80% HP: -10% damage',             stubEffect: { stat: 'damage', value: 0.10 } },

  // Fortification
  116: { id: 116, name: 'Rejuvenation',         category: 'fortification', positiveText: 'Regen ramps over time (up to 3x)',  negativeText: '-25% base regen',                  stubEffect: { stat: 'regen', value: 0.10 } },
  117: { id: 117, name: 'Adaptive Armor',       category: 'fortification', positiveText: 'Taking 3 hits in 5s = 30% defense for 4s',      negativeText: 'During defense: -10% damage dealt',     stubEffect: { stat: 'maxHp', value: 0.10 } },
  118: { id: 118, name: 'Disengage',            category: 'fortification', positiveText: 'After getting hit: +25% speed for 2s',      negativeText: '-35% damage while speed boosted',  stubEffect: { stat: 'speed', value: 0.10 } },

  // Prospector
  119: { id: 119, name: 'Midas Touch',          category: 'prospector',    positiveText: '+35% gold from all sources',        negativeText: '+25% damage taken',                stubEffect: { stat: 'coinMagnet', value: 0.10 } },
  120: { id: 120, name: 'Chest Keys',           category: 'prospector',    positiveText: 'Deal double damage to chests',      negativeText: 'Chests drop half coins',           stubEffect: { stat: 'coinMagnet', value: 0.10 } },
  121: { id: 121, name: 'Scavenger',            category: 'prospector',    positiveText: 'Ground-spawned coins value 1 -> 50',             negativeText: '-25% chest coins',                 stubEffect: { stat: 'coinMagnet', value: 0.10 } },

  // Pacifism
  122: { id: 122, name: 'Ceasefire',            category: 'pacifism',      positiveText: 'Nearby players deal -25% damage',  negativeText: 'Affects your damage too',          stubEffect: { stat: 'maxHp', value: 0.10 } },
  123: { id: 123, name: 'PvE Master',           category: 'pacifism',      positiveText: '+25% chest damage',                 negativeText: '-50% coins from player kills',     stubEffect: { stat: 'damage', value: 0.10 } },
  124: { id: 124, name: 'Tank Shell',           category: 'pacifism',      positiveText: '+25% damage reduction',             negativeText: '-50% knockback dealt',             stubEffect: { stat: 'maxHp', value: 0.10 } },

  // Beast Slayer
  125: { id: 125, name: 'Hunting Instinct',     category: 'beastSlayer',   positiveText: '+40% damage vs mobs, +20% mob coins',      negativeText: '-25% damage vs players',           stubEffect: { stat: 'damage', value: 0.10 } },
  126: { id: 126, name: 'Butcherer',            category: 'beastSlayer',   positiveText: 'Mobs don\'t get angry when hit',          negativeText: '-50% knockback vs mobs',           stubEffect: { stat: 'damage', value: 0.10 } },
  127: { id: 127, name: 'Boss Hunter',          category: 'beastSlayer',   positiveText: '+25% boss damage',                  negativeText: '-80% damage vs mobs, bosses deal more damage', stubEffect: { stat: 'damage', value: 0.10 } },

  // Endurance
  128: { id: 128, name: 'Fortress',             category: 'endurance',     positiveText: '+1% defense per 100k gold (max 35%)',    negativeText: '-20% player damage dealt',         stubEffect: { stat: 'maxHp', value: 0.10 } },
  129: { id: 129, name: 'Regeneration Mastery', category: 'endurance',     positiveText: 'Instant regen start (no wait)',     negativeText: '-50% regen rate',                  stubEffect: { stat: 'regen', value: 0.10 } },
  130: { id: 130, name: 'Insurance',            category: 'endurance',     positiveText: 'Keep 40% coins next respawn',           negativeText: 'Respawn with 0 coins after that death',   stubEffect: { stat: 'maxHp', value: 0.10 } },
};

function getCard(id) {
  return MinorCards[id] || MajorCards[id] || null;
}

function isMinorCard(id) {
  return id >= 1 && id <= 13;
}

function isMajorCard(id) {
  return id >= 101 && id <= 130;
}

function getAllMinorIds() {
  return Object.keys(MinorCards).map(Number);
}

function getAllMajorIds() {
  return Object.keys(MajorCards).map(Number);
}

function getMajorCardsByCategory() {
  const categories = {};
  for (const card of Object.values(MajorCards)) {
    if (!categories[card.category]) categories[card.category] = [];
    categories[card.category].push(card);
  }
  return categories;
}

module.exports = {
  MinorCards,
  MajorCards,
  getCard,
  isMinorCard,
  isMajorCard,
  getAllMinorIds,
  getAllMajorIds,
  getMajorCardsByCategory,
};
