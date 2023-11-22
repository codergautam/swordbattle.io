class IdPool {
  constructor() {
    this.available = [1];
  }

  take() {
    const id = this.available.shift();
    if (this.available.length === 0) {
      this.available.push(id + 1);
    }
    return id;
  }

  give(id) {
    if (this.available.includes(id)) {
      console.debug(`Warning: Duplicate id in the id pool: ${id}. Id pool size: ${this.available.length}`);
    } else {
      this.available.unshift(id);
    }
  }

  reset() {
    this.available = [0];
  }
}

module.exports = IdPool;
