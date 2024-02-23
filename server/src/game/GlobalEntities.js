const Types = require('./Types');

class GlobalEntities {
  static fields = ['id', 'type', 'name', 'coins', 'shapeData', 'removed', 'angle', 'account'];

  constructor(game) {
    this.game = game;
    this.getAllCache = null;
    this.getChangesCache = null;
    this.entities = new Map();
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
      this.entities.forEach((entity, id) => {
        this.filterAndWrite(this.getAllCache, id, entity.state.get());
      });
    }
    return this.getAllCache;
  }

  getChanges() {
    if (!this.getChangesCache) {
      this.getChangesCache = {};
      this.entities.forEach((entity, id) => {
        const fields = entity.state.get(); // update state
        if (this.game.newEntities.has(entity.id)) {
          this.filterAndWrite(this.getChangesCache, id, fields);
        } else {
          this.filterAndWrite(this.getChangesCache, id, entity.state.getChanges());
        }
      });
      this.game.removedEntities.forEach(entity => {
        if (!entity.isGlobal) return;

        this.getChangesCache[entity.id] = { removed: true };
      });
    }
    return this.getChangesCache;
  }

  cleanup() {
    this.getAllCache = null;
    this.getChangesCache = null;
    this.entities.clear();
  }

  addEntity(entity) {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entityId) {
    this.entities.delete(entityId);
  }

  getEntity(entityId) {
    return this.entities.get(entityId);
  }
}

module.exports = GlobalEntities;
