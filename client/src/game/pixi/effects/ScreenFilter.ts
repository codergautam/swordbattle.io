import { Filter } from 'pixi.js-legacy';
import { screenEffectsState, screenEffectsRuntime, hexToRgb01 } from '../../effects/screenEffectsState';
import { biomeFxRuntime } from '../../effects/biomeEffects';

const fragShader = `
precision mediump float;

uniform sampler2D uSampler;
// highp is REQUIRED, not cosmetic. uTime is page-load elapsed SECONDS (wrapped at 2PI*1000 ~= 6283),
// and under the file's mediump default the uniform is STORED at mediump — which real mobile GPUs
// honour as ~fp16 (10-bit mantissa), so it is quantized at upload before any shader math runs. The
// representable step is uTime*2^-10: at ~600s that's 0.5s, i.e. the animation phase advances only twice
// a second and every effect looks like it runs at ~2fps while the game renders at full speed. It also
// degrades over time (worse the longer the page is open). Desktop GL promotes mediump to fp32, which is
// why this reproduces only on mobile. uScroll has the same defect and feeds the snow/rain parallax.
uniform highp float uTime;
uniform vec2  uResolution;
uniform highp vec2  uScroll;  // camera scroll (world px) -> parallax for snow/rain
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
uniform float uBlind;

varying vec2 vTextureCoord;

const float TWO_PI = 6.2831853;

// sin/cos of a phase that may have ramped huge over a session. Wrapping the phase
// to [0,2PI) before the trig keeps full mediump precision — otherwise a large
// argument loses its fractional bits and the wave degenerates into a constant
// offset (the heat/water shimmer "freezes" into a straight screen shift). sin is
// exactly 2PI-periodic so the wrap is seamless.
// The PARAMETER must be highp. With the file's mediump default, a bare "float x" parameter is mediump,
// so passing the highp expression (uv.y*42.0 + uTime*3.0) would convert — and re-quantize — at the call
// boundary, undoing the highp uniform above and leaving heat/water/caustics still stuttering. The wrap
// must run on the full-precision value. RETURN stays mediump: sin/cos output is [-1,1], where it's ample.
float wsin(highp float x) { return sin(mod(x, TWO_PI)); }
float wcos(highp float x) { return cos(mod(x, TWO_PI)); }

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
  // Pixi's filter varying has y=0 at the BOTTOM, opposite Phaser's outTexCoord (y=1 = bottom). We work
  // in Phaser SPACE for the position-based effects (so heat rises from the bottom, snow/rain fall down)
  // by flipping y here, then flip back ONLY at the texture read below so the sampled IMAGE stays upright.
  // (Sampling directly with this flipped coord mirrors the whole scene vertically — that was the bug.)
  vec2 outTexCoord = vec2(vTextureCoord.x, 1.0 - vTextureCoord.y);
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

  // uv is in Phaser space (incl. the heat/water distortion); flip y back to Pixi space to sample the
  // real, upright scene. Since uv ~= (x, 1-vTextureCoord.y), (uv.x, 1-uv.y) ~= vTextureCoord.
  vec4 color = texture2D(uSampler, vec2(uv.x, 1.0 - uv.y));

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

  float bd = smoothstep(0.12, 0.58, dist);
  color.rgb *= (1.0 - uBlind * mix(0.28, 0.72, bd));

  // Movement-reactive precipitation. uScroll shifts the field so moving up makes
  // it fall faster, moving sideways slides it across. Wind adds a steady sideways
  // drift. Falls straight (no sway) — looks like real snow/rain.
  highp vec2 sbase = outTexCoord * vec2(aspect, 1.0);
  highp float windDrift = uTime * 0.12 + uTime * uWind * 0.18 + uScroll.x * 0.3;

  if (uSnow > 0.001) {
    highp float fall = uTime * 0.55 + uScroll.y * 0.25;
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

  gl_FragColor = color;
}
`;

export class ScreenFilter extends Filter {
  constructor() {
    super(undefined, fragShader, {
      uTime: 0,
      uResolution: new Float32Array([1, 1]),
      uScroll: new Float32Array([0, 0]),
      uTint: new Float32Array([0, 0, 0]),
      uTintAmount: 0,
      uVignetteColor: new Float32Array([0, 0, 0]),
      uVignette: 0,
      uVignetteSize: 0.5,
      uHeat: 0,
      uSnow: 0,
      uRain: 0,
      uWind: 0,
      uWater: 0,
      uDarkness: 0,
      uBlind: 0,
    });
  }

  update(timeMs: number, width: number, height: number): boolean {
    const u = this.uniforms;
    const s = screenEffectsState;
    const on = s.enabled;
    const bw = on ? 1 : 0;
    const b = biomeFxRuntime;
    const timeWrap = 1000 * 2 * Math.PI;

    u.uTime = (timeMs / 1000) % timeWrap;
    u.uResolution[0] = width; u.uResolution[1] = height;
    u.uScroll[0] = (screenEffectsRuntime.scrollX * 0.0012) % 1000;
    u.uScroll[1] = (-(screenEffectsRuntime.scrollY * 0.0012)) % 1000;

    const pTint = hexToRgb01(s.tintColor);
    const pTa = on ? s.tintAmount : 0;
    const bTa = b.tintAmount * bw;
    const ta = pTa + bTa;
    if (ta > 0.0001) {
      u.uTint[0] = (pTint[0] * pTa + b.tint[0] * bTa) / ta;
      u.uTint[1] = (pTint[1] * pTa + b.tint[1] * bTa) / ta;
      u.uTint[2] = (pTint[2] * pTa + b.tint[2] * bTa) / ta;
    } else {
      u.uTint[0] = 0; u.uTint[1] = 0; u.uTint[2] = 0;
    }
    u.uTintAmount = Math.min(1, ta);

    const pVig = hexToRgb01(s.vignetteColor);
    const pV = on ? s.vignette : 0;
    const bV = b.vignetteStrength * bw;
    const vs = pV + bV;
    if (vs > 0.0001) {
      u.uVignetteColor[0] = (pVig[0] * pV + b.vignette[0] * bV) / vs;
      u.uVignetteColor[1] = (pVig[1] * pV + b.vignette[1] * bV) / vs;
      u.uVignetteColor[2] = (pVig[2] * pV + b.vignette[2] * bV) / vs;
      u.uVignetteSize = (s.vignetteSize * pV + b.vignetteSize * bV) / vs;
    } else {
      u.uVignetteColor[0] = 0; u.uVignetteColor[1] = 0; u.uVignetteColor[2] = 0;
      u.uVignetteSize = s.vignetteSize;
    }
    u.uVignette = Math.min(1, vs);

    u.uHeat = Math.min(1, (on ? s.heat : 0) + b.heat * bw);
    u.uSnow = Math.min(1, (on ? s.snow : 0) + b.snow * bw);
    u.uRain = Math.min(1, (on ? s.rain : 0) + b.rain * bw);
    u.uWind = Math.max(on ? s.wind : 0, b.wind * bw);
    u.uWater = Math.min(1, (on ? s.water : 0) + b.water * bw);
    u.uDarkness = on ? s.darkness : 0;
    u.uBlind = screenEffectsRuntime.blind || 0;

    return u.uTintAmount > 0.0015 || u.uVignette > 0.0015 || u.uDarkness > 0.001
      || u.uHeat > 0.001 || u.uSnow > 0.001 || u.uRain > 0.001 || u.uWater > 0.001
      || u.uBlind > 0.001;
  }
}
