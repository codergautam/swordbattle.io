const fs = require('fs');
const BasicEvolution = require('./BasicEvolution');
const Timer = require('../components/Timer');
const evolutions = {};

fs.readdirSync(__dirname).forEach((file) => {
  if (file == 'index.js') return;
  if (!file.endsWith('.js')) return;

  const EvolutionClass = require(`${__dirname}/${file}`);
  // Normalize key to string to avoid accidental type mismatches (numbers -> strings as object keys)
  try {
    const key = String(EvolutionClass.type);
    evolutions[key] = EvolutionClass;
  } catch (e) {
    // ignore malformed evolution files
    console.error('Failed to load evolution file', file, e);
  }
});

console.log(`Loaded ${Object.keys(evolutions).length} evolutions`);

const TERMINAL_EVOLUTIONS = (() => {
  const hasChild = new Set();
  for (const key in evolutions) {
    const prev = evolutions[key].previousEvol;
    if (prev === undefined || prev === 'secret') continue;
    if (Array.isArray(prev)) prev.forEach(p => hasChild.add(Number(p)));
    else hasChild.add(Number(prev));
  }
  const terminal = new Set();
  for (const key in evolutions) {
    const t = evolutions[key].type;
    if (!hasChild.has(Number(t))) terminal.add(Number(t));
  }
  return terminal;
})();

class EvolutionSystem {
  static SELECTION_LEVELS = [2, 12, 18, 24, 42];
  static TERMINAL_EVOLUTIONS = TERMINAL_EVOLUTIONS;

  static nextTierAfter(level) {
    for (const L of EvolutionSystem.SELECTION_LEVELS) if (L > level) return L;
    return Infinity;
  }

  constructor(player) {
    this.player = player;

    this.possibleEvols = new Set([]);
    this.skippedEvols = new Set();
    this.resolvedSelections = new Set();
    this.recheckDelay = 0;
    this.evolution = BasicEvolution.type;
    this.evolutionEffect = new BasicEvolution(player);
    player.effects.set('evolution', this.evolutionEffect);
    this.checkForEvolutions();
  }

  activeSelectionLevel() {
    const lvl = (this.player.levels && this.player.levels.level) || 0;
    for (const L of EvolutionSystem.SELECTION_LEVELS) {
      if (lvl >= L && !this.resolvedSelections.has(L)) return L;
    }
    return null;
  }

  eligibleEvolutions() {
    const out = [];
    for (const evolution in evolutions) {
      if (this.checkRequirements(evolution)) out.push(evolution);
    }
    return out;
  }

  hasUpgradeOffer() {
    return !!(this.player.upgrades && this.player.upgrades.hasAvailableTier());
  }

  checkForEvolutions() {
    this.possibleEvols.clear();

    if (this.recheckDelay > 0) {
      if (this.player.upgrades) this.player.upgrades.possibleUpgrades.clear();
      return;
    }

    let active = this.activeSelectionLevel();
    let evols = [];
    while (active !== null) {
      evols = this.eligibleEvolutions();
      if (evols.length > 0 || this.hasUpgradeOffer()) break;
      this.resolvedSelections.add(active);
      active = this.activeSelectionLevel();
    }

    if (active === null) {
      if (this.player.upgrades) this.player.upgrades.possibleUpgrades.clear();
      return;
    }

    for (const e of evols) this.possibleEvols.add(e);

    if (this.player.upgrades) {
      if (this.hasUpgradeOffer()) this.player.upgrades.checkForUpgrades();
      else this.player.upgrades.possibleUpgrades.clear();
    }
  }

  update() {
    if (this.recheckDelay > 0) {
      this.recheckDelay--;
      if (this.recheckDelay === 0) this.checkForEvolutions();
    }
  }

  skipForUpgrade() {
    const active = this.activeSelectionLevel();
    if (active !== null) this.resolvedSelections.add(active);
    this.possibleEvols.clear();
    if (this.player.upgrades) this.player.upgrades.possibleUpgrades.clear();
    this.recheckDelay = 2;
  }

  checkRequirements(evolution) {
    // Normalize incoming key
    const key = String(evolution);
    const Evol = evolutions[key];

    // If evolution definition is missing, it's not available
    if (!Evol) return false;
    if (this.player.isBot && Evol.availableToBots === false) return false;

    let previousOk = true;
    if (Evol.previousEvol !== undefined) {
      if (Evol.previousEvol === 'secret') {
        previousOk = (this.evolution === 0);
      } else if (Array.isArray(Evol.previousEvol)) {
        previousOk = Evol.previousEvol.includes(this.evolution);
      } else {
        previousOk = (this.evolution === Evol.previousEvol);
      }
    }

    // Get the current evolution definition safely (normalize key)
    const currentKey = String(this.evolution);
    const CurrentEvol = evolutions[currentKey];
    const currentLevel = CurrentEvol && typeof CurrentEvol.level === 'number' ? CurrentEvol.level : -Infinity;

    const reachable = Evol.level <= this.player.levels.level
      && (Array.isArray(Evol.biomes) ? (Evol.biomes.length === 0 || Evol.biomes.includes(this.player.biome)) : true)
      && currentLevel < Evol.level
      && previousOk;
    if (!reachable) return false;

    if (EvolutionSystem.TERMINAL_EVOLUTIONS.has(Number(Evol.type))) {
      const activeLevel = this.activeSelectionLevel();
      if (activeLevel !== null && activeLevel >= EvolutionSystem.nextTierAfter(Evol.level)) return false;
    }
    return true;
  }

  upgrade(evol) {
    const key = String(evol);
    if (!this.checkRequirements(key)) return;

    const Evolution = evolutions[key];
    if (!Evolution) return;

    const isFromBasic = this.evolution === BasicEvolution.type;
    const abilityOnCooldown = !this.evolutionEffect.canActivateAbility;
    const cooldownRemaining = this.evolutionEffect.cooldownTime;

    this.player.effects.delete('evolution');
    this.evolutionEffect.remove();
    this.evolutionEffect = new Evolution(this.player);
    this.evolution = Evolution.type;
    this.player.effects.set('evolution', this.evolutionEffect);

    const newAbilityCooldown = Evolution.abilityCooldown;
    if (!isFromBasic && abilityOnCooldown && newAbilityCooldown > 15 && cooldownRemaining >= 5) {
      const remaining = Math.min(cooldownRemaining, newAbilityCooldown);
      const elapsed = newAbilityCooldown - remaining;
      this.evolutionEffect.abilityCooldownTimer = new Timer(elapsed, newAbilityCooldown, newAbilityCooldown);
    }

    if (this.player.upgrades) this.player.upgrades.clear();

    const active = this.activeSelectionLevel();
    if (active !== null) this.resolvedSelections.add(active);

    this.possibleEvols.clear();
    this.checkForEvolutions();
  }
}

module.exports = EvolutionSystem;
