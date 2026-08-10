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
    if (this.isDead) return 0;

    const safeDamage = Number(damage);
    const maxHealth = Number(this.max.value);
    if (!Number.isFinite(safeDamage) || safeDamage <= 0) return 0;
    if (!Number.isFinite(maxHealth) || maxHealth <= 0) return 0;

    const { source = 'melee' } = opts;
    const healthBefore = this.percent * maxHealth;
    const appliedDamage = Math.min(safeDamage, healthBefore);
    const coef = appliedDamage / maxHealth;
    this.percent = appliedDamage >= healthBefore ? 0 : this.percent - coef;
    this.lastDamage = Date.now();

    const newWaitUntil = this.lastDamage + this.regenWait.value * Health.sourceWaitMult(source);
    if (newWaitUntil > this.regenWaitUntil) {
      this.regenWaitUntil = newWaitUntil;
    }

    if (this.percent === 0) {
      this.isDead = true;
    }
    return appliedDamage;
  }

  gain(amount) {
    if (this.isDead) return 0;

    const safeAmount = Number(amount);
    const maxHealth = Number(this.max.value);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return 0;
    if (!Number.isFinite(maxHealth) || maxHealth <= 0) return 0;

    const before = this.percent;
    this.percent = Math.min(this.percent + safeAmount / maxHealth, 1);
    return (this.percent - before) * maxHealth;
  }

  update(dt) {
    if (this.isDead) return;
    if (Date.now() < this.regenWaitUntil) return;
    if (!Number.isFinite(dt) || dt <= 0) return;

    const maxHealth = Number(this.max.value);
    const regeneration = Number(this.regen.value);
    if (!Number.isFinite(maxHealth) || maxHealth <= 0) return;
    if (!Number.isFinite(regeneration) || regeneration <= 0) return;

    const coef = regeneration / maxHealth * dt;
    this.percent = Math.min(this.percent + coef, 1);
  }

  cleanup() {
    this.max.reset();
    this.regen.reset();
  }
}

module.exports = Health;
