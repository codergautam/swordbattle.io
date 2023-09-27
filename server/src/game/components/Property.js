class Property {
  constructor(baseValue) {
    this.baseValue = baseValue;
    this.multiplier = 1;
    this.boost = 0;
  }

  get value() {
    return (this.baseValue + this.boost) * this.multiplier;
  }

  set value(value) {
    this.baseValue = value;
  }

  reset() {
    this.multiplier = 1;
    this.boost = 0;
  }
}

module.exports = Property;
