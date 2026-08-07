export const adsenseClient = 'ca-pub-3340825671684972';

export const adsenseSlots: Record<string, string> = {
  main_menu: '8142041409',
  game_results: '6426735137',
  shop: '9263551384',
  clans: '1377588437',
  rankings: '2554672804',
};

export function getAdSlot(placement?: string): string {
  return ((placement && adsenseSlots[placement]) || '').trim();
}
