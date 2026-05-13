import Phaser from 'phaser';
import { screenEffectsState, screenEffectsRuntime, hexToRgb01 } from './screenEffectsState';
import { biomeFxRuntime } from './biomeEffects';

const fragShader = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uScroll;        // camera scroll (world px) -> parallax for snow/rain
uniform vec3  uTint;
uniform float uTintAmount;
uniform vec3  uVignetteColor;
uniform float uVignette;
uniform float uVignetteSize;
uniform float uHeat;
uniform float uSnow;
uniform float uRain;
uniform float uWind;
uniform float uWater;
uniform float uDarkness;

varying vec2 outTexCoord;

const float TWO_PI = 6.2831853;

// sin/cos of a phase that may have ramped huge over a session. Wrapping the phase
// to [0,2PI) before the trig keeps full mediump precision — otherwise a large
// argument loses its fractional bits and the wave degenerates into a constant
// offset (the heat/water shimmer "freezes" into a straight screen shift). sin is
// exactly 2PI-periodic so the wrap is seamless.
float wsin(float x) { return sin(mod(x, TWO_PI)); }
float wcos(float x) { return cos(mod(x, TWO_PI)); }

// Grid period used to wrap cell coordinates before hashing. The snow/rain fields
// are tiled on an integer grid, so wrapping the cell index modulo this period is
// visually seamless yet keeps the hash inputs SMALL no matter how far the world
// scroll or elapsed time has ramped — large floats lose their fractional bits in
// mediump and make hash21 collapse the field into aligned lines/bands. 256 is
// large enough that the tiling is never noticeable on screen.
const float GRID_WRAP = 256.0;

// Stable hash for a wrapped cell coordinate. Computed in highp: the cell index
// and the fract() of the sample coordinate must keep their fractional bits, and
// mediump (≈2^-10 relative) goes coarse well before the wrapped coordinate range.
// The wrap keeps the input bounded; highp keeps the bits.
highp float hash21(highp vec2 p) {
  p = mod(p, GRID_WRAP);
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// One grid layer of flakes. Flakes are kept to the cell interior [0.25,0.75] with
// a radius that never reaches the cell edge, so they're always whole circles
// (no more clipped half-flakes). The cell index is wrapped (and the whole path is
// highp) so the hash stays precise even after long sessions / large scroll.
float snowFlakes(highp vec2 uv, float density) {
  highp vec2 cell = mod(floor(uv), GRID_WRAP);
  highp vec2 f = fract(uv);
  float on = step(1.0 - density, hash21(cell));
  highp vec2 pos = 0.25 + 0.5 * vec2(hash21(cell + 3.1), hash21(cell + 7.7));
  float d = float(length(f - pos));
  return smoothstep(0.13, 0.02, d) * on;
}

// Thin vertical rain streaks on a grid.
float rainDrops(highp vec2 uv, float density) {
  highp vec2 cell = mod(floor(uv), GRID_WRAP);
  highp vec2 f = fract(uv);
  float on = step(1.0 - density, hash21(cell));
  float x = float(0.3 + 0.4 * hash21(cell + 2.3));
  float dx = abs(float(f.x) - x);
  float fy = float(f.y);
  float streak = smoothstep(0.035, 0.0, dx) * smoothstep(0.0, 0.35, fy) * smoothstep(1.0, 0.55, fy);
  return streak * on;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 uv = outTexCoord;

  // Heat haze — stronger toward the bottom (hot ground rising). Only pay for the
  // trig when the effect is actually on.
  if (uHeat > 0.001) {
    float heatGrad = smoothstep(0.0, 1.0, uv.y);
    uv.x += wsin(uv.y * 42.0 + uTime * 3.0) * 0.0028 * uHeat * heatGrad;
    uv.y += wsin(uv.x * 28.0 - uTime * 2.2) * 0.0018 * uHeat * heatGrad;
  }

  // Water ripple distortion.
  if (uWater > 0.001) {
    uv.x += wsin(uv.y * 26.0 + uTime * 2.0) * 0.0022 * uWater;
    uv.y += wcos(uv.x * 30.0 + uTime * 1.7) * 0.0022 * uWater;
  }

  vec4 color = texture2D(uMainSampler, uv);

  // Water: blue cast + caustic light ripples.
  if (uWater > 0.001) {
    float caustic = wsin(outTexCoord.x * 20.0 + uTime * 1.5) * wsin(outTexCoord.y * 23.0 - uTime * 1.3);
    caustic = smoothstep(0.5, 1.0, caustic);
    color.rgb = mix(color.rgb, vec3(0.18, 0.42, 0.7), uWater * 0.4);
    color.rgb += caustic * uWater * 0.12;
  }

  // Colour wash.
  color.rgb = mix(color.rgb, uTint, clamp(uTintAmount, 0.0, 1.0));

  // Global darkness.
  color.rgb *= (1.0 - uDarkness * 0.72);

  // Vignette (edge darkening / colouring).
  vec2 c = outTexCoord - 0.5;
  c.x *= aspect;
  float dist = length(c);
  float edge = smoothstep(uVignetteSize, uVignetteSize + 0.45, dist);
  color.rgb = mix(color.rgb, uVignetteColor, edge * uVignette);

  // Movement-reactive precipitation. uScroll shifts the field so moving up makes
  // it fall faster, moving sideways slides it across. Wind adds a steady sideways
  // drift. Falls straight (no sway) — looks like real snow/rain.
  highp vec2 sbase = outTexCoord * vec2(aspect, 1.0);
  // A CONSTANT sideways rate gives the snow its steady fall angle. The angle must
  // not depend on a value that ramps during biome cross-fades — multiplying the
  // (huge) uTime by a ramping uWind made the whole field sweep sideways at
  // "infinite speed" while fading in. Biome wind is 0, so uWind only nudges the
  // angle when the dev panel's slider is used. Built in highp so the ×10/×16 +
  // mod() below keep their fractional bits before flooring into cells.
  highp float windDrift = uTime * 0.12 + uTime * uWind * 0.18 + uScroll.x * 0.3;

  if (uSnow > 0.001) {
    // Snow mostly just FALLS: a strong constant downward rate dominates, and the
    // movement-parallax (uScroll.y) is heavily damped so walking up no longer
    // drags the snow up with you.
    highp float fall = uTime * 0.55 + uScroll.y * 0.25;
    // Each layer floors (sbase*scale + offset) into cells that repeat every
    // GRID_WRAP, so wrapping the SCALED offset modulo GRID_WRAP is seamless and
    // keeps the floored coordinate small — without this the offset ramps to tens
    // of thousands and even highp fract() loses detail, snapping flakes onto
    // a few lines.
    highp vec2 o1 = mod(vec2(windDrift, fall) * 10.0, GRID_WRAP);
    highp vec2 o2 = mod(vec2(windDrift * 0.6, fall * 0.6) * 6.0, GRID_WRAP);
    float s = snowFlakes(sbase * 10.0 + o1, 0.5)
            + snowFlakes(sbase * 6.0 + o2, 0.45) * 0.8;
    color.rgb += vec3(1.0) * s * uSnow;
  }

  if (uRain > 0.001) {
    highp float fall = uTime * 0.9 + uScroll.y;
    highp vec2 o1 = mod(vec2(windDrift * 8.0, fall * 16.0), GRID_WRAP);
    highp vec2 o2 = mod(vec2(windDrift * 5.0, fall * 11.0), GRID_WRAP);
    float r = rainDrops(sbase * vec2(8.0, 16.0) + o1, 0.5)
            + rainDrops(sbase * vec2(5.0, 11.0) + o2, 0.4) * 0.7;
    color.rgb += vec3(0.7, 0.8, 1.0) * r * uRain * 0.6;
  }

  // (Wind no longer draws visible screen streaks — it only drifts snow/rain
  // sideways above. Ambient sway is done in-world by the global Wind module.)

  gl_FragColor = color;
}
`;

export default class ScreenEffectsPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'ScreenEffects', fragShader });
  }

  onPreRender() {
    const s = screenEffectsState;
    const on = s.enabled;
    const bw = on ? 1 : 0;
    const b = biomeFxRuntime;
    const timeWrap = 1000 * 2 * Math.PI;
    const t = (((this.game.loop && this.game.loop.time) || 0) / 1000) % timeWrap;

    this.set1f('uTime', t);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set2f('uScroll',
      ((screenEffectsRuntime.scrollX * 0.0012) % 1000),
      (-(screenEffectsRuntime.scrollY * 0.0012) % 1000));

    const pTint = hexToRgb01(s.tintColor);
    const pTa = on ? s.tintAmount : 0;
    const bTa = b.tintAmount * bw;
    const ta = pTa + bTa;
    if (ta > 0.0001) {
      this.set3f('uTint',
        (pTint[0] * pTa + b.tint[0] * bTa) / ta,
        (pTint[1] * pTa + b.tint[1] * bTa) / ta,
        (pTint[2] * pTa + b.tint[2] * bTa) / ta);
    } else {
      this.set3f('uTint', 0, 0, 0);
    }
    this.set1f('uTintAmount', Math.min(1, ta));

    const pVig = hexToRgb01(s.vignetteColor);
    const pV = on ? s.vignette : 0;
    const bV = b.vignetteStrength * bw;
    const vs = pV + bV;
    if (vs > 0.0001) {
      this.set3f('uVignetteColor',
        (pVig[0] * pV + b.vignette[0] * bV) / vs,
        (pVig[1] * pV + b.vignette[1] * bV) / vs,
        (pVig[2] * pV + b.vignette[2] * bV) / vs);
      this.set1f('uVignetteSize', (s.vignetteSize * pV + b.vignetteSize * bV) / vs);
    } else {
      this.set3f('uVignetteColor', 0, 0, 0);
      this.set1f('uVignetteSize', s.vignetteSize);
    }
    this.set1f('uVignette', Math.min(1, vs));

    this.set1f('uHeat', Math.min(1, (on ? s.heat : 0) + b.heat * bw));
    this.set1f('uSnow', Math.min(1, (on ? s.snow : 0) + b.snow * bw));
    this.set1f('uRain', Math.min(1, (on ? s.rain : 0) + b.rain * bw));
    this.set1f('uWind', Math.max(on ? s.wind : 0, b.wind * bw));
    this.set1f('uWater', Math.min(1, (on ? s.water : 0) + b.water * bw));
    this.set1f('uDarkness', on ? s.darkness : 0);
  }
}
