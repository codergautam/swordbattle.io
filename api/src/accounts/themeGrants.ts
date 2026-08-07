export const defaultThemes = { equipped: 1, owned: [1] };

export const themeGrants: Record<string, { equipped?: number; owned?: number[] }> = {
};

export function applyThemeGrants<T extends { username?: string; themes?: { equipped: number; owned: number[] } }>(
  account: T,
): T {
  if (!account) return account;

  const current = account.themes || defaultThemes;
  const owned = Array.isArray(current.owned) && current.owned.length ? [...current.owned] : [...defaultThemes.owned];
  const grant = themeGrants[(account.username || '').toLowerCase()];

  if (grant) {
    for (const id of grant.owned || []) if (!owned.includes(id)) owned.push(id);
    if (grant.equipped && !owned.includes(grant.equipped)) owned.push(grant.equipped);
  }

  account.themes = {
    equipped: grant?.equipped ?? current.equipped ?? defaultThemes.equipped,
    owned,
  };
  return account;
}
