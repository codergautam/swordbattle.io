class Effect {
  constructor(player, id, config = {}) {
    this.player = player;
    this.id = id;
    this.processConfig(config);
  }

  processConfig(config) {
    this.duration = config.duration !== undefined ? config.duration : null;
    this.runtimes = config.runtimes !== undefined ? config.runtimes : 1;
    this.initialDuration = this.duration;
    this.initialRuntimes = this.runtimes;
    this.entity = config.entity;
  }

  update(dt) {
    if (this.duration !== null) {
      this.duration -= dt;
      if (this.duration <= 0) {
        this.remove();
      }
    } else {
      this.runtimes -= 1;
      if (this.runtimes <= 0) {
        this.remove();
      }
    }
  }

  continue(config) {
    this.processConfig(config);
  }

  remove() {
    this.player.effects.delete(this.id);
  }
}

module.exports = Effect;
