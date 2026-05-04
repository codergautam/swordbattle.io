const Property = require('./Property');

class Health {
  constructor(max, regen = 1, regenWait = 3500) {
    this.max = new Property(max);
    this.regen = new Property(regen);
    this.regenWait = new Property(regenWait);

    this.percent = 1;
    this.isDead = false;
    this.lastDamage = null;
    this.regenWaitUntil = 0;
  }

  static sourceWaitMult(source) {
    if (source === 'throw') return 0.5;
    if (source === 'mob') return 0.66;
    if (source === 'map') return 0.33;
    return 1.0;
  }

  damaged(damage, opts = {}) {
    const { source = 'melee' } = opts;
    const coef = damage / this.max.value;
    this.percent -= coef;
    this.lastDamage = Date.now();

    const newWaitUntil = this.lastDamage + this.regenWait.value * Health.sourceWaitMult(source);
    if (newWaitUntil > this.regenWaitUntil) {
      this.regenWaitUntil = newWaitUntil;
    }

    if (this.percent <= 0) {
      this.percent = 0;
      this.isDead = true;
    }
  }

  gain(amount) {
    this.percent = Math.min(this.percent + amount / this.max.value, 1);
  }

  update(dt) {
    if (Date.now() < this.regenWaitUntil) return;
    const coef = this.regen.value / this.max.value * dt;
    this.percent = Math.min(this.percent + coef, 1);
  }

  cleanup() {
    this.max.reset();
    this.regen.reset();
  }
}

module.exports = Health;
