const Types = require('../Types');

const BotPersonality = Object.freeze({
  Regular: 'regular',
  Spartan: 'spartan',
  Runner: 'runner',
});

const RUNNER_EVOLUTIONS = new Set([
  Types.Evolution.Knight, // Required bridge to Berserker.
  Types.Evolution.Berserker,
  Types.Evolution.Archer,
  Types.Evolution.Sniper,
  Types.Evolution.SuperArcher,
]);

const SPARTAN_EVOLUTIONS = new Set([
  Types.Evolution.Tank,
  Types.Evolution.Knight,
  Types.Evolution.Berserker,
  Types.Evolution.Vampire,
  Types.Evolution.Rook,
  Types.Evolution.Samurai,
  Types.Evolution.Defender,
  Types.Evolution.Warrior,
  Types.Evolution.Lumberjack,
  Types.Evolution.Fighter,
  Types.Evolution.Juggernaut,
  Types.Evolution.Assassin,
  Types.Evolution.Elite,
  Types.Evolution.Tracker,
]);

function choosePersonality(random = Math.random) {
  const roll = random();
  if (roll < 0.2) return BotPersonality.Spartan;
  if (roll < 0.4) return BotPersonality.Runner;
  return BotPersonality.Regular;
}

function filterEvolutionChoices(personality, choices, runnerRoute = null) {
  if (personality === BotPersonality.Runner) {
    if (runnerRoute === 'archer') {
      return choices.filter(evolution => [
        Types.Evolution.Archer,
        Types.Evolution.Sniper,
        Types.Evolution.SuperArcher,
      ].includes(Number(evolution)));
    }
    if (runnerRoute === 'berserker') {
      return choices.filter(evolution => [
        Types.Evolution.Knight,
        Types.Evolution.Berserker,
      ].includes(Number(evolution)));
    }
    return choices.filter(evolution => RUNNER_EVOLUTIONS.has(Number(evolution)));
  }
  if (personality === BotPersonality.Spartan) {
    const preferred = choices.filter(evolution => SPARTAN_EVOLUTIONS.has(Number(evolution)));
    return preferred.length > 0 ? preferred : choices;
  }
  return choices;
}

module.exports = {
  BotPersonality,
  choosePersonality,
  filterEvolutionChoices,
  RUNNER_EVOLUTIONS,
  SPARTAN_EVOLUTIONS,
};
