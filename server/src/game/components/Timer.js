const helpers = require('../../helpers');

class Timer {
  constructor(time, minTime, maxTime) {
    this.time = time;
    this.minTime = minTime;
    this.maxTime = maxTime === undefined ? minTime : maxTime;
    this.duration = helpers.random(minTime, maxTime);
    this.finished = false;
  }

  get progress() {
    return this.time / this.duration;
  }

  renew() {
    this.time = 0;
    this.finished = false;
    this.duration = helpers.random(this.minTime, this.maxTime);
  }

  update(dt) {
    if (this.time < this.duration) {
      this.time += dt;
    }
    if (this.time >= this.duration) {
      this.time = this.duration;
      this.finished = true;
    }
  }
}

module.exports = Timer;
