const storageKey = 'swordbattle:personalBest';

export interface PersonalBestData {
  coins: number;
  kills: number;
  survivalTime: number;
}

export interface PBComparison {
  pb: PersonalBestData;
  records: {
    coins: boolean;
    kills: boolean;
    survivalTime: boolean;
  };
  anyRecord: boolean;
}

function loadPB(): PersonalBestData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        coins: data.coins || 0,
        kills: data.kills || 0,
        survivalTime: data.survivalTime || 0,
      };
    }
  } catch (e) {
  }
  return { coins: 0, kills: 0, survivalTime: 0 };
}

function savePB(pb: PersonalBestData): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(pb));
  } catch (e) {
  }
}

export function updatePB(results: { coins: number; kills: number; survivalTime: number }): PBComparison {
  const pb = loadPB();
  const records = {
    coins: results.coins > pb.coins,
    kills: results.kills > pb.kills,
    survivalTime: results.survivalTime > pb.survivalTime,
  };

  if (records.coins) pb.coins = results.coins;
  if (records.kills) pb.kills = results.kills;
  if (records.survivalTime) pb.survivalTime = results.survivalTime;

  savePB(pb);

  return {
    pb,
    records,
    anyRecord: records.coins || records.kills || records.survivalTime,
  };
}

export function getPB(): PersonalBestData {
  return loadPB();
}

export function getEncouragingMessage(current: number, best: number): string {
  if (best === 0) return '';
  const ratio = current / best;
  if (ratio >= 1) return '';
  if (ratio >= 0.8) return 'So close to your record!';
  if (ratio >= 0.5) return 'Almost there!';
  return 'Keep going!';
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
