class Loop {
  constructor(interval = 1000) {
    this.eventHandler = (deltaTime) => {};
    this.interval = interval;
    this.isRunning = false;
    this.tps = 0;
    this.ticksThisSecond = 0;
    this.lastTickTime = process.hrtime();
    this.lastSecond = this.lastTickTime[0];
    this.accumulator = 0;
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler;
  }

  start() {
    if (this.isRunning) {
      console.trace('Loop is already running.');
      return;
    }
    this.isRunning = true;
    this.runLoop();
  }

  stop() {
    this.isRunning = false;
    this.tps = 0;
    this.ticksThisSecond = 0;
  }

  runLoop() {
    if (!this.isRunning) return;

    const startTime = process.hrtime();
    this.updateTPS(startTime);
    this.eventHandler();

    const passedTime = this.calculateElapsedTime(process.hrtime(), startTime);
    if (passedTime < this.interval) {
      const delay = this.interval - passedTime;
      setTimeout(() => this.runLoop(), delay);
    } else {
      this.runLoop();
    }
    this.lastTickTime = startTime;
    // console.log('tps:', this.tps, '| tick time:', passedTime, '| delta time:', deltaTime);
  }

  calculateElapsedTime(endTime, startTime) {
    return (endTime[0] - startTime[0]) * 1000 + (endTime[1] - startTime[1]) / 1e6;
  }

  updateTPS(currentTime) {
    const currentSecond = currentTime[0];
    if (currentSecond !== this.lastSecond) {
      this.tps = this.ticksThisSecond;
      this.ticksThisSecond = 0;
      this.lastSecond = currentSecond;
    }
    this.ticksThisSecond++;
  }
}

module.exports = Loop;
