export const skinBodyScales: { [id: number]: number } = {
  1000: 1.1,
  467: 2,
  468: 1.5,
  469: 1.1,
  326: 1.6,
  361: 1.2,
  197: 1.7,
  399: 1.6,
  391: 1.85,
  462: 1.85,
  359: 1.35,
  393: 1.3,
  325: 1.5,
  321: 1.45,
  318: 1.5,
  217: 1.2,
  272: 1.15,
  508: 1.3,
  431: 1.2,
  356: 1.3,
  400: 1.4,
  200: 1.1,
  446: 1.1666,
  194: 1.1,
};

export function getSkinScale(id: number): number {
  return skinBodyScales[id] ?? 1;
}
