import Game from './scenes/Game';
import Biome, { BiomeType } from './biomes/Biome';
import Safezone from './biomes/Safezone';
import River from './biomes/River';
import { BiomeTypes } from './Types';
import { GetEntityClass } from './entities';

class GameMap {
  scene: Game;
  biomes: BiomeType[] = [];
  staticObjects: any[] = [];
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  constructor(scene: Game) {
    this.scene = scene;
  }

  update() {
    this.biomes.forEach((biome: any) => biome.update());
  }

  updateMapData(mapData: any) {
    this.x = mapData.x;
    this.y = mapData.y;
    this.width = mapData.width;
    this.height = mapData.height;
    this.scene.physics.world.setBounds(this.x, this.y, this.width, this.height);
    mapData.biomes.forEach((biomeData: any) => this.addBiome(biomeData));
    if (mapData.staticObjects) {
      mapData.staticObjects.forEach(((objectData: any) => this.addStaticObject(objectData)));
    }
    this.sortBiomes();
    this.scene.hud.minimap.updateMapData();
  }

  addStaticObject(objectData: any) {
    const EntityClass = GetEntityClass(objectData.type);
    const entity = new EntityClass(this.scene);
    entity.updateState(objectData);
    entity.createSprite();
    entity.setDepth();
    this.staticObjects.push(entity);
    return entity;
  }

  addBiome(biomeData: any) {
    let BiomeClass;
    switch (biomeData.type) {
      case BiomeTypes.Fire: BiomeClass = Biome; break;
      case BiomeTypes.Ice: BiomeClass = Biome; break;
      case BiomeTypes.Earth: BiomeClass = Biome; break;
      case BiomeTypes.River: BiomeClass = River; break;
      case BiomeTypes.Safezone: BiomeClass = Safezone; break;
    }
    if (!BiomeClass) return console.log('Unknown biome type: ', biomeData.type);

    const biome = new BiomeClass(this.scene, biomeData);
    biome.createSprite();
    this.biomes.push(biome);
  }

  sortBiomes() {
    this.biomes.sort((a, b) => a.zIndex - b.zIndex);
  }
}

export default GameMap;
