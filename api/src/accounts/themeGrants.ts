type ThemeInventory = { equipped: number; owned: number[] };
type ThemeGrant = { equipped?: number; owned?: number[] };

export const defaultThemes: ThemeInventory = { equipped: 1, owned: [1] };
export const defaultHudThemes: ThemeInventory = { equipped: 1, owned: [1] };

export const themeGrants: Record<string, ThemeGrant> = {
};

export const hudThemeGrants: Record<string, ThemeGrant> = {
};

function applyGrants(current: ThemeInventory | undefined, grant: ThemeGrant | undefined, defaults: ThemeInventory) {
  const inventory = current || defaults;
  const owned = Array.isArray(inventory.owned) && inventory.owned.length ? [...inventory.owned] : [...defaults.owned];

  if (grant) {
    for (const id of grant.owned || []) if (!owned.includes(id)) owned.push(id);
    if (grant.equipped && !owned.includes(grant.equipped)) owned.push(grant.equipped);
  }

  return {
    equipped: grant?.equipped ?? inventory.equipped ?? defaults.equipped,
    owned,
  };
}

export function applyThemeGrants<T extends {
  username?: string;
  themes?: ThemeInventory;
  hudThemes?: ThemeInventory;
}>(
  account: T,
): T {
  if (!account) return account;

  const username = (account.username || '').toLowerCase();
  account.themes = applyGrants(account.themes, themeGrants[username], defaultThemes);
  account.hudThemes = applyGrants(account.hudThemes, hudThemeGrants[username], defaultHudThemes);
  return account;
}
