const test = require('node:test');
const assert = require('node:assert/strict');
const Types = require('../src/game/Types');
const {
  BotPersonality,
  choosePersonality,
  filterEvolutionChoices,
  RUNNER_EVOLUTIONS,
} = require('../src/game/ai/BotPersonality');

test('personality selection covers regular, Spartan, and runner bots', () => {
  assert.equal(choosePersonality(() => 0.1), BotPersonality.Spartan);
  assert.equal(choosePersonality(() => 0.3), BotPersonality.Runner);
  assert.equal(choosePersonality(() => 0.8), BotPersonality.Regular);
});

test('runner evolution choices stay on Archer/Berserker routes', () => {
  const offered = [
    Types.Evolution.Tank,
    Types.Evolution.Archer,
    Types.Evolution.Berserker,
    Types.Evolution.Sniper,
    Types.Evolution.SuperArcher,
    Types.Evolution.Assassin,
  ];
  const choices = filterEvolutionChoices(BotPersonality.Runner, offered);
  assert.deepEqual(choices, [
    Types.Evolution.Archer,
    Types.Evolution.Berserker,
    Types.Evolution.Sniper,
    Types.Evolution.SuperArcher,
  ]);
  assert.ok(choices.every(choice => RUNNER_EVOLUTIONS.has(choice)));
  assert.deepEqual(
    filterEvolutionChoices(BotPersonality.Runner, offered, 'archer'),
    [Types.Evolution.Archer, Types.Evolution.Sniper, Types.Evolution.SuperArcher],
  );
  assert.deepEqual(
    filterEvolutionChoices(BotPersonality.Runner, offered, 'berserker'),
    [Types.Evolution.Berserker],
  );
});

test('Spartans prefer tank and high-combat evolution routes', () => {
  const offered = [Types.Evolution.Archer, Types.Evolution.Tank];
  assert.deepEqual(
    filterEvolutionChoices(BotPersonality.Spartan, offered),
    [Types.Evolution.Tank],
  );
});
