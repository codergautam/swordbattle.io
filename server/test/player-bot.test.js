const test = require('node:test');
const assert = require('node:assert/strict');
const Types = require('../src/game/Types');
const PlayerBot = require('../src/game/entities/PlayerBot');

function projectile(type, x, y, angle = 0, owner = null) {
  return {
    type,
    owner,
    removed: false,
    angle,
    shape: { x, y, boundary: { x: x - 5, y: y - 5, width: 10, height: 10 } },
    speed: { value: 95 },
  };
}

test('predictive scan sidesteps an intersecting projectile', () => {
  const fireball = projectile(Types.Entity.Fireball, -300, 0, 0);
  const fake = {
    game: { entitiesQuadtree: { get: () => [{ entity: fireball }] } },
    shape: { x: 0, y: 0, radius: 50 },
    skill: 0.8,
    personality: 'regular',
    projReactRange: PlayerBot.prototype.projReactRange,
    isEnemyProjectile: PlayerBot.prototype.isEnemyProjectile,
    projectileThreat: null,
    dodgeTimer: 0,
    speak: () => {},
    strafeDir: 1,
  };
  PlayerBot.prototype.scanProjectileThreats.call(fake);
  assert.equal(fake.projectileThreat, fireball);
  assert.ok(fake.dodgeTimer > 0);
  assert.ok(Math.abs(Math.sin(fake.dodgeAngle)) > 0.9);
});

test('player-thrown swords are hazards but a bot ignores its own sword', () => {
  const bot = {};
  const enemy = {};
  const ownSword = { type: Types.Entity.Sword, isFlying: true, player: bot, shape: {} };
  const enemySword = { type: Types.Entity.Sword, isFlying: true, player: enemy, shape: {} };
  assert.equal(PlayerBot.prototype.isEnemyProjectile.call(bot, ownSword), false);
  assert.equal(PlayerBot.prototype.isEnemyProjectile.call(bot, enemySword), true);
});

test('bot attack code never presses the ability input', () => {
  const pressed = [];
  const fake = {
    meleeReach: () => 100,
    sword: { isAnimationFinished: true, isFlying: false, flyCooldownTime: 0 },
    angle: 0,
    inRangeTime: 0,
    outOfRangeTime: 0,
    attackCooldown: 0,
    throwCooldown: 0,
    skill: 1,
    throwRange: () => 2200,
    inputs: { inputDown: input => pressed.push(input) },
    aimAngle: () => 0,
    speak: () => {},
  };
  PlayerBot.prototype.tryCombatAttack.call(fake, {}, 50, 0, {}, 1);
  assert.ok(pressed.includes(Types.Input.SwordSwing));
  assert.ok(!pressed.includes(Types.Input.Ability));
});
