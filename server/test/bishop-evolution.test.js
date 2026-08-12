const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../src/game/Game');
const Player = require('../src/game/entities/Player');
const Bishop = require('../src/game/evolutions/Bishop');
const Types = require('../src/game/Types');

function fixture() {
  const game = new Game();
  game.entities.clear();
  game.players.clear();
  const bishop = new Player(game, 'Bishop');
  bishop.inSafezone = false;
  game.addEntity(bishop);
  game.players.add(bishop);
  const target = new Player(game, 'Target NPC');
  target.isBot = true;
  target.inSafezone = false;
  target.shape.x = 600;
  game.addEntity(target);
  game.players.add(target);
  return { game, bishop, target, effect: new Bishop(bishop) };
}

test('Bishop is a level-12 Knight evolution with an unstoppable nearest-target cannon', () => {
  const { game, bishop, target, effect } = fixture();
  assert.equal(Bishop.level, 12);
  assert.equal(Bishop.previousEvol, Types.Evolution.Knight);
  assert.equal(Bishop.chakramCount, 36);
  assert.equal(Bishop.abilityDuration, 5);
  assert.equal(effect.findNearestTarget(), target);

  const bolt = effect.fireCannon();
  assert.ok(bolt);
  assert.equal(bolt.type, Types.Entity.BishopBolt);
  assert.equal(bolt.owner, bishop);
  assert.equal(game.entities.get(bolt.id), bolt);

  effect.isAbilityActive = true;
  assert.equal(effect.fireCannon(target), null);
});

test('Chakram Conclave damages enemies at the ring and blocks incoming sword throws', () => {
  const { bishop, target, effect } = fixture();
  target.shape.x = Bishop.chakramRadius;
  target.sword.shape.x = Bishop.chakramRadius;
  target.sword.shape.y = 0;
  target.sword.isFlying = true;
  const before = target.health.percent;

  effect.isAbilityActive = true;
  effect.elapsed = 1;
  effect.processChakramField();

  assert.equal(target.sword.isFlying, false);
  assert.ok(target.health.percent < before);
  const afterFirstHit = target.health.percent;
  effect.processChakramField();
  assert.equal(target.health.percent, afterFirstHit);
  effect.elapsed += Bishop.chakramHitCooldown;
  effect.processChakramField();
  assert.ok(target.health.percent < afterFirstHit);
});

test('the cannon resumes immediately after the five-second ability ends', () => {
  const { game, effect } = fixture();
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, false, 'initial evolution cooldown remains enforced');
  effect.abilityCooldownTimer.finished = true;
  effect.activateAbility();
  assert.equal(effect.isAbilityActive, true);
  const before = Array.from(game.entities.values()).filter(entity => entity.type === Types.Entity.BishopBolt).length;
  effect.update(5);
  assert.equal(effect.isAbilityActive, false);
  const after = Array.from(game.entities.values()).filter(entity => entity.type === Types.Entity.BishopBolt).length;
  assert.equal(after, before + 1);
});
