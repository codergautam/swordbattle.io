class Property {
  constructor(baseValue, enableMultiplierCombo = false) {
    this.baseValue = baseValue;
    this.multiplier = 1;
    this.multiplierComboEnabled = enableMultiplierCombo;
    if(enableMultiplierCombo) {
      this.multiplier = {
        default: 1,
      }
    }
    this.boost = 0;
  }

  get value() {
    if(typeof this.multiplier === 'object') {
      let multiplier = 1;
      for(let key in this.multiplier) {
        multiplier *= this.multiplier[key];
      }
      return (this.baseValue + this.boost) * multiplier;
    }
    return (this.baseValue + this.boost) * this.multiplier;
  }

  set value(value) {
    this.baseValue = value;
  }

  reset() {
    if(typeof this.multiplier === 'object') {
      this.multiplier = {
        default: 1,
      }
    } else {
      this.multiplier = 1;
    }
    this.boost = 0;
  }
}

module.exports = Property;
