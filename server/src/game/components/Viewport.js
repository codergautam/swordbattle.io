const Property = require('./Property');

class Viewport {
  constructor(entity, width, height, zoom = 1) {
    this.entity = entity;
    this.width = width;
    this.height = height;
    this.zoom = new Property(zoom);
  }

  get boundary() {
    const width = this.width / this.zoom.value;
    const height = this.height / this.zoom.value;
    return {
      x: this.entity.shape.x - width / 2,
      y: this.entity.shape.y - height / 2,
      width, height,
    };
  }
}

module.exports = Viewport;
