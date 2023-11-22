const helpers = require('../../helpers');

class Timer {
  constructor(time, minTime, maxTime) {
    this.time = time;
    this.minTime = minTime;
    this.maxTime = maxTime === undefined ? minTime : maxTime;
    this.duration = helpers.random(this.minTime, this.maxTime);
    // Prevent NaN
    if(isNaN(this.duration)) {
      throw new Error(`Timer duration is NaN: ${this.duration}`);
    }
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
    if (!this.finished) {
      this.time += dt;
    }
    if (this.time >= this.duration) {
      this.time = this.duration;
      this.finished = true;
    }
  }
}

module.exports = Timer;
