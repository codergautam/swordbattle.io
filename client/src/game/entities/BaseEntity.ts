import Game from '../scenes/Game';

export class BaseEntity {
  static stateFields: string[] = ['id', 'type', 'x', 'y'];

  [key: string]: any;
  game: Game;
  container: any = null;
  removed: boolean = false;
  
  constructor(game: Game) {
    this.game = game;
  }

  resetState() {
    for (const key of (this.constructor as typeof BaseEntity).stateFields) {
      if (this[key] !== undefined) {
        if (this[key] instanceof BaseEntity) {
          this[key].resetState();
        } else {
          this[key] = undefined;
        }
      }
    }
  }

  updateState(data: any) {
    this.beforeStateUpdate(data);
    for (const key of (this.constructor as typeof BaseEntity).stateFields) {
      if (data[key] !== undefined) {
        if (this[key] instanceof BaseEntity) {
          this[key].updateState(data[key]);
        } else {
          this[key] = data[key];
        }
      }
    }
    this.afterStateUpdate(data);
  }

  update(delta: number, time: number) {}

  beforeStateUpdate(data: any) {}

  afterStateUpdate(data: any) {
    if (!this.container) return;
    this.container.x = this.x;
    this.container.y = this.y;
  }

  remove() {
    this.container?.destroy();
  }
}
