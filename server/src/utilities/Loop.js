class Loop {
  constructor(interval = 50) { // 1000ms / 20tps = 50ms per tick
    this.eventHandler = (deltaTime) => {};
    this.onTpsUpdate = (tps) => {};
    this.interval = interval;
    this.isRunning = false;
    this.tps = 0;
    this.ticksThisSecond = 0;
    this.lastTickTime = process.hrtime();
    this.lastSecond = this.lastTickTime[0];
    this.tickTimeElapsed = 0;
    this.accumulator = 0;
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler;
  }

  setOnTpsUpdate(onTpsUpdate) {
    this.onTpsUpdate = onTpsUpdate;
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

    const currentTime = process.hrtime();
    this.accumulator += this.calculateElapsedTime(currentTime, this.lastTickTime);
    this.lastTickTime = currentTime;

    while (this.accumulator >= this.interval) {
      this.updateTPS(currentTime);
      const now = Date.now();
      this.eventHandler();
      this.tickTimeElapsed = Date.now() - now;
      this.accumulator -= this.interval;
    }

    const delay = this.interval - (this.accumulator % this.interval);
    setTimeout(() => this.runLoop(), delay);
  }

  calculateElapsedTime(endTime, startTime) {
    return (endTime[0] - startTime[0]) * 1000 + (endTime[1] - startTime[1]) / 1e6;
  }

  updateTPS(currentTime) {
    const currentSecond = currentTime[0];
    if (currentSecond !== this.lastSecond) {
      console.log('tps:', this.tps,' | expected tps:', 1000 / this.interval, ' | tick time:', this.tickTimeElapsed);
      this.tps = this.ticksThisSecond;
      this.onTpsUpdate(this.tps);
      this.ticksThisSecond = 0;
      this.lastSecond = currentSecond;
    }
    this.ticksThisSecond++;
  }
}

module.exports = Loop;
