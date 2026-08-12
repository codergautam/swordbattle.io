const { rectangleRectangle } = require('../collisions');

class WorldIndex {
  constructor(boundary, cellSize = 512) {
    this.boundary = boundary;
    this.cellSize = cellSize;
    // Two-level numeric maps avoid allocating a "x:y" string for every
    // entity cell and every queried cell on every tick.
    this.staticGrid = new Map();
    this.dynamicGrid = new Map();
    this.staticRecords = new Set();
    this.dynamicRecords = new Set();
    this.records = new Map();
    this.queryGeneration = 0;
    this.anonymousId = -1;
    this.initialized = false;
    this.syncedEntityCount = 0;
  }

  _bucket(grid, x, y, create = false) {
    let column = grid.get(x);
    if (!column) {
      if (!create) return null;
      column = new Map();
      grid.set(x, column);
    }
    let bucket = column.get(y);
    if (!bucket && create) {
      bucket = new Set();
      column.set(y, bucket);
    }
    return bucket || null;
  }

  _addToGrid(record, updateRecordSet = true) {
    const grid = record.isStatic ? this.staticGrid : this.dynamicGrid;
    const records = record.isStatic ? this.staticRecords : this.dynamicRecords;
    if (updateRecordSet) records.add(record);
    for (let x = record.minCellX; x <= record.maxCellX; x++) {
      for (let y = record.minCellY; y <= record.maxCellY; y++) {
        this._bucket(grid, x, y, true).add(record);
      }
    }
  }

  _removeFromGrid(record, updateRecordSet = true) {
    const grid = record.isStatic ? this.staticGrid : this.dynamicGrid;
    const records = record.isStatic ? this.staticRecords : this.dynamicRecords;
    if (updateRecordSet) records.delete(record);
    for (let x = record.minCellX; x <= record.maxCellX; x++) {
      const column = grid.get(x);
      if (!column) continue;
      for (let y = record.minCellY; y <= record.maxCellY; y++) {
        const bucket = column.get(y);
        if (!bucket) continue;
        bucket.delete(record);
        if (bucket.size === 0) column.delete(y);
      }
      if (column.size === 0) grid.delete(x);
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

  acknowledgeEntityCount(count) {
    this.syncedEntityCount = count;
  }

  _upsert(key, entity, boundary, isStatic) {
    if (!boundary || !rectangleRectangle(this.boundary, boundary)) {
      this.remove(key);
      return null;
    }

    const minCellX = Math.floor(boundary.x / this.cellSize);
    const maxCellX = Math.floor((boundary.x + Math.max(0, boundary.width)) / this.cellSize);
    const minCellY = Math.floor(boundary.y / this.cellSize);
    const maxCellY = Math.floor((boundary.y + Math.max(0, boundary.height)) / this.cellSize);
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
        minCellX,
        maxCellX,
        minCellY,
        maxCellY,
        queryGeneration: 0,
      };
      this.records.set(key, record);
      this._addToGrid(record);
      return record;
    }

    const classificationChanged = record.isStatic !== isStatic;
    const cellsChanged = record.minCellX !== minCellX || record.maxCellX !== maxCellX
      || record.minCellY !== minCellY || record.maxCellY !== maxCellY;
    if (classificationChanged) this._removeFromGrid(record);
    else if (cellsChanged) this._removeFromGrid(record, false);
    record.entity = entity;
    record.x = boundary.x;
    record.y = boundary.y;
    record.width = boundary.width;
    record.height = boundary.height;
    record.isStatic = isStatic;
    record.minCellX = minCellX;
    record.maxCellX = maxCellX;
    record.minCellY = minCellY;
    record.maxCellY = maxCellY;
    if (classificationChanged) this._addToGrid(record);
    else if (cellsChanged) this._addToGrid(record, false);
    return record;
  }

  sync(entities) {
    if (!this.initialized) {
      for (const entity of entities.values()) this.upsertEntity(entity);
      this.initialized = true;
      this.syncedEntityCount = entities.size;
      return;
    }

    // Dynamic bounds can change every tick. Static records only need an
    // identity/classification check, avoiding hundreds of AABB calculations.
    for (const record of this.dynamicRecords) {
      const entity = entities.get(record.key);
      if (!entity || entity.removed || !entity.shape) this.remove(record.key);
      else this.upsertEntity(entity);
    }
    for (const record of this.staticRecords) {
      const entity = entities.get(record.key);
      if (!entity || entity.removed || !entity.shape) this.remove(record.key);
      else if (!entity.isStatic) this.upsertEntity(entity);
    }

    // Game add/remove hooks keep counts equal in normal operation. A count
    // mismatch means a caller mutated its Map directly, so reconcile once.
    if (this.syncedEntityCount !== entities.size) {
      for (const [key] of this.records) {
        if (!entities.has(key)) this.remove(key);
      }
      for (const entity of entities.values()) {
        if (entity && !entity.removed && entity.shape && !this.records.has(entity.id)) {
          this.upsertEntity(entity);
        }
      }
      this.syncedEntityCount = entities.size;
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

  _collect(grid, minX, maxX, minY, maxY, rectangle, generation, results) {
    for (let x = minX; x <= maxX; x++) {
      const column = grid.get(x);
      if (!column) continue;
      for (let y = minY; y <= maxY; y++) {
        const bucket = column.get(y);
        if (!bucket) continue;
        for (const record of bucket) {
          if (record.queryGeneration === generation) continue;
          record.queryGeneration = generation;
          if (rectangleRectangle(record, rectangle)) results.push(record);
        }
      }
    }
  }

  get(rectangle) {
    if (!rectangle || !rectangleRectangle(this.boundary, rectangle)) return [];
    const generation = ++this.queryGeneration;
    const results = [];
    const minX = Math.floor(rectangle.x / this.cellSize);
    // Boundaries are inclusive: an item ending on an edge is visible to a
    // query beginning on that same edge.
    const maxX = Math.floor((rectangle.x + Math.max(0, rectangle.width)) / this.cellSize);
    const minY = Math.floor(rectangle.y / this.cellSize);
    const maxY = Math.floor((rectangle.y + Math.max(0, rectangle.height)) / this.cellSize);
    this._collect(this.staticGrid, minX, maxX, minY, maxY, rectangle, generation, results);
    this._collect(this.dynamicGrid, minX, maxX, minY, maxY, rectangle, generation, results);
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
    this.staticRecords.clear();
    this.dynamicRecords.clear();
    this.records.clear();
    this.initialized = false;
    this.syncedEntityCount = 0;
  }
}

module.exports = WorldIndex;
