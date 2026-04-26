const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

const shrubStyleBase = { alpine: 0, grass: 3, meadow: 6 };

class AmbientShrub extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone, Types.Biome.River],
    forbiddenEntities: [
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.IcePond,
      Types.Entity.OasisLake,
    ],
    spawnBuffer: 150,
    spawnGap: 25,
    discardIfBlocked: true,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.AmbientShrub, objectData);
    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);

    const kind = objectData.kind || 'shrub';
    if (objectData.forcedSkin) {
      this.skin = objectData.forcedSkin;
    } else if (kind === 'rock') {
      const v = 1 + Math.floor(Math.random() * 3);
      this.skin = (objectData.style === 'desert' ? 12 : 9) + v;
    } else if (kind === 'flower') {
      const max = objectData.maxVariant || 5;
      this.skin = 19 + (1 + Math.floor(Math.random() * max));
    } else {
      const base = shrubStyleBase[objectData.style] || 0;
      this.skin = base + (1 + Math.floor(Math.random() * 3));
    }
    this.angle = Math.random() * Math.PI * 2;

    this.alsoAvoidShrubs = true;
    this.densityVary = !objectData.clusterMember;
    this.spawn();

    const clusterChance = objectData.clusterChance != null ? objectData.clusterChance : 1;
    if (objectData.cluster && !objectData.clusterMember && !this.spawnFailed
        && Math.random() < clusterChance) {
      const [cmin, cmax] = objectData.cluster;
      const total = cmin + Math.floor(Math.random() * (cmax - cmin + 1));
      const radius = objectData.clusterRadius || (this.size * 1.8 + total * 14);
      const clusterGap = objectData.clusterGap != null ? objectData.clusterGap : 5;
      for (let i = 1; i < total; i++) {
        this.game.map.addEntity({
          ...objectData,
          cluster: undefined,
          clusterMember: true,
          forcedSkin: this.skin,
          spawnGap: clusterGap,
          spawnZone: Circle.create(this.shape.x, this.shape.y, radius),
          position: 'random',
        });
      }
    }
  }

  createState() {
    const state = super.createState();
    state.size = this.size;
    state.skin = this.skin;
    if (this.angle) state.angle = this.angle;
    return state;
  }
}

module.exports = AmbientShrub;
