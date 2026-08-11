const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../src/game/Game');
const Player = require('../src/game/entities/Player');
const EvolutionSystem = require('../src/game/evolutions');
const Phantom = require('../src/game/evolutions/Phantom');
const Wraith = require('../src/game/evolutions/Wraith');
const Medic = require('../src/game/evolutions/Medic');
const Seraph = require('../src/game/evolutions/Seraph');
const Arsenal = require('../src/game/evolutions/Arsenal');
const Reaper = require('../src/game/evolutions/Reaper');
const Types = require('../src/game/Types');

function playerFixture(name = 'Player') {
  const game = new Game();
  game.entities.clear();
  game.players.clear();
  const player = new Player(game, name);
  player.inSafezone = false;
  game.addEntity(player);
  game.players.add(player);
  return { game, player };
}

function addPlayer(game, name, x, options = {}) {
  const player = new Player(game, name);
  player.shape.x = x;
  player.inSafezone = false;
  player.isBot = !!options.isBot;
  player.botTeamId = options.teamId ?? null;
  game.addEntity(player);
  game.players.add(player);
  return player;
}

test('new evolution paths are offered at levels 18, 24, and the existing level-42 cap', () => {
  const { player } = playerFixture();
  assert.deepEqual(EvolutionSystem.SELECTION_LEVELS, [2, 12, 18, 24, 42]);

  player.levels.level = 18;
  player.evolutions.evolution = Types.Evolution.Archer;
  assert.equal(player.evolutions.checkRequirements(Types.Evolution.Medic), true);

  player.levels.level = 24;
  player.evolutions.evolution = Types.Evolution.Stalker;
  assert.equal(player.evolutions.checkRequirements(Types.Evolution.Phantom), true);

  player.levels.level = 42;
  for (const [from, to] of [
    [Types.Evolution.Phantom, Types.Evolution.Wraith],
    [Types.Evolution.Medic, Types.Evolution.Seraph],
    [Types.Evolution.Bishop, Types.Evolution.Arsenal],
    [Types.Evolution.Assassin, Types.Evolution.Reaper],
  ]) {
    player.evolutions.evolution = from;
    assert.equal(player.evolutions.checkRequirements(to), true);
  }
});

test('Phantom phase blocks attacks and damage, cancels in safety, and grants one timed ambush', () => {
  const { game, player } = playerFixture('Phantom');
  const target = addPlayer(game, 'Target', 100);
  const effect = new Phantom(player);
  effect.abilityCooldownTimer.finished = true;
  effect.activateAbility();
  effect.update(0.05);

  assert.equal(effect.isAbilityActive, true);
  assert.equal(player.modifiers.phaseImmune, true);
  assert.equal(player.modifiers.attackLocked, true);
  assert.equal(player.sword.canCollide(target), false);
  const healthBefore = player.health.percent;
  player.damaged(50, target);
  assert.equal(player.health.percent, healthBefore);

  effect.update(Phantom.abilityDuration);
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.ambushTime, Phantom.ambushWindow);
  const targetBefore = target.health.percent;
  effect.onHit(target, false);
  assert.ok(target.health.percent < targetBefore);
  assert.equal(effect.ambushTime, 0);

  effect.abilityCooldownTimer.finished = true;
  effect.activateAbility();
  effect.update(0.05);
  player.inSafezone = true;
  effect.update(0.05);
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.ambushTime, 0);
  assert.equal(player.modifiers.phaseImmune, false);
});

test('Wraith uses the stronger stat-focused phase profile', () => {
  const { player } = playerFixture('Wraith');
  const effect = new Wraith(player);
  assert.equal(Wraith.previousEvol, Types.Evolution.Phantom);
  assert.equal(Wraith.abilityDuration, 5);
  assert.equal(Wraith.ambushWindow, 4);
  assert.equal(Wraith.ambushDamageScale, 0.5);
  effect.abilityCooldownTimer.finished = true;
  effect.activateAbility();
  effect.update(0.05);
  assert.equal(player.modifiers.phaseImmune, true);
});

test('real Medics heal only themselves while NPC Medics share with matching NPC teams', () => {
  const { game, player } = playerFixture('Human Medic');
  player.botTeamId = 7;
  const humanAlly = addPlayer(game, 'Human Ally', 100, { teamId: 7 });
  player.health.damaged(player.health.max.value * 0.5);
  humanAlly.health.damaged(humanAlly.health.max.value * 0.5);
  const humanMedic = new Medic(player);
  humanMedic.abilityCooldownTimer.finished = true;
  humanMedic.activateAbility();
  assert.ok(Math.abs(player.health.percent - 0.83) < 1e-9);
  assert.equal(humanAlly.health.percent, 0.5);

  const botMedic = addPlayer(game, 'Bot Medic', 300, { isBot: true, teamId: 11 });
  const botAlly = addPlayer(game, 'Bot Ally', 500, { isBot: true, teamId: 11 });
  const otherTeam = addPlayer(game, 'Other Team', 520, { isBot: true, teamId: 12 });
  const tooFar = addPlayer(game, 'Too Far', 1400, { isBot: true, teamId: 11 });
  for (const bot of [botMedic, botAlly, otherTeam, tooFar]) bot.health.damaged(bot.health.max.value * 0.5);
  const npcMedic = new Medic(botMedic);
  npcMedic.abilityCooldownTimer.finished = true;
  npcMedic.activateAbility();
  assert.ok(Math.abs(botMedic.health.percent - 0.83) < 1e-9);
  assert.ok(Math.abs(botAlly.health.percent - 0.70) < 1e-9);
  assert.equal(otherTeam.health.percent, 0.5);
  assert.equal(tooFar.health.percent, 0.5);
});

test('Seraph strengthens self and NPC-team healing without healing human teammates', () => {
  const { game } = playerFixture('Observer');
  const seraph = addPlayer(game, 'NPC Seraph', 0, { isBot: true, teamId: 4 });
  const ally = addPlayer(game, 'NPC Ally', 900, { isBot: true, teamId: 4 });
  seraph.health.damaged(seraph.health.max.value * 0.6);
  ally.health.damaged(ally.health.max.value * 0.6);
  const effect = new Seraph(seraph);
  effect.abilityCooldownTimer.finished = true;
  effect.activateAbility();
  assert.ok(Math.abs(seraph.health.percent - 0.85) < 1e-9);
  assert.ok(Math.abs(ally.health.percent - 0.70) < 1e-9);
});

test('Arsenal specializes Bishop cannon and chakram constants without changing Bishop', () => {
  const { game, player } = playerFixture('Arsenal');
  const target = addPlayer(game, 'Target', 600, { isBot: true });
  const effect = new Arsenal(player);
  const bolt = effect.fireCannon(target);
  assert.ok(bolt);
  assert.equal(Arsenal.previousEvol, Types.Evolution.Bishop);
  assert.equal(Arsenal.cannonRange, 2600);
  assert.equal(Arsenal.cannonCooldown, 0.75);
  assert.equal(bolt.speed, 2050);
  assert.equal(bolt.knockback, 115);
  assert.equal(bolt.damage, Math.max(2, player.sword.damage.value * 0.60));
  assert.equal(Arsenal.chakramCount, 36);
  assert.equal(Arsenal.chakramRadius, 260);
  assert.equal(Arsenal.chakramHitCooldown, 0.35);
});

test('Reaper is an Assassin capstone whose mark follows the last damaged player', () => {
  const { game, player } = playerFixture('Reaper');
  const first = addPlayer(game, 'First', 500);
  const second = addPlayer(game, 'Second', 700);
  const effect = new Reaper(player);

  assert.equal(Reaper.previousEvol, Types.Evolution.Assassin);
  effect.onHit(first, true);
  assert.equal(effect.markedTarget, first);
  effect.update(0.05);
  assert.equal(first.flags.get(Types.Flags.ReaperMarked), player.id);

  effect.onHit(second, true);
  assert.equal(effect.markedTarget, second);
  assert.equal(effect.executionTarget, null);

  effect.onHit({ type: Types.Entity.Chest }, false);
  assert.equal(effect.markedTarget, null);
});

test('Reaper execution validates its mark, teleports behind it, and spends on one melee attempt', () => {
  const { game, player } = playerFixture('Reaper');
  const target = addPlayer(game, 'Target', 900);
  target.angle = 0;
  const effect = new Reaper(player);
  effect.abilityCooldownTimer.finished = true;

  effect.activateAbility();
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.canActivateAbility, true);

  effect.onHit(target, true);
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, true);
  assert.equal(effect.executionTarget, target);
  assert.ok(player.shape.x < target.shape.x);
  assert.ok(Math.abs(player.shape.y - target.shape.y) < 1e-9);
  assert.equal(player.velocity.x, 0);
  assert.equal(player.velocity.y, 0);

  const before = target.health.percent;
  effect.onHit(target, false);
  assert.ok(target.health.percent < before);
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.markedTarget, null);
  assert.equal(effect.canActivateAbility, false);
});

test('Reaper refuses protected, dead, distant, and flying-sword executions without consuming cooldown', () => {
  const { game, player } = playerFixture('Reaper');
  const target = addPlayer(game, 'Target', 500);
  const effect = new Reaper(player);
  effect.abilityCooldownTimer.finished = true;
  effect.onHit(target, true);

  target.inSafezone = true;
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.canActivateAbility, true);

  target.inSafezone = false;
  effect.onHit(target, true);
  target.shape.x = Reaper.executionRange + 100;
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, false);

  target.shape.x = 500;
  player.sword.isFlying = true;
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, false);
  assert.equal(effect.canActivateAbility, true);
});
