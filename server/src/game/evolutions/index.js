const fs = require('fs');
const BasicEvolution = require('./BasicEvolution');
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

class EvolutionSystem {
  constructor(player) {
    this.player = player;

    this.possibleEvols = new Set([]);
    this.skippedEvols = new Set();
    this.evolution = BasicEvolution.type;
    this.evolutionEffect = new BasicEvolution(player);
    player.effects.set('evolution', this.evolutionEffect);
    this.checkForEvolutions();
  }

  checkForEvolutions() {
    // Wait for player select previous tier evols

    for (const evolution in evolutions) {
      if (!this.skippedEvols.has(evolution) && this.checkRequirements(evolution)) {
        this.possibleEvols.add(evolution);
      }
    }
  }

  checkRequirements(evolution) {
    // Normalize incoming key
    const key = String(evolution);
    const Evol = evolutions[key];

    // If evolution definition is missing, it's not available
    if (!Evol) return false;

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

    return Evol.level <= this.player.levels.level
      && (Array.isArray(Evol.biomes) ? (Evol.biomes.length === 0 || Evol.biomes.includes(this.player.biome)) : true)
      && currentLevel < Evol.level
      && previousOk;
  }

  upgrade(evol) {
    const key = String(evol);
    if (!this.checkRequirements(key)) return;

    const Evolution = evolutions[key];
    if (!Evolution) return;
    this.player.effects.delete('evolution');
    this.evolutionEffect.remove();
    this.evolutionEffect = new Evolution(this.player);
    this.evolution = Evolution.type;
    this.player.effects.set('evolution', this.evolutionEffect);

    this.possibleEvols.forEach(type => this.skippedEvols.add(type));
    this.possibleEvols.clear();
    this.checkForEvolutions();
  }
}

module.exports = EvolutionSystem;
