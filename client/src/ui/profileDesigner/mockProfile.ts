const dayMs = 86400000;
const joinedDaysAgo = 99;

export const designerUsername = 'Username';

let cachedData: any = null;
let cachedGames: any[] | null = null;

export function getMockProfileData() {
  if (cachedData) return cachedData;

  const startedAt = Date.now() - joinedDaysAgo * dayMs;
  cachedData = {
    account: {
      id: 0,
      username: designerUsername,
      created_at: new Date(startedAt).toISOString(),
      profile_views: 99,
      bio: 'This is my bio and it says a lot about me',
      skins: { equipped: 1, owned: Array.from({ length: 123 }, (_, i) => i + 1) },
      tags: { tags: ['Tag'], colors: ['#5bb8ff'] },
      adSupporter: true,
      themes: { equipped: 1, owned: [1] },
    },
    totalStats: {
      games: 12345,
      xp: 1234567,
      mastery: 123456,
      kills: 123456,
      playtime: 1234567,
    },
    dailyStats: Array.from({ length: joinedDaysAgo }, (_, i) => ({
      date: new Date(startedAt + i * dayMs).toISOString(),
      xp: Math.round(4000 + 3200 * Math.sin(i / 7) + i * 260),
    })),
    rank: 1,
    clan: { clan: { id: 1, tag: 'CLAN' } },
  };
  return cachedData;
}

export function getMockProfileGames() {
  if (cachedGames) return cachedGames;

  cachedGames = Array.from({ length: 10 }, (_, i) => ({
    coins: 1234567 - i * 98765,
    kills: 123 - i * 9,
    playtime: 3600 - i * 217,
    date: new Date(Date.now() - (i * 9 + 3) * dayMs).toISOString(),
  }));
  return cachedGames;
}
