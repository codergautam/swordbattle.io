class Loop {
  constructor(interval = 50, game) {
    this.entityCnt = 0;
    this.interval = interval;
    this.isRunning = false;
    this.ticksThisSecond = 0;
    this.tickTimeElapsed = 0;
    this.game = game;
    this.eventHandler = () => {};
    this.onTpsUpdate = () => {};
    this._immediateHandle = null;
    this._nextTickTime = 0;
    this._lastTpsSecond = 0;
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
    this._nextTickTime = process.hrtime.bigint();
    this._lastTpsSecond = Number(this._nextTickTime / 1000000000n);
    this.runLoop();
  }

  stop() {
    this.isRunning = false;
    this.ticksThisSecond = 0;
    if (this._immediateHandle) {
      clearImmediate(this._immediateHandle);
      this._immediateHandle = null;
    }
  }

  runLoop() {
    if (!this.isRunning) return;

    const now = process.hrtime.bigint();
    const intervalNs = BigInt(this.interval) * 1000000n;

    if (now >= this._nextTickTime) {
      const tickStart = Date.now();
      this.eventHandler();
      this.tickTimeElapsed = Date.now() - tickStart;

      if (this.tickTimeElapsed > this.interval * 2) {
        const realPlayersCnt = [...this.game.players.values()].filter(p => !p.isBot).length;
        console.log(`Server lagging severely... tick took ${this.tickTimeElapsed} ms. Expecting <${this.interval} ms.\nReal player count: ${realPlayersCnt}; Entities: ${this.entityCnt}; Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
      }

      this.ticksThisSecond++;
      this._nextTickTime += intervalNs;

      if (now - this._nextTickTime > intervalNs * 4n) {
        this._nextTickTime = now + intervalNs;
      }

      const currentSecond = Number(now / 1000000000n);
      if (currentSecond !== this._lastTpsSecond) {
        this.onTpsUpdate(this.ticksThisSecond);
        this.ticksThisSecond = 0;
        this._lastTpsSecond = currentSecond;
      }
    }

    const remaining = Number(this._nextTickTime - process.hrtime.bigint()) / 1000000;
    if (remaining > 4) {
      setTimeout(() => this.runLoop(), Math.floor(remaining - 3));
    } else {
      this._immediateHandle = setImmediate(() => this.runLoop());
    }
  }
}

module.exports = Loop;