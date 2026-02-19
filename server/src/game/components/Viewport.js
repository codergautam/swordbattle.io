const Property = require('./Property');

class Viewport {
  constructor(entity, width, height, zoom = 1) {
    this.entity = entity;
    this.width = width;
    this.height = height;
    this.zoom = new Property(zoom);
    this._boundary = { x: 0, y: 0, width: 0, height: 0 };
  }

  get boundary() {
    const w = this.width / this.zoom.value;
    const h = this.height / this.zoom.value;
    this._boundary.x = this.entity.shape.x - w / 2;
    this._boundary.y = this.entity.shape.y - h / 2;
    this._boundary.width = w;
    this._boundary.height = h;
    return this._boundary;
  }
}

module.exports = Viewport;
