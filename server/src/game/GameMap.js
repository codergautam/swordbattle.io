const Biome = require('./biomes/Biome');
const EarthBiome = require('./biomes/EarthBiome');
const FireBiome = require('./biomes/FireBiome');
const IceBiome = require('./biomes/IceBiome');
const River = require('./biomes/River');
const Safezone = require('./biomes/Safezone');
const House1 = require('./entities/House1');
const MossyRock = require('./entities/MossyRock');
const Pond = require('./entities/Pond');
const Circle = require('./shapes/Circle');
const Polygon = require('./shapes/Polygon');
const Bush = require('./entities/Bush');
const IceMound = require('./entities/IceMound');
const IcePond = require('./entities/IcePond');
const IceSpike = require('./entities/IceSpike');
const Rock = require('./entities/Rock');
const LavaRock = require('./entities/LavaRock');
const LavaPool = require('./entities/LavaPool');
const Chest = require('./entities/Chest');
const Coin = require('./entities/Coin');
const Types = require('./Types');
const map = require('./maps/main');

class GameMap {
  constructor(game) {
    this.game = game;
    this.biomes = [];
    this.staticObjects = [];
    this.mapObjects = new Set();
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.safezone = null;
    this.shape = null;

    this.coinsCount = map.coinsCount || 100;
    this.chestsCount = map.chestCount || 50;
  }

  initialize() {
    for (const biomeData of map.biomes) {
      this.addBiome(biomeData);
    }
    this.calculateMapBounds();

    for (let i = 0; i < this.chestsCount; i++) {
      this.addEntity({
        type: Types.Entity.Chest,
        respawnable: true,
        spawnZone: this.shape,
      });
    }
    for (let i = 0; i < this.coinsCount; i++) {
      this.addEntity({
        type: Types.Entity.Coin,
        respawnable: true,
        spawnZone: this.shape,
      });
    }
  }

  addEntity(objectData) {
    let ObjectClass;
    switch (objectData.type) {
      case Types.Entity.MossyRock: ObjectClass = MossyRock; break;
      case Types.Entity.Pond: ObjectClass = Pond; break;
      case Types.Entity.Bush: ObjectClass = Bush; break;
      case Types.Entity.IceMound: ObjectClass = IceMound; break;
      case Types.Entity.IcePond: ObjectClass = IcePond; break;
      case Types.Entity.IceSpike: ObjectClass = IceSpike; break;
      case Types.Entity.Rock: ObjectClass = Rock; break;
      case Types.Entity.LavaRock: ObjectClass = LavaRock; break;
      case Types.Entity.LavaPool: ObjectClass = LavaPool; break;
      case Types.Entity.Chest: ObjectClass = Chest; break;
      case Types.Entity.Coin: ObjectClass = Coin; break;
    }

    if (!ObjectClass) return console.warn('Unknown entity type: ', objectData);

    const entity = new ObjectClass(this.game, objectData);
    if (entity.isStatic) {
      this.staticObjects.push(entity);
    } else {
      this.mapObjects.add(entity);
    }
    this.game.addEntity(entity);
    return entity;
  }

  addBiome(biomeData) {
    let BiomeClass = Biome;
    switch (biomeData.type) {
      case 'river': BiomeClass = River; break;
      case 'fire': BiomeClass = FireBiome; break;
      case 'earth': BiomeClass = EarthBiome; break;
      case 'ice': BiomeClass = IceBiome; break;
      case 'safezone': BiomeClass = Safezone; break;
    }

    const x = biomeData.pos[0];
    const y = biomeData.pos[1];
    let shape;

    if (biomeData.radius !== undefined) {
      shape = Circle.create(x, y, biomeData.radius);
    } else if (biomeData.points !== undefined) {
      shape = Polygon.createFromPoints(x, y, biomeData.points);
    } else if (biomeData.width !== undefined && biomeData.height !== undefined) {
      shape = Polygon.createFromRectangle(x, y, biomeData.width, biomeData.height);
    } else {
      throw new Error('Unknown biome shape: ' + JSON.stringify(biomeData));
    }

    const biome = new BiomeClass(this.game, shape);
    biome.initialize(biomeData);
    this.biomes.push(biome);
    if (biome.type === Types.Biome.Safezone) {
      this.safezone = biome;
    }
    return biome;
  }

  spawnPlayer(player) {
    this.safezone.shape.randomSpawnInside(player.shape);
  }

  calculateMapBounds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const biome of this.biomes) {
      const bounds = biome.shape.boundary;
      if (minX > bounds.x) minX = bounds.x;
      if (minY > bounds.y) minY = bounds.y;
      if (maxX < bounds.x + bounds.width) maxX = bounds.x + bounds.width;
      if (maxY < bounds.y + bounds.height) maxY = bounds.y + bounds.height;
    }

    this.x = minX;
    this.y = minY;
    this.width = maxX - minX;
    this.height = maxY - minY;
    this.shape = Polygon.createFromRectangle(this.x, this.y, this.width, this.height);
  }

  processBorderCollision(entity) {
    const bounds = entity.shape.boundary;

    if (bounds.x < this.x) {
      entity.shape.x = this.x + bounds.width * (0.5 - entity.shape.centerOffset.x);
    } else if (bounds.x + bounds.width >= this.x + this.width) {
      entity.shape.x = this.x + this.width - bounds.width * (0.5 + entity.shape.centerOffset.x);
    }
    if (bounds.y < this.y) {
      entity.shape.y = this.y + bounds.height * (0.5 - entity.shape.centerOffset.y);
    } else if (bounds.y + bounds.height >= this.y + this.height) {
      entity.shape.y = this.y + this.height - bounds.height * (0.5 + entity.shape.centerOffset.y);
    }
  }

  getData() {
    const biomesData = this.biomes.map((biome) => biome.getData());
    return {
      biomes: biomesData,
      staticObjects: this.staticObjects.map((obj) => obj.createState()),
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

module.exports = GameMap;
