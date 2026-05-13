let _t = 0;

export function updateWind(dt: number) {
  _t += dt;
}

export function windRotation(x: number): number {
  const t = _t;
  const sway = Math.sin(t * 0.00065 + x * 0.0009);
  const sway2 = Math.sin(t * 0.00031 + x * 0.00041 + 1.7);
  const a = sway * 0.6 + sway2 * 0.4;

  const gust = Math.pow(Math.max(0, Math.sin(t * 0.00017 + x * 0.00022)), 4);

  const amp = 0.03 + gust * 0.022;
  return a * amp;
}
