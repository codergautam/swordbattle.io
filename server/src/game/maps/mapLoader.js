const fs = require('fs');
const path = require('path');
const config = require('../../config');
const Types = require('../Types');

const biomeNameToType = {
  Fire: Types.Biome.Fire,
  Earth: Types.Biome.Earth,
  Ice: Types.Biome.Ice,
  River: Types.Biome.River,
  Safezone: Types.Biome.Safezone,
  TutorialZone: Types.Biome.TutorialZone,
  Meadow: Types.Biome.Meadow,
  Savanna: Types.Biome.Savanna,
  Alpine: Types.Biome.Alpine,
  Dirt: Types.Biome.Dirt,
  Rocks: Types.Biome.Rocks,
  Desert: Types.Biome.Desert,
  Oasis: Types.Biome.Oasis,
};

function sampleCatmullRom(controlPoints, samplesPerSegment, closed) {
  const n = controlPoints.length;
  if (n < 3) return controlPoints.map(p => p.slice());

  const get = (i) => closed
    ? controlPoints[((i % n) + n) % n]
    : controlPoints[Math.max(0, Math.min(n - 1, i))];

  const out = [];
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      );
      const y = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      );
      out.push([x, y]);
    }
  }
  if (!closed) out.push(controlPoints[n - 1].slice());
  return out;
}

function simplifyDP(points, tolerance) {
  if (points.length < 3) return points.slice();
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  const tolSq = tolerance * tolerance;

  while (stack.length) {
    const [start, end] = stack.pop();
    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let maxDistSq = 0;
    let maxIndex = -1;

    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i];
      let distSq;
      if (lenSq === 0) {
        const ex = px - ax, ey = py - ay;
        distSq = ex * ex + ey * ey;
      } else {
        const tRaw = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        const t = Math.max(0, Math.min(1, tRaw));
        const ex = px - (ax + t * dx);
        const ey = py - (ay + t * dy);
        distSq = ex * ex + ey * ey;
      }
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        maxIndex = i;
      }
    }

    if (maxDistSq > tolSq && maxIndex !== -1) {
      keep[maxIndex] = true;
      stack.push([start, maxIndex]);
      stack.push([maxIndex, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function resolveEntityName(name) {
  if (typeof name === 'number') return name;
  return Types.Entity[name];
}

function resolveObjects(objects) {
  return objects.map(o => ({ ...o, type: resolveEntityName(o.type) }));
}

function resolveSpawnZones(zones) {
  return zones.map(z => ({ ...z, type: resolveEntityName(z.type) }));
}

function polygonArea(points) {
  let a = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

const autoObjects = {
  Earth: (a) => [
    { type: 'MossyRock', amount: Math.round(a / 17e6), position: 'random', size: [500, 700] },
    { type: 'Bush', amount: Math.round(a / 1.7e6), position: 'random', size: [100, 400] },
    { type: 'Pond', amount: Math.round(a / 8.5e6), position: 'random', size: [400, 900] },
    { type: 'Rock', amount: Math.round(a / 17e6), position: 'random', size: [200, 400] },
    { type: 'Ore', amount: Math.round(a / 9.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 4.75e6), position: 'random', respawnable: true },
    { type: 'Wolf', amount: Math.round(a / 19e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'Cat', amount: Math.round(a / 15.5e6), position: 'random', respawnable: true, size: [70, 90] },
    { type: 'Bunny', amount: Math.round(a / 9.5e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Moose', amount: Math.round(a / 34e6), position: 'random', respawnable: true, size: [190, 250] },
    { type: 'AmbientShrub', amount: Math.round(a / 1e6), position: 'random', size: [40, 80], style: 'grass' },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 4e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 3e6), position: 'random', size: [22, 48], spawnGap: 6, cluster: [3, 5], clusterChance: 0.35 },
  ],
  'Earth:big': (a) => [
    { type: 'MossyRock', amount: Math.round(a / 20e6), position: 'random', size: [500, 700] },
    { type: 'Bush', amount: Math.round(a / 1.7e6), position: 'random', size: [100, 400] },
    { type: 'Pond', amount: Math.round(a / 10e6), position: 'random', size: [400, 900] },
    { type: 'Rock', amount: Math.round(a / 20e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 4.75e6), position: 'random', respawnable: true },
    { type: 'Cat', amount: Math.round(a / 15.5e6), position: 'random', respawnable: true, size: [70, 90] },
    { type: 'Bunny', amount: Math.round(a / 9.5e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Moose', amount: Math.round(a / 34e6), position: 'random', respawnable: true, size: [190, 250] },
    { type: 'Ore', amount: Math.round(a / 8.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'Ancient', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 6, 60 * 14], size: [275, 375], health: 800, isBoss: true, damage: 9, rotationSpeed: 10, swordSize: 100, boulderSize: 200 },
    { type: 'AmbientShrub', amount: Math.round(a / 1e6), position: 'random', size: [40, 80], style: 'grass' },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 4e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 3e6), position: 'random', size: [22, 48], spawnGap: 6, cluster: [3, 5], clusterChance: 0.35 },
  ],
  'Earth:safezone': (a) => [
    { type: 'MossyRock', amount: Math.round(a / 30e6), position: 'random', size: [500, 700] },
    { type: 'Bush', amount: Math.round(a / 3.4e6), position: 'random', size: [100, 400], spacingGroup: true, spawnGap: 350, spawnBuffer: 500 },
    { type: 'Pond', amount: 1, position: 'random', size: [500, 800] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: 20, position: 'random', respawnable: true, maxRarity: 2 },
    { type: 'Ore', amount: 3, position: 'random', respawnable: true, respawnTime: [45, 120], maxRarity: 2 },
    { type: 'Bunny', amount: 5, position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Cat', amount: 2, position: 'random', respawnable: true, size: [70, 90] },
    { type: 'AmbientShrub', amount: Math.round(a / 1.2e6), position: 'random', size: [40, 80], style: 'grass' },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 3e6), position: 'random', size: [22, 48], spawnGap: 6, cluster: [3, 5], clusterChance: 0.35 },
  ],
  'Earth:central': (a) => [
    { type: 'MossyRock', amount: Math.round(a / 30e6), position: 'random', size: [500, 700] },
    { type: 'Bush', amount: Math.round(a / 4e6), position: 'random', size: [100, 400] },
    { type: 'Pond', amount: Math.round(a / 12e6), position: 'random', size: [400, 900] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 6.0e6), position: 'random', respawnable: true },
    { type: 'Ore', amount: Math.round(a / 9.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'Bunny', amount: Math.round(a / 9.5e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Wolf', amount: Math.round(a / 40e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'Ancient', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 6, 60 * 14], size: [275, 375], health: 800, isBoss: true, damage: 9, rotationSpeed: 10, swordSize: 100, boulderSize: 200 },
    { type: 'AmbientShrub', amount: Math.round(a / 1e6), position: 'random', size: [40, 80], style: 'grass' },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 3e6), position: 'random', size: [22, 48], spawnGap: 6, cluster: [3, 5], clusterChance: 0.35 },
  ],

  Fire: (a) => [
    { type: 'LavaPool', amount: 1, position: 'center', offset: [-400, 0], size: 4500 },
    { type: 'LavaRock', amount: Math.round(a / 24e6), position: 'random', size: [300, 600] },
    { type: 'LavaPool', amount: Math.round(a / 5.7e6), position: 'random', size: [200, 700] },
    { type: 'Rock', amount: Math.round(a / 34e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 4.25e6), position: 'random', respawnable: true },
    { type: 'Chimera', amount: Math.round(a / 22e6), position: 'random', respawnable: true, size: [70, 120] },
    { type: 'IceSpirit', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [70, 110], skin: 1 },
    { type: 'Ore', amount: Math.round(a / 7.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 1 },
    { type: 'Roku', amount: 1, position: 'center', offset: [0, -2400], respawnable: true, respawnTime: [60 * 10, 60 * 15], size: [500, 600], health: 1000, isBoss: true, damage: 8, rotationSpeed: 5, fireballSize: 100 },
    { type: 'IceSpirit', amount: 1, position: 'center', offset: [0, 2400], respawnable: true, respawnTime: [60 * 8, 60 * 14], size: 200, health: 500, isBoss: true, skin: 1 },
  ],

  Ice: (a) => [
    { type: 'IceMound', amount: Math.round(a / 4.9e6), position: 'random', size: [300, 700] },
    { type: 'IcePond', amount: Math.round(a / 15.5e6), position: 'random', size: [600, 900] },
    { type: 'IceSpike', amount: Math.round(a / 8.5e6), position: 'random', size: [200, 600] },
    { type: 'Rock', amount: Math.round(a / 34e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 4.25e6), position: 'random', respawnable: true },
    { type: 'Yeti', amount: Math.round(a / 30e6), position: 'random', respawnable: true, size: [80, 110] },
    { type: 'Wolf', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'IceSpirit', amount: Math.round(a / 55e6), position: 'random', respawnable: true, size: [70, 100] },
    { type: 'Ore', amount: Math.round(a / 7.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 4 },
    { type: 'Yeti', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 7, 60 * 17], size: [300, 400], health: 750, isBoss: true, damage: 1.0, speed: 20 },
  ],

  Alpine: (a) => [
    { type: 'Bush', amount: Math.round(a / 1.9e6), position: 'random', size: [150, 400], variant: 'pine' },
    { type: 'Rock', amount: Math.round(a / 18e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 4.5e6), position: 'random', respawnable: true },
    { type: 'Moose', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [190, 250] },
    { type: 'Wolf', amount: Math.round(a / 22e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'IceSpirit', amount: Math.round(a / 35e6), position: 'random', respawnable: true, size: [70, 100] },
    { type: 'Ore', amount: Math.round(a / 8.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'IceSpirit', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 8, 60 * 14], size: 200, health: 500, isBoss: true },
    { type: 'AmbientShrub', amount: Math.round(a / 1.15e6), position: 'random', size: [45, 90], style: 'alpine' },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 1.5e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 5e6), position: 'random', size: [22, 48], spawnGap: 6, cluster: [2, 4], clusterChance: 0.3, maxVariant: 3 },
  ],

  Meadow: (a) => [
    { type: 'Pond', amount: 1, position: 'center', size: 2400 },
    { type: 'Bush', amount: Math.round(a / 2.4e6), position: 'random', size: [120, 380], variant: 'meadow' },
    { type: 'Pond', amount: Math.round(a / 6e6), position: 'random', size: [350, 800] },
    { type: 'MossyRock', amount: Math.round(a / 25e6), position: 'random', size: [400, 600] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.0e6), position: 'random', respawnable: true },
    { type: 'Bunny', amount: Math.round(a / 8e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Moose', amount: Math.round(a / 32e6), position: 'random', respawnable: true, size: [190, 250] },
    { type: 'Ore', amount: Math.round(a / 9.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'Ancient', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 6, 60 * 14], size: [275, 375], health: 700, isBoss: true, damage: 8, rotationSpeed: 10, swordSize: 100, boulderSize: 200 },
    { type: 'AmbientShrub', amount: Math.round(a / 1.33e6), position: 'random', size: [40, 80], style: 'meadow' },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 4e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'flower', amount: Math.round(a / 1.5e6), position: 'random', size: [22, 48], spawnGap: 5, cluster: [3, 6], clusterChance: 0.4 },
  ],

  Savanna: (a) => [
    { type: 'Bush', amount: Math.round(a / 3.2e6), position: 'random', size: [150, 400], variant: 'savannapalm' },
    { type: 'Rock', amount: Math.round(a / 20e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.5e6), position: 'random', respawnable: true },
    { type: 'Cat', amount: Math.round(a / 14e6), position: 'random', respawnable: true, size: [70, 90], skin: 1 },
    { type: 'Bunny', amount: Math.round(a / 9e6), position: 'random', respawnable: true, size: [40, 60], skin: 1 },
    { type: 'Ore', amount: Math.round(a / 9.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 1.5e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'rock', style: 'desert', amount: Math.round(a / 3e6), position: 'random', size: [40, 85] },
  ],

  Oasis: (a) => [
    { type: 'OasisLake', amount: 1, position: 'center', offset: [0, -300], size: 3200 },
    { type: 'Bush', amount: Math.round(a / 4e6), position: 'random', size: [150, 400], variant: 'palm' },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.0e6), position: 'random', respawnable: true },
    { type: 'Wolf', amount: Math.round(a / 20e6), position: 'random', respawnable: true, size: [45, 60], skin: 1 },
    { type: 'Bunny', amount: Math.round(a / 9e6), position: 'random', respawnable: true, size: [40, 60], skin: 1 },
    { type: 'Ore', amount: Math.round(a / 9.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 2 },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 3e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'rock', style: 'desert', amount: Math.round(a / 3e6), position: 'random', size: [40, 85] },
  ],

  Desert: (a) => [
    { type: 'Cactus', amount: Math.round(a / 8e6), position: 'random', size: [320, 440] },
    { type: 'Rock', amount: Math.round(a / 18e6), position: 'random', size: [200, 400] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.0e6), position: 'random', respawnable: true },
    { type: 'Moose', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [180, 230], skin: 1 },
    { type: 'Wolf', amount: Math.round(a / 22e6), position: 'random', respawnable: true, size: [45, 60], skin: 1 },
    { type: 'Ore', amount: Math.round(a / 8.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 2 },
    { type: 'Sphinx', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 6, 60 * 14], size: [220, 280], health: 850, isBoss: true, damage: 6, sandBlockSize: 100, sandBallSize: 80 },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 3e6), position: 'random', size: [40, 85] },
    { type: 'AmbientShrub', kind: 'rock', style: 'desert', amount: Math.round(a / 3e6), position: 'random', size: [40, 85] },
  ],

  Dirt: (a) => [
    { type: 'DeadBush', amount: Math.round(a / 1.5e6), position: 'random', size: [120, 320] },
    { type: 'MossyRock', amount: Math.round(a / 25e6), position: 'random', size: [400, 600] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.5e6), position: 'random', respawnable: true },
    { type: 'Bunny', amount: Math.round(a / 12e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Wolf', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'Ore', amount: Math.round(a / 7.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 3 },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 1.5e6), position: 'random', size: [40, 85] },
  ],
  'Dirt:corner': (a) => [
    { type: 'DeadBush', amount: Math.round(a / 1.5e6), position: 'random', size: [120, 320] },
    { type: 'MossyRock', amount: Math.round(a / 25e6), position: 'random', size: [400, 600] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.5e6), position: 'random', respawnable: true },
    { type: 'Bunny', amount: Math.round(a / 12e6), position: 'random', respawnable: true, size: [40, 60] },
    { type: 'Wolf', amount: Math.round(a / 28e6), position: 'random', respawnable: true, size: [85, 105] },
    { type: 'Ore', amount: Math.round(a / 7.0e6), position: 'random', respawnable: true, respawnTime: [45, 120], skin: 3 },
    { type: 'Ancient', amount: 1, position: 'random', respawnable: true, respawnTime: [60 * 6, 60 * 14], size: [275, 375], health: 800, isBoss: true, damage: 9, rotationSpeed: 10, swordSize: 100, boulderSize: 200, skin: 2 },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 1.5e6), position: 'random', size: [40, 85] },
  ],

  Rocks: (a) => [
    { type: 'Rock', amount: Math.round(a / 4e6), position: 'random', size: [250, 500] },
    { type: 'MossyRock', amount: Math.round(a / 10e6), position: 'random', size: [400, 600] },
    { type: 'Ore', amount: Math.round(a / 2.0e6), position: 'random', respawnable: true, respawnTime: [45, 120] },
    { type: 'Coin', amount: 0, position: 'random', respawnable: true },
    { type: 'Chest', amount: Math.round(a / 5.0e6), position: 'random', respawnable: true },
    { type: 'AmbientShrub', kind: 'rock', amount: Math.round(a / 1.5e6), position: 'random', size: [40, 85] },
    { type: 'Ore', amount: 1, position: 'center', boss: true, isBoss: true, rarity: 9, size: 1200, health: 1000, totalCoins: 50000, respawnable: true, respawnTime: [60 * 8, 60 * 14] },
  ],

  River: (a) => [
    { type: 'Fish', amount: Math.round(a / 15e6), position: 'random', respawnable: true, size: [53, 73] },
    { type: 'AngryFish', amount: Math.round(a / 15e6), position: 'random', respawnable: true, size: [53, 73] },
  ],
};

const minAutopopulateArea = 4e6;

function autoPopulateObjects(typeName, area, variant) {
  const key = variant ? `${typeName}:${variant}` : null;
  const factory = (key && autoObjects[key]) || autoObjects[typeName];
  if (!factory) return [];
  if (area < minAutopopulateArea) return [];
  return factory(area).filter(o => o.amount > 0);
}

function loadMap() {
  const jsonPath = path.resolve(__dirname, 'main.json');
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const scale = typeof raw.scale === 'number' && raw.scale > 0 ? raw.scale : 1;

  if (raw.worldWidth) config.world.worldWidth = raw.worldWidth;
  if (raw.worldHeight) config.world.worldHeight = raw.worldHeight;

  const scalePair = (p) => [p[0] * scale, p[1] * scale];

  const biomes = [];
  for (const b of raw.biomes) {
    const type = typeof b.type === 'number' ? b.type : biomeNameToType[b.type];
    if (!type) {
      console.warn('[mapLoader] Unknown biome type:', b.type);
      continue;
    }

    const out = {
      type,
      pos: b.pos ? scalePair(b.pos) : [0, 0],
      objects: [],
      spawnZones: resolveSpawnZones(b.spawnZones || []),
    };

    let area = 0;
    if (b.radius !== undefined) {
      out.radius = b.radius * scale;
      area = Math.PI * out.radius * out.radius;
    } else if (b.controlPoints && b.controlPoints.length >= 3) {
      const closed = b.closed !== false;
      const samplesPerSegment = b.samplesPerSegment || 12;
      const collisionTolerance = (b.collisionTolerance || 60) * scale;
      const scaledControls = b.controlPoints.map(scalePair);
      const dense = sampleCatmullRom(scaledControls, samplesPerSegment, closed);
      const simplified = simplifyDP(dense, collisionTolerance);
      out.points = simplified;
      out.renderPoints = dense;
      area = polygonArea(dense);
    } else if (b.points) {
      out.points = b.points.map(scalePair);
      area = polygonArea(out.points);
    } else if (b.width !== undefined && b.height !== undefined) {
      out.width = b.width * scale;
      out.height = b.height * scale;
      area = out.width * out.height;
    } else {
      console.warn('[mapLoader] Biome has no shape:', b);
      continue;
    }

    const typeName = typeof b.type === 'string' ? b.type : Object.keys(biomeNameToType).find(k => biomeNameToType[k] === type);
    const userSpecified = Array.isArray(b.objects) && b.objects.length > 0;
    if (userSpecified) {
      out.objects = resolveObjects(b.objects);
    } else if (b.autoPopulate !== false && b.radius === undefined) {
      out.objects = resolveObjects(autoPopulateObjects(typeName, area, b.variant));
    }

    if (b.variant) out.variant = b.variant;

    biomes.push(out);
  }

  console.log(`[mapLoader] loaded ${biomes.length} biomes, biome scale=${scale}, world=${raw.worldWidth}×${raw.worldHeight}`);

  return {
    worldWidth: raw.worldWidth,
    worldHeight: raw.worldHeight,
    scale,
    coinsCount: raw.coinsCount !== undefined ? raw.coinsCount : 0,
    chestCount: raw.chestCount,
    aiPlayersCount: raw.aiPlayersCount !== undefined ? raw.aiPlayersCount : 200,
    spawnZones: resolveSpawnZones(raw.spawnZones || []),
    biomes,
  };
}

module.exports = loadMap();
