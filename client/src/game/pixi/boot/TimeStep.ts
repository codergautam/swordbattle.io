class RafDriver {
  callback: (time: number) => void = () => {};
  isRunning = false;
  private _id = 0;
  private _tick = (now: number): void => {
    if (!this.isRunning) return;
    this.callback(now);
    if (this.isRunning) this._id = requestAnimationFrame(this._tick);
  };
  start(callback: (time: number) => void): void {
    if (this.isRunning) return;
    this.callback = callback;
    this.isRunning = true;
    this._id = requestAnimationFrame(this._tick);
  }
  stop(): void {
    this.isRunning = false;
    if (this._id) cancelAnimationFrame(this._id);
    this._id = 0;
  }
}

export class TimeStep {
  raf = new RafDriver();
  started = false;
  running = false;

  minFps: number;
  targetFps: number;
  fpsLimit: number;
  hasFpsLimit: boolean;
  _limitRate: number;
  _min: number;
  _target: number;
  smoothStep: boolean;
  deltaSmoothingMax: number;
  panicMax: number;

  actualFps: number;
  nextFpsUpdate = 0;
  framesThisSecond = 0;

  callback: (time: number, delta: number) => void = () => {};

  time = 0;
  startTime = 0;
  lastTime = 0;
  now = 0;
  frame = 0;

  delta = 0;
  deltaIndex = 0;
  deltaHistory: number[] = [];
  rawDelta = 0;
  _coolDown = 0;
  inFocus = true;

  constructor(config: any) {
    const fps = (config && config.fps) || {};
    this.minFps = fps.min != null ? fps.min : 5;
    this.targetFps = fps.target != null ? fps.target : 60;
    this.fpsLimit = fps.limit != null ? fps.limit : 0;
    this.hasFpsLimit = this.fpsLimit > 0;
    this._limitRate = this.hasFpsLimit ? 1000 / this.fpsLimit : 0;
    this._min = 1000 / this.minFps;
    this._target = 1000 / this.targetFps;
    this.actualFps = this.targetFps;
    this.smoothStep = fps.smoothStep !== false;
    this.deltaSmoothingMax = fps.deltaHistory != null ? fps.deltaHistory : 10;
    this.panicMax = fps.panicMax != null ? fps.panicMax : 120;
  }

  smoothDelta(delta: number): number {
    const idx = this.deltaIndex;
    const history = this.deltaHistory;
    const max = this.deltaSmoothingMax;

    if (this._coolDown > 0 || !this.inFocus) {
      this._coolDown--;
      delta = Math.min(delta, this._target);
    }

    if (delta > this._min) {
      delta = history[idx];
      delta = Math.min(delta, this._min);
    }

    history[idx] = delta;
    this.deltaIndex++;
    if (this.deltaIndex >= max) this.deltaIndex = 0;

    let avg = 0;
    for (let i = 0; i < max; i++) avg += history[i];
    avg /= max;
    return avg;
  }

  updateFPS(time: number): void {
    this.actualFps = 0.25 * this.framesThisSecond + 0.75 * this.actualFps;
    this.nextFpsUpdate = time + 1000;
    this.framesThisSecond = 0;
  }

  step = (time: number): void => {
    this.now = time;
    let delta = Math.max(0, time - this.lastTime);
    this.rawDelta = delta;
    this.time += this.rawDelta;
    if (this.smoothStep) delta = this.smoothDelta(delta);
    this.delta = delta;
    if (time >= this.nextFpsUpdate) this.updateFPS(time);
    this.framesThisSecond++;
    this.callback(time, delta);
    this.lastTime = time;
    this.frame++;
  };

  stepLimitFPS = (time: number): void => {
    this.now = time;
    let delta = Math.max(0, time - this.lastTime);
    this.rawDelta = delta;
    this.time += this.rawDelta;
    if (this.smoothStep) delta = this.smoothDelta(delta);
    this.delta += delta;
    if (time >= this.nextFpsUpdate) this.updateFPS(time);
    this.framesThisSecond++;
    if (this.delta >= this._limitRate) {
      this.callback(time, this.delta);
      this.delta = 0;
    }
    this.lastTime = time;
    this.frame++;
  };

  resetDelta(): void {
    const now = performance.now();
    this.time = now;
    this.lastTime = now;
    this.nextFpsUpdate = now + 1000;
    this.framesThisSecond = 0;
    for (let i = 0; i < this.deltaSmoothingMax; i++) {
      this.deltaHistory[i] = Math.min(this._target, this.deltaHistory[i]);
    }
    this.delta = 0;
    this.deltaIndex = 0;
    this._coolDown = this.panicMax;
  }

  start(callback: (time: number, delta: number) => void): this {
    if (this.started) return this;
    this.started = true;
    this.running = true;
    for (let i = 0; i < this.deltaSmoothingMax; i++) this.deltaHistory[i] = this._target;
    this.callback = callback;
    this.resetDelta();
    this.startTime = performance.now();
    this.raf.start(this.hasFpsLimit ? this.stepLimitFPS : this.step);
    return this;
  }

  sleep(): void {
    if (!this.running) return;
    this.running = false;
    this.raf.stop();
  }

  wake(): void {
    if (this.running) return;
    this.running = true;
    this.resetDelta();
    this.raf.start(this.hasFpsLimit ? this.stepLimitFPS : this.step);
  }

  destroy(): void {
    this.started = false;
    this.running = false;
    this.raf.stop();
  }
}
