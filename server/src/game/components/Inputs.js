class Inputs {
  constructor(downInputs = []) {
    this.downInputs = downInputs;
  }

  get() {
    return this.downInputs;
  }

  set(inputs) {
    this.downInputs = inputs;
  }

  clear() {
    this.downInputs = [];
  }

  clone() {
    return this.downInputs.slice();
  }

  isInputDown(inputType) {
    return this.downInputs.includes(inputType);
  }

  isInputUp(inputType) {
    return !this.isInputDown(inputType);
  }

  inputDown(inputType) {
    if (this.isInputDown(inputType)) {
      return;
    }
    this.downInputs.push(inputType);
  }

  inputUp(inputType) {
    if (this.isInputUp(inputType)) {
      return;
    }
    this.downInputs.splice(this.downInputs.indexOf(inputType), 1);
  }

  difference(other) {
    const difference = [];

    const newlyDown = this.downInputs.filter(i => other.downInputs.indexOf(i) < 0);
    newlyDown.forEach(input => {
      difference.push({
        inputType: input,
        inputDown: true,
      });
    });

    const newlyUp = other.downInputs.filter(i => this.downInputs.indexOf(i) < 0);
    newlyUp.forEach(input => {
      difference.push({
        inputType: input,
        inputDown: false,
      });
    });

    return difference;
  }
};

module.exports = Inputs;
