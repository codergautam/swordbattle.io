const Property = require('./Property');

class Health {
  constructor(max, regen = 1, regenWait = 5000) {
    this.max = new Property(max);
    this.regen = new Property(regen);
    this.regenWait = new Property(regenWait);

    this.percent = 1;
    this.isDead = false;
    this.lastDamage = null;
  }

  damaged(damage) {
    const coef = damage / this.max.value;
    this.percent -= coef;
    this.lastDamage = Date.now();

    if (this.percent <= 0) {
      this.percent = 0;
      this.isDead = true;
    }
  }

  update(dt) {
    if(Date.now() - this.lastDamage < this.regenWait.value) return;
    const coef = this.regen.value / this.max.value * dt;
    this.percent = Math.min(this.percent + coef, 1);
  }

  cleanup() {
    this.max.reset();
    this.regen.reset();
  }
}

module.exports = Health;
