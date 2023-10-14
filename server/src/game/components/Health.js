const Property = require('./Property');

class Health {
  constructor(max, regen = 1) {
    this.value = new Property(max);
    this.max = new Property(max);
    this.regen = new Property(regen);
    this.isDead = false;
  }

  get percent() {
    return this.value.value / this.max.value;
  }

  damaged(damage) {
    this.value.baseValue -= damage;

    if (this.value.value <= 0) {
      this.value.value = 0;
      this.isDead = true;
    }
  }

  update(dt) {
    this.value.value = Math.min(this.value.baseValue + this.regen.value * dt, this.max.baseValue);
  }

  cleanup() {
    this.value.reset();
    this.max.reset();
    this.regen.reset();
  }
}

module.exports = Health;
