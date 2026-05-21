const { rectangleRectangle } = require('../collisions');

let queryGen = 0;

class QuadTree {
  constructor(boundary, capacity = 10, maxLevel = 4, level = 0) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.maxLevel = maxLevel;
    this.level = level;

    this.items = [];
    this.nodes = [];
  }

  insert(collisionRect) {
    if (!rectangleRectangle(this.boundary, collisionRect)) {
      return;
    }

    if (this.nodes.length !== 0) {
      for (const node of this.nodes) {
        node.insert(collisionRect);
      }
      return;
    }

    this.items.push(collisionRect);

    if (this.items.length > this.capacity
      && this.level < this.maxLevel
      && this.nodes.length === 0
    ) {
      this.subdivide();
    }
  }

  subdivide() {
    const {x, y} = this.boundary;
    const subWidth = this.boundary.width / 2;
    const subHeight = this.boundary.height / 2;
    const nextLevel = this.level + 1;

    // Top-right
    this.nodes.push(new QuadTree({
      x: x + subWidth,
      y,
      width: subWidth,
      height: subHeight,
    }, this.capacity, this.maxLevel, nextLevel));
    // Top-left
    this.nodes.push(new QuadTree({
      x,
      y,
      width: subWidth,
      height: subHeight,
    }, this.capacity, this.maxLevel, nextLevel));
    // Bottom-left
    this.nodes.push(new QuadTree({
      x,
      y: y + subHeight,
      width: subWidth,
      height: subHeight,
    }, this.capacity, this.maxLevel, nextLevel));
    // Bottom-right
    this.nodes.push(new QuadTree({
      x: x + subWidth,
      y: y + subHeight,
      width: subWidth,
      height: subHeight,
    }, this.capacity, this.maxLevel, nextLevel));

    // Move all items in subnodes
    for (const item of this.items) {
      for (const node of this.nodes) {
        node.insert(item);
      }
    }
    this.items = [];
  }

  get(collisionRect) {
    const gen = ++queryGen;
    const result = [];
    this._query(collisionRect, gen, result);
    return result;
  }

  _query(collisionRect, gen, result) {
    if (!rectangleRectangle(this.boundary, collisionRect)) {
      return;
    }

    const items = this.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.qgen !== gen) {
        item.qgen = gen;
        result.push(item);
      }
    }

    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i]._query(collisionRect, gen, result);
    }
  }

  query(collisionRect) {
    if (!rectangleRectangle(this.boundary, collisionRect)) {
      return [];
    }

    let found = this.items;

    for (const node of this.nodes) {
      const queried = node.query(collisionRect);
      if (queried.length !== 0) {
        found = found.concat(queried);
      }
    }

    return found;
  }

  clear() {
    this.items.length = 0;
    const nodes = this.nodes;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].clear();
    }
  }
};

module.exports = QuadTree;
