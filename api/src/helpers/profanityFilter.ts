const bannedWords = [
  'fuck', 'fuk', 'fck', 'fuc',
  'shit', 'sht',
  'nigger', 'nigga', 'niga', 'nga', 'ngger', 'nggr', 'ngr', 'ngag', 'nigag', 'niggir', 'niggre', 'nigre', 'niggo', 'niggor',
  'fag', 'faggot', 'fagot',
  'bitch', 'btch',
  'dick', 'dik', 'dih',
  'cock', 'cok',
  'pussy', 'psy',
  'retard', 'retrd',
  'rape', 'rpe',
  'whore', 'whor',
  'slut',
  'ass',
  'gay',
  'fk', 'fkc', 'fkk', 'fku', 'fkyou', 'fkuu', 'fkyouu', 'fkuuu', 'fkyouuu'
];

const severeIndices = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 27, 40];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/9/g, 'g')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/\!/g, 'i')
    .replace(/\*/g, '')
    .replace(/\+/g, 't')
    .replace(/\|/g, 'i')
    .replace(/\./g, '')
    .replace(/\_/g, '')
    .replace(/-/g, '')
    .replace(/[ckq]+/g, (match) => match.length === 1 ? 'c' : 'k')
    .replace(/ph/g, 'f')
    .replace(/x{2,}/g, 'x');
}

export function containsProfanity(message: string): boolean {
  if (!message || message.length === 0) return false;

  const words = message.toLowerCase().split(/\s+/);
  const severeWords = severeIndices.map(i => bannedWords[i]);

  for (const word of words) {
    const normalized = normalizeText(word);
    const deduped = normalized.replace(/(.)\1{2,}/g, '$1');

    for (const banned of bannedWords) {
      const normalizedBanned = normalizeText(banned);
      const dedupedBanned = normalizedBanned.replace(/(.)\1{2,}/g, '$1');

      if (normalized === normalizedBanned || deduped === dedupedBanned) {
        return true;
      }

      const strippedWord = normalized
        .replace(/[sz]+$/i, '')
        .replace(/y$/i, '')
        .replace(/ed$/i, '')
        .replace(/ing$/i, '')
        .replace(/er$/i, '');
      const strippedDeduped = strippedWord.replace(/(.)\1{2,}/g, '$1');

      if ((strippedWord === normalizedBanned || strippedDeduped === dedupedBanned) && strippedWord.length >= 3) {
        return true;
      }
    }

    for (const severe of severeWords) {
      const normalizedSevere = normalizeText(severe);
      const dedupedSevere = normalizedSevere.replace(/(.)\1{2,}/g, '$1');

      if (normalized.length >= normalizedSevere.length + 1) {
        if (normalized.includes(normalizedSevere) || deduped.includes(dedupedSevere)) {
          return true;
        }
      }
    }
  }

  return false;
}
