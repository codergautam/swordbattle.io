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

    // up right down left
    if ([1, 2, 3, 4].includes(inputType) && typeof this.onDirectionInput === 'function') {
      this.onDirectionInput(inputType);
    }
  }

  inputUp(inputType) {
    if (this.isInputUp(inputType)) {
      return;
    }
    this.downInputs.splice(this.downInputs.indexOf(inputType), 1);
  }

  difference(other) {
    const difference = [];
    const otherSet = new Set(other.downInputs);
    const thisSet = new Set(this.downInputs);

    for (const input of this.downInputs) {
      if (!otherSet.has(input)) {
        difference.push({ inputType: input, inputDown: true });
      }
    }
    for (const input of other.downInputs) {
      if (!thisSet.has(input)) {
        difference.push({ inputType: input, inputDown: false });
      }
    }

    return difference;
  }
};

module.exports = Inputs;
