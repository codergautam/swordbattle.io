const Types = require('./Types');

class GlobalEntities {
  static fields = ['id', 'type', 'name', 'coins', 'shapeData', 'removed', 'angle', 'account'];

  constructor(game) {
    this.game = game;
    this.getAllCache = null;
    this.getChangesCache = null;
    this.entities = new Set();
  }

  filterAndWrite(object, id, fields) {
    const filteredFields = {};
    let isEmpty = true;
    for (const key of GlobalEntities.fields) {
      if (fields[key] !== undefined) {
        filteredFields[key] = fields[key];
        isEmpty = false;
      }
    }
    if (!isEmpty) {
      object[id] = filteredFields;
    }
    return filteredFields;
  }

  getAll() {
    if (!this.getAllCache) {
      this.getAllCache = {};
      for (const entity of this.entities) {
        this.filterAndWrite(this.getAllCache, entity.id, entity.state.get());
      }
    }
    return this.getAllCache;
  }

  getChanges() {
    if (!this.getChangesCache) {
      this.getChangesCache = {};
      for (const entity of this.entities) {
        const fields = entity.state.get(); // update state
        if (this.game.newEntities.has(entity)) {
          this.filterAndWrite(this.getChangesCache, entity.id, fields);
        } else {
          this.filterAndWrite(this.getChangesCache, entity.id, entity.state.getChanges());
        }
      }
      for (const entity of this.game.removedEntities) {
        if (!entity.isGlobal) continue;

        this.getChangesCache[entity.id] = { removed: true };
      }
    }
    return this.getChangesCache;
  }

  cleanup() {
    this.getAllCache = null;
    this.getChangesCache = null;
    this.entities.clear(); // Update globals every tick
  }
}

module.exports = GlobalEntities;
