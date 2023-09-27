const Types = require('./Types');

class GlobalEntities {
  static fields = ['id', 'name', 'coins', 'shapeData', 'removed'];

  constructor(game) {
    this.game = game;
    this.getAllCache = null;
    this.getChangesCache = null;
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
      for (const player of this.game.players) {
        this.filterAndWrite(this.getAllCache, player.id, player.state.get());
      }
    }
    return this.getAllCache;
  }

  getChanges() {
    if (!this.getChangesCache) {
      this.getChangesCache = {};
      for (const player of this.game.players) {
        if (this.game.newEntities.has(player)) {
          this.filterAndWrite(this.getChangesCache, player.id, player.state.get());
        } else {
          this.filterAndWrite(this.getChangesCache, player.id, player.state.getChanges());
        }
      }
      for (const entity of this.game.removedEntities) {
        if (entity.type === Types.Entity.Player) {
          this.getChangesCache[entity.id] = { removed: true };
        }
      }
    }
    return this.getChangesCache;
  }

  cleanup() {
    this.getAllCache = null;
    this.getChangesCache = null;
  }
}

module.exports = GlobalEntities;
