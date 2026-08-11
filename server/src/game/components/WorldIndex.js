const { rectangleRectangle } = require('../collisions');

class WorldIndex {
  constructor(boundary, cellSize = 512) {
    this.boundary = boundary;
    this.cellSize = cellSize;
    this.staticGrid = new Map();
    this.dynamicGrid = new Map();
    this.records = new Map();
    this.queryGeneration = 0;
    this.anonymousId = -1;
  }

  _cellRange(rectangle) {
    return {
      minX: Math.floor(rectangle.x / this.cellSize),
      // Collision boundaries are inclusive, so an item ending exactly on a
      // cell edge must also be visible to a query starting on that edge.
      maxX: Math.floor((rectangle.x + Math.max(0, rectangle.width)) / this.cellSize),
      minY: Math.floor(rectangle.y / this.cellSize),
      maxY: Math.floor((rectangle.y + Math.max(0, rectangle.height)) / this.cellSize),
    };
  }

  _cellKeys(rectangle) {
    const range = this._cellRange(rectangle);
    const keys = [];
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let y = range.minY; y <= range.maxY; y++) keys.push(`${x}:${y}`);
    }
    return keys;
  }

  _sameKeys(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  _addToGrid(record) {
    const grid = record.isStatic ? this.staticGrid : this.dynamicGrid;
    for (const key of record.cells) {
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = new Set();
        grid.set(key, bucket);
      }
      bucket.add(record);
    }
  }

  _removeFromGrid(record) {
    const grid = record.isStatic ? this.staticGrid : this.dynamicGrid;
    for (const key of record.cells) {
      const bucket = grid.get(key);
      if (!bucket) continue;
      bucket.delete(record);
      if (bucket.size === 0) grid.delete(key);
    }
  }

  insert(collisionRect, isStatic = !!collisionRect.entity?.isStatic) {
    const entity = collisionRect.entity;
    const key = entity && entity.id !== null && entity.id !== undefined
      ? entity.id
      : this.anonymousId--;
    return this._upsert(key, entity, collisionRect, isStatic);
  }

  upsertEntity(entity) {
    if (!entity || entity.removed || !entity.shape) return null;
    return this._upsert(entity.id, entity, entity.shape.boundary, !!entity.isStatic);
  }

  _upsert(key, entity, boundary, isStatic) {
    if (!boundary || !rectangleRectangle(this.boundary, boundary)) {
      this.remove(key);
      return null;
    }

    const cells = this._cellKeys(boundary);
    let record = this.records.get(key);
    if (!record) {
      record = {
        key,
        entity,
        x: boundary.x,
        y: boundary.y,
        width: boundary.width,
        height: boundary.height,
        isStatic,
        cells,
        queryGeneration: 0,
      };
      this.records.set(key, record);
      this._addToGrid(record);
      return record;
    }

    const membershipChanged = record.isStatic !== isStatic || !this._sameKeys(record.cells, cells);
    if (membershipChanged) this._removeFromGrid(record);
    record.entity = entity;
    record.x = boundary.x;
    record.y = boundary.y;
    record.width = boundary.width;
    record.height = boundary.height;
    record.isStatic = isStatic;
    record.cells = cells;
    if (membershipChanged) this._addToGrid(record);
    return record;
  }

  sync(entities) {
    const seen = new Set();
    for (const entity of entities.values()) {
      if (!entity || entity.removed || !entity.shape) continue;
      seen.add(entity.id);
      this.upsertEntity(entity);
    }
    for (const key of this.records.keys()) {
      if (!seen.has(key)) this.remove(key);
    }
  }

  remove(entityOrId) {
    const key = typeof entityOrId === 'object' ? entityOrId?.id : entityOrId;
    const record = this.records.get(key);
    if (!record) return false;
    this._removeFromGrid(record);
    this.records.delete(key);
    return true;
  }

  get(rectangle) {
    if (!rectangle || !rectangleRectangle(this.boundary, rectangle)) return [];
    const generation = ++this.queryGeneration;
    const results = [];
    const keys = this._cellKeys(rectangle);

    const collect = (grid) => {
      for (const key of keys) {
        const bucket = grid.get(key);
        if (!bucket) continue;
        for (const record of bucket) {
          if (record.queryGeneration === generation) continue;
          record.queryGeneration = generation;
          if (rectangleRectangle(record, rectangle)) results.push(record);
        }
      }
    };

    collect(this.staticGrid);
    collect(this.dynamicGrid);
    results.sort((left, right) => {
      const leftId = left.entity?.id ?? left.key;
      const rightId = right.entity?.id ?? right.key;
      return leftId - rightId;
    });
    return results;
  }

  query(rectangle) {
    return this.get(rectangle);
  }

  clear() {
    this.staticGrid.clear();
    this.dynamicGrid.clear();
    this.records.clear();
  }
}

module.exports = WorldIndex;
