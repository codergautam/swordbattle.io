import { EntityDepth } from '.';
import { isObject, mergeDeep } from '../../helpers';
import { ShapeTypes } from '../Types';
import { Shape, ShapeType } from '../physics/Shape';
import Game from '../scenes/Game';

export class BaseEntity {
  static stateFields: string[] = ['id', 'type', 'shapeData'];

  [key: string]: any;
  game: Game;
  shape: ShapeType;
  container: any = null;
  removed: boolean = false;
  
  constructor(game: Game) {
    this.game = game;
    this.shape = new Shape(0, 0);
  }

  setDepth() {
    if (!this.container) return;
    this.container.setDepth(EntityDepth[this.type] || 0);
  }

  resetState() {
    for (const key of (this.constructor as typeof BaseEntity).stateFields) {
      if (this[key] !== undefined) {
        if (this[key] instanceof BaseEntity) {
          this[key].resetState();
        } else {
          delete this[key];
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
        } else if (isObject(data[key]) && this[key]) {
          mergeDeep(this[key], data[key]);
        } else {
          this[key] = data[key];
        }
      }
    }
    this.afterStateUpdate(data);
  }

  beforeStateUpdate(data: any) {
    if (data.shapeData !== undefined) {
      if (this.shape.type === ShapeTypes.Point) {
        this.shape = Shape.create(data.shapeData);
      } else {
        this.shape.update(data.shapeData);
      }
    }
  }

  afterStateUpdate(data: any) {}

  update(delta: number, time: number) {
    const scale = delta / 60;
    this.container.x = Phaser.Math.Linear(this.container.x, this.shape.x, scale);
    this.container.y = Phaser.Math.Linear(this.container.y, this.shape.y, scale);
  }

  remove() {
    this.container?.destroy();
  }
}
