import earcut from 'earcut';

const PI2 = Math.PI * 2;


function wrapValue(value: number, min: number, max: number): number {
  const range = max - min;
  return (min + ((((value - min) % range) + range) % range));
}

export const Angle = {
  Between: (x1: number, y1: number, x2: number, y2: number): number => Math.atan2(y2 - y1, x2 - x1),
  Wrap: (angle: number): number => wrapValue(angle, -Math.PI, Math.PI),
  RotateTo: (currentAngle: number, targetAngle: number, lerp = 0.05): number => {
    if (currentAngle === targetAngle) return currentAngle;
    if (Math.abs(targetAngle - currentAngle) <= lerp || Math.abs(targetAngle - currentAngle) >= (PI2 - lerp)) {
      currentAngle = targetAngle;
    } else {
      if (Math.abs(targetAngle - currentAngle) > Math.PI) {
        if (targetAngle < currentAngle) targetAngle += PI2; else targetAngle -= PI2;
      }
      if (targetAngle > currentAngle) currentAngle += lerp;
      else if (targetAngle < currentAngle) currentAngle -= lerp;
    }
    return currentAngle;
  },
};

export const Distance = {
  Between: (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x1 - x2; const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  },
};

export const Linear = (p0: number, p1: number, t: number): number => (p1 - p0) * t + p0;

export const FloatBetween = (min: number, max: number): number => Math.random() * (max - min) + min;
export const Between = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

export class Vector2 {
  x: number; y: number;
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x: number, y = x): this { this.x = x; this.y = y; return this; }
  setTo(x: number, y = x): this { this.x = x; this.y = y; return this; }
  copy(src: { x: number; y: number }): this { this.x = src.x; this.y = src.y; return this; }
  clone(): Vector2 { return new Vector2(this.x, this.y); }
}

export const Interpolation = {
  Linear: (v: number[], k: number): number => {
    const m = v.length - 1;
    const f = m * k;
    const i = Math.floor(f);
    if (k < 0) return Linear(v[0], v[1], f);
    if (k > 1) return Linear(v[m], v[m - 1], m - f);
    return Linear(v[i], v[(i + 1 > m) ? m : i + 1], f - i);
  },
};

export const RND = {
  between: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,
  pick: <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)],
};

const linearEase = (v: number): number => v;
const Cubic = {
  In: (v: number): number => v * v * v,
  Out: (v: number): number => (--v) * v * v + 1,
  InOut: (v: number): number => ((v *= 2) < 1) ? 0.5 * v * v * v : 0.5 * ((v -= 2) * v * v + 2),
};
const Sine = {
  In: (v: number): number => (v === 0) ? 0 : (v === 1) ? 1 : 1 - Math.cos(v * Math.PI / 2),
  Out: (v: number): number => (v === 0) ? 0 : (v === 1) ? 1 : Math.sin(v * Math.PI / 2),
  InOut: (v: number): number => (v === 0) ? 0 : (v === 1) ? 1 : 0.5 * (1 - Math.cos(Math.PI * v)),
};
const Quadratic = { Out: (v: number): number => v * (2 - v) };
const Back = { Out: (v: number, overshoot = 1.70158): number => (--v) * v * ((overshoot + 1) * v + overshoot) + 1 };
const Bounce = {
  Out: (v: number): number => {
    if (v < 1 / 2.75) return 7.5625 * v * v;
    if (v < 2 / 2.75) return 7.5625 * (v -= 1.5 / 2.75) * v + 0.75;
    if (v < 2.5 / 2.75) return 7.5625 * (v -= 2.25 / 2.75) * v + 0.9375;
    return 7.5625 * (v -= 2.625 / 2.75) * v + 0.984375;
  },
};

export const Easing = { Linear: linearEase, Cubic, Sine, Quadratic, Back, Bounce };

const EaseMap: Record<string, (v: number) => number> = {
  Power0: linearEase, Power2: Cubic.Out,
  Linear: linearEase, Quad: Quadratic.Out, Cubic: Cubic.Out, Sine: Sine.Out, Back: Back.Out, Bounce: Bounce.Out,
  'Cubic.easeIn': Cubic.In, 'Cubic.easeOut': Cubic.Out, 'Cubic.easeInOut': Cubic.InOut,
  'Sine.easeOut': Sine.Out, 'Sine.easeInOut': Sine.InOut,
  'Quad.easeOut': Quadratic.Out,
  'Back.easeOut': Back.Out,
};

export function GetEaseFunction(ease: any): (v: number) => number {
  if (typeof ease === 'function') return ease;
  if (typeof ease === 'string' && Object.prototype.hasOwnProperty.call(EaseMap, ease)) return EaseMap[ease];
  return linearEase;
}

export class Rectangle {
  x: number; y: number; width: number; height: number;
  constructor(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; }
  setTo(x: number, y: number, width: number, height: number): this { this.x = x; this.y = y; this.width = width; this.height = height; return this; }
  get right(): number { return this.x + this.width; }
  get bottom(): number { return this.y + this.height; }

  static Contains(rect: Rectangle, x: number, y: number): boolean {
    if (rect.width <= 0 || rect.height <= 0) return false;
    return (rect.x <= x && rect.x + rect.width >= x && rect.y <= y && rect.y + rect.height >= y);
  }
  static Overlaps(rectA: Rectangle, rectB: Rectangle): boolean {
    return (rectA.x < rectB.right && rectA.right > rectB.x && rectA.y < rectB.bottom && rectA.bottom > rectB.y);
  }
}

export class Circle {
  x: number; y: number; radius: number;
  constructor(x = 0, y = 0, radius = 0) { this.x = x; this.y = y; this.radius = radius; }
}

export const Intersects = {
  CircleToRectangle: (circle: Circle, rect: Rectangle): boolean => {
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    const cx = Math.abs(circle.x - rect.x - halfWidth);
    const cy = Math.abs(circle.y - rect.y - halfHeight);
    const xDist = halfWidth + circle.radius;
    const yDist = halfHeight + circle.radius;
    if (cx > xDist || cy > yDist) return false;
    if (cx <= halfWidth || cy <= halfHeight) return true;
    const xCornerDist = cx - halfWidth;
    const yCornerDist = cy - halfHeight;
    const xCornerDistSq = xCornerDist * xCornerDist;
    const yCornerDistSq = yCornerDist * yCornerDist;
    const maxCornerDistSq = circle.radius * circle.radius;
    return (xCornerDistSq + yCornerDistSq <= maxCornerDistSq);
  },
};

export const Polygon = { Earcut: (earcut as any) };

export const Geom = { Rectangle, Circle, Intersects, Polygon };

function GetColor(red: number, green: number, blue: number): number { return red << 16 | green << 8 | blue; }

function HexStringToColor(hex: string): { color: number; red: number; green: number; blue: number } {
  hex = hex.replace(/^(?:#|0x)?([a-f\d])([a-f\d])([a-f\d])$/i, (_m, r, g, b) => r + r + g + g + b + b);
  const result = /^(?:#|0x)?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16), g = parseInt(result[2], 16), b = parseInt(result[3], 16);
    return { color: GetColor(r, g, b), red: r, green: g, blue: b };
  }
  return { color: 0, red: 0, green: 0, blue: 0 };
}

export class GeometryMask {
  geometryMask: any;
  invertAlpha = false;
  scene: any;
  constructor(scene: any, graphicsGeometry: any) { this.scene = scene; this.geometryMask = graphicsGeometry; }
  setInvertAlpha(value = true): this { this.invertAlpha = value; return this; }
  setShape(graphicsGeometry: any): this { this.geometryMask = graphicsGeometry; return this; }
  destroy(): void { this.geometryMask = null; }
}

export const Display = {
  Color: { GetColor, HexStringToColor },
  Masks: { GeometryMask },
};

const PhaserMath = {
  Angle, Distance, Linear, FloatBetween, Between, Interpolation, RND, Easing, Vector2,
  Wrap: wrapValue, PI2,
};
export { PhaserMath as Math };

export const BlendModes = {
  SKIP_CHECK: -1, NORMAL: 0, ADD: 1, MULTIPLY: 2, SCREEN: 3, OVERLAY: 4, DARKEN: 5, LIGHTEN: 6,
  COLOR_DODGE: 7, COLOR_BURN: 8, HARD_LIGHT: 9, SOFT_LIGHT: 10, DIFFERENCE: 11, EXCLUSION: 12,
  HUE: 13, SATURATION: 14, COLOR: 15, LUMINOSITY: 16, ERASE: 17, SOURCE_IN: 18, SOURCE_OUT: 19,
  SOURCE_ATOP: 20, DESTINATION_OVER: 21, DESTINATION_IN: 22, DESTINATION_OUT: 23,
  DESTINATION_ATOP: 24, LIGHTER: 25, COPY: 26, XOR: 27,
};

export const Utils = {};
export const Curves = {};
