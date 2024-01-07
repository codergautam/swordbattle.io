const fs = require('fs');
const BasicEvolution = require('./BasicEvolution');
const evolutions = {};

fs.readdirSync(__dirname).forEach((file) => {
  if (file == 'index.js') return;

  const EvolutionClass = require(`${__dirname}/${file}`);
  evolutions[EvolutionClass.type] = EvolutionClass;
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
    if (this.possibleEvols.size !== 0) return;

    for (const evolution in evolutions) {
      if (!this.skippedEvols.has(evolution) && this.checkRequirements(evolution)) {
        this.possibleEvols.add(evolution);
      }
    }
  }

  checkRequirements(evolution) {
    const Evol = evolutions[evolution];
    return Evol && Evol.level <= this.player.levels.level
      && (Evol.biomes.length === 0 || Evol.biomes.includes(this.player.biome))
      && evolutions[this.evolution].level < Evol.level;
  }

  upgrade(evol) {
    if (!this.checkRequirements(evol)) return;

    const Evolution = evolutions[evol];
    this.player.effects.delete('evolution');
    this.evolutionEffect = new Evolution(this.player);
    this.evolution = Evolution.type;
    this.player.effects.set('evolution', this.evolutionEffect);

    this.possibleEvols.forEach(type => this.skippedEvols.add(type));
    this.possibleEvols.clear();
    this.checkForEvolutions();
  }
}

module.exports = EvolutionSystem;
