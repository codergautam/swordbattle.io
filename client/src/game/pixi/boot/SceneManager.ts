export class SceneManager {
  private _game: any;
  private main: any;
  private paused = false;

  constructor(game: any, sceneClasses: any[]) {
    this._game = game;
    const SceneClass = Array.isArray(sceneClasses) ? sceneClasses[0] : sceneClasses;
    this.main = new SceneClass();
  }

  getMain(): any { return this.main; }

  getScene(_key?: string): any { return this.main; }

  isPaused(): boolean { return this.paused; }

  pause(_key?: string): void { this.paused = true; }
  resume(_key?: string): void { this.paused = false; }
}
