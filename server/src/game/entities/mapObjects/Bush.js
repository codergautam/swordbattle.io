const Entity = require('../Entity');
const Circle = require('../../shapes/Circle');
const Types = require('../../Types');

const bushVariants = {
  default: 1,
  pine: 2,
  palm: 3,
  meadow: 4,
  cactus: 5,
  savannapalm: 6,
};

class Bush extends Entity {
  static defaultDefinition = {
    forbiddenBiomes: [Types.Biome.Safezone, Types.Biome.TutorialZone],
    spawnBuffer: 250,
    forbiddenEntities: [
      Types.Entity.House1,
      Types.Entity.Pond, Types.Entity.LavaPool, Types.Entity.IcePond,
      Types.Entity.OasisLake,
    ],
    spawnGap: 70,
  };

  constructor(game, objectData) {
    super(game, Types.Entity.Bush, objectData);

    this.isStatic = true;
    this.shape = Circle.create(0, 0, this.size);
    this.targets.add(Types.Entity.Player);

    const v = objectData.variant;
    if (typeof v === 'number') {
      this.variant = v;
    } else if (typeof v === 'string' && bushVariants[v]) {
      this.variant = bushVariants[v];
    } else {
      this.variant = bushVariants.default;
    }

    if (this.variant === bushVariants.palm || this.variant === bushVariants.savannapalm) {
      this.angle = Math.random() * Math.PI * 2;
    }

    this.spawn();
  }

  createState() {
    const data = super.createState();
    if (this.variant && this.variant !== bushVariants.default) {
      data.skin = this.variant;
    }
    if (this.angle) data.angle = this.angle;
    return data;
  }

  processTargetsCollision(player) {
    player.addEffect(Types.Effect.Speed, 'bush', { multiplier: 1 });
  }
}

Bush.VARIANTS = bushVariants;
module.exports = Bush;
