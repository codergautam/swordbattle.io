const Property = require('./Property');

class Health {
  constructor(max, regen = 1) {
    this.max = new Property(max);
    this.regen = new Property(regen);
    
    this.percent = 1;
    this.isDead = false;
  }

  damaged(damage) {
    const coef = damage / this.max.value;
    this.percent -= coef;

    if (this.percent <= 0) {
      this.percent = 0;
      this.isDead = true;
    }
  }

  update(dt) {
    const coef = this.regen.value / this.max.value * dt;
    this.percent = Math.min(this.percent + coef, 1);
  }

  cleanup() {
    this.max.reset();
    this.regen.reset();
  }
}

module.exports = Health;
