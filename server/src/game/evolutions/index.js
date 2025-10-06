const fs = require('fs');
const BasicEvolution = require('./BasicEvolution');
const evolutions = {};

fs.readdirSync(__dirname).forEach((file) => {
  if (file == 'index.js') return;
  if (!file.endsWith('.js')) return;

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

    for (const evolution in evolutions) {
      if (!this.skippedEvols.has(evolution) && this.checkRequirements(evolution)) {
        this.possibleEvols.add(evolution);
      }
    }
  }

  checkRequirements(evolution) {
    const Evol = evolutions[evolution];
    
    let previousOk = true;
    if (Evol.previousEvol !== undefined) {
      if (Evol.previousEvol === "secret") {
        previousOk = (this.evolution === 0);
      } else if (Array.isArray(Evol.previousEvol)) {
        previousOk = Evol.previousEvol.includes(this.evolution);
      } else {
        previousOk = (this.evolution === Evol.previousEvol);
      }
    }

    return Evol && Evol.level <= this.player.levels.level
      && (Evol.biomes.length === 0 || Evol.biomes.includes(this.player.biome))
      && evolutions[this.evolution].level < Evol.level
      && previousOk;
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
