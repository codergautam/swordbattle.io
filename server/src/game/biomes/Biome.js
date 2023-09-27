class Biome {
  constructor(game, type, shape) {
    this.game = game;
    this.type = type;
    this.shape = shape;
  }

  getData() {
    return {
      type: this.type,
      shape: this.shape.getData(),
    };
  }

  initialize(biomeData) {
    biomeData.objects = biomeData.objects || [];

    for (const entityData of biomeData.objects) {
      const data = { ...entityData };
      if (data.position === 'random') data.spawnZone = this.shape;

      for (let i = 0; i < entityData.amount; i++) {
        this.game.map.addEntity(data)
      }
    }
  }

  collides(player) {
    player.biomes.add(this.type);
  }
}

module.exports = Biome;
