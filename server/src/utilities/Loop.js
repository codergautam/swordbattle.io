class Loop {
  constructor(interval = 50) {
    this.entityCnt = 0;
    this.interval = interval;
    this.isRunning = false;
    this.ticksThisSecond = 0;
    this.lastTickTime = process.hrtime();
    this.lastSecond = this.lastTickTime[0];
    this.tickTimeElapsed = 0;
    this.accumulator = 0;
    this.eventHandler = () => {};
    this.onTpsUpdate = () => {};
  }

  setEventHandler(eventHandler) {
    this.eventHandler = eventHandler;
  }

  setOnTpsUpdate(onTpsUpdate) {
    this.onTpsUpdate = onTpsUpdate;
  }

  setEntityCnt(entityCnt) {
    this.entityCnt = entityCnt;
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
    this.ticksThisSecond = 0;
  }

  runLoop() {
    if (!this.isRunning) return;

    const currentTime = process.hrtime();
    const elapsed = this.calculateElapsedTime(currentTime, this.lastTickTime);
    this.accumulator += elapsed;
    this.lastTickTime = currentTime;

    while (this.accumulator >= this.interval) {
      this.updateTPS(currentTime);
      const now = Date.now();
      this.eventHandler();
      this.tickTimeElapsed = Date.now() - now;
      this.accumulator -= this.interval;
    }

    this.ticksThisSecond++;
    const delay = this.interval - (this.accumulator % this.interval);
    setTimeout(() => this.runLoop(), delay);
  }

  calculateElapsedTime(endTime, startTime) {
    const [endSeconds, endNanoseconds] = endTime;
    const [startSeconds, startNanoseconds] = startTime;
    const elapsedMilliseconds = (endSeconds - startSeconds) * 1000 + (endNanoseconds - startNanoseconds) / 1e6;
    return elapsedMilliseconds;
  }

  updateTPS(currentTime) {
    const currentSecond = currentTime[0];
    if (currentSecond !== this.lastSecond) {
      const memoryUsage = process.memoryUsage();
      const memoryUsageReadable = `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100}MB`;
      console.log(`tps: ${this.ticksThisSecond} | expected tps: ${1000 / this.interval} | tick time: ${this.tickTimeElapsed}ms | entities: ${this.entityCnt} | time per 100 entities: ${(Math.round(this.tickTimeElapsed * 10000 / this.entityCnt) / 100)}ms | memory usage: ${memoryUsageReadable}`);
      this.onTpsUpdate(this.ticksThisSecond);
      this.ticksThisSecond = 0;
      this.lastSecond = currentSecond;
    }
  }
}

module.exports = Loop;