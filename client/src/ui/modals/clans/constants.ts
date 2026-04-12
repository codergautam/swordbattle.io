export const clanXpRequirement = 10_000;
export const clanCreationCost = 100_000;
export const clanMemberCap = 15;
export const clanDescriptionMax = 250;
export const clanChatMaxLength = 200;

export const allowedFrameIds = [1, 2, 3, 4, 5] as const;
export const allowedIconIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export const allowedFrameColors = [
  '#ffffff', '#ffaa00', '#ff4444', '#ff66cc', '#cc66ff', '#6666ff',
  '#33aaff', '#00cccc', '#33cc33', '#aaff44', '#ffee44', '#888888',
] as const;

export const allowedIconColors = [
  '#33cc33', '#aaff44', '#ffee44', '#ffaa00', '#ff4444',
  '#ff66cc', '#cc66ff', '#6666ff', '#33aaff', '#00cccc',
] as const;

export const iconBaseHues: Record<number, number | null> = {
  1: 147, 2: 0,   3: 128, 4: 0,
  5: 40,  6: 54,  7: 87,  8: 120,
  9: 180, 10: 205, 11: 240, 12: 280,
  13: null, 14: null,
};

export const grayscaleIconIds = new Set(
  Object.entries(iconBaseHues)
    .filter(([, v]) => v == null)
    .map(([k]) => Number(k)),
);

export const allowedXpRequirements = [
  0, 50_000, 100_000, 200_000, 300_000, 500_000, 750_000,
  1_000_000, 1_250_000, 1_500_000, 2_000_000,
] as const;

export const allowedMasteryRequirements = [
  0, 50_000, 100_000, 200_000, 300_000, 500_000, 750_000, 1_000_000,
] as const;

export enum ClanStatus {
  Public = 0,
  Request = 1,
  Private = 2,
}

export enum ClanRole {
  Leader = 0,
  CoLeader = 1,
  Elite = 2,
  Member = 3,
}

export const statusLabels: Record<ClanStatus, string> = {
  [ClanStatus.Public]: 'Public',
  [ClanStatus.Request]: 'Request to Join',
  [ClanStatus.Private]: 'Private',
};

export const roleLabels: Record<ClanRole, string> = {
  [ClanRole.Leader]: 'Leader',
  [ClanRole.CoLeader]: 'Co-Leader',
  [ClanRole.Elite]: 'Elite',
  [ClanRole.Member]: 'Member',
};

export function hexToHue(hex: string): number {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return 0;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
}

export function getIconRecolorFilter(iconId: number, targetColor: string): string | undefined {
  const baseHue = iconBaseHues[iconId];
  if (baseHue == null) return undefined;
  const targetHue = hexToHue(targetColor);
  let rotation = targetHue - baseHue;
  while (rotation < 0) rotation += 360;
  rotation %= 360;
  return `hue-rotate(${rotation}deg)`;
}
