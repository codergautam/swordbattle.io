export interface JoystickConfig { base: any; thumb: any; radius?: number; x?: number; y?: number; }

export default class VirtualJoystick {
  base: any;
  thumb: any;
  radius: number;

  constructor(_scene: any, config: JoystickConfig) {
    this.base = config.base;
    this.thumb = config.thumb;
    this.radius = config.radius ?? 100;
    if (config.x != null || config.y != null) this.setPosition(config.x ?? 0, config.y ?? 0);
  }

  setEnable(_enable: boolean): this { return this; }

  setVisible(visible: boolean): this {
    this.base?.setVisible?.(visible);
    this.thumb?.setVisible?.(visible);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.base?.setPosition?.(x, y);
    this.thumb?.setPosition?.(x, y);
    return this;
  }

  destroy(): void {
    this.base?.destroy?.();
    this.thumb?.destroy?.();
    this.base = null;
    this.thumb = null;
  }
}
