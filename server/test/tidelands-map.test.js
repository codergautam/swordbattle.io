const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const map = require('../src/game/maps/mapLoader');
const config = require('../src/config');
const Types = require('../src/game/Types');
const Circle = require('../src/game/shapes/Circle');

test('the world expands only north and west to 43,750 square units', () => {
  assert.equal(map.worldWidth, 43750);
  assert.equal(map.worldHeight, 43750);
  assert.equal(map.worldX, -26250);
  assert.equal(map.worldY, -26250);
  assert.equal(map.worldX + map.worldWidth, 17500);
  assert.equal(map.worldY + map.worldHeight, 17500);

  const point = Circle.create(0, 0, 1);
  point.x = -30000;
  point.y = -30000;
  assert.equal(point.x, config.world.worldX);
  assert.equal(point.y, config.world.worldY);
  point.x = 30000;
  point.y = 30000;
  assert.equal(point.x, 17500);
  assert.equal(point.y, 17500);
});

test('Tidelands include both new mobs, hazards, and restored fish channels', () => {
  const tidelands = map.biomes.filter(biome => biome.type === Types.Biome.Tidelands);
  const rivers = map.biomes.filter(biome => biome.type === Types.Biome.River &&
    (biome.variant === 'north-channel' || biome.variant === 'west-channel'));
  assert.equal(tidelands.length, 2);
  assert.equal(rivers.length, 2);

  const objects = [...tidelands, ...rivers].flatMap(biome => biome.objects);
  const amount = type => objects
    .filter(object => object.type === type)
    .reduce((sum, object) => sum + object.amount, 0);
  assert.equal(amount(Types.Entity.Tideclaw), 22);
  assert.equal(amount(Types.Entity.Stormray), 18);
  assert.equal(amount(Types.Entity.Whirlpool), 13);
  assert.equal(amount(Types.Entity.Fish), 34);
  assert.equal(amount(Types.Entity.AngryFish), 19);

  const clientAssets = path.resolve(__dirname, '../../client/public/assets/game');
  for (const relative of [
    'mobs/bluefish.png', 'mobs/angryfish.png', 'mobs/tideclaw.svg',
    'mobs/stormray.svg', 'hazards/whirlpool.svg', 'tiles/tidelands.svg',
  ]) {
    assert.equal(fs.existsSync(path.join(clientAssets, relative)), true, `missing ${relative}`);
  }
});
