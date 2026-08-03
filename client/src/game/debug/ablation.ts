import Phaser from '../engine';

const noop = function (this: any) { return this; };
const has = (f: string) => { try { return new URLSearchParams(window.location.search).has(f); } catch (e) { return false; } };

export function initAblation() {
  const p: any = Phaser;
  const go = p?.GameObjects;
  const kill = (proto: any, on: boolean) => { if (on && proto?.renderWebGL) proto.renderWebGL = function () {}; };
  kill(go?.Text?.prototype, has('noText'));
  kill(go?.BitmapText?.prototype, has('noText'));
  kill(go?.Graphics?.prototype, has('noGraphics'));
  kill(go?.TileSprite?.prototype, has('noTiles'));
  kill(go?.Particles?.ParticleEmitter?.prototype, has('noParticles'));
  if (has('noMasks')) {
    const gm = p?.Display?.Masks?.GeometryMask?.prototype;
    if (gm) { gm.preRenderWebGL = function () {}; gm.postRenderWebGL = function () {}; }
  }
  if (has('noShadowRT')) {
    const rt = go?.RenderTexture?.prototype;
    if (rt) { rt.clear = noop; rt.beginDraw = noop; rt.batchDraw = noop; rt.batchDrawFrame = noop; rt.endDraw = noop; }
  }
  if (has('noPostFX')) {
    const fx = p?.Renderer?.WebGL?.Pipelines?.PostFXPipeline?.prototype;
    if (fx) fx.onDraw = function () {};
  }
}
