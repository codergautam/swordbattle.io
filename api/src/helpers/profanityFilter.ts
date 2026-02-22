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

const severeIndices = [0, 1, 2, 3, 4, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20, 23, 27, 40];

// Unicode confusable characters → Latin equivalents (lowercase only, applied after toLowerCase())
// Covers Cyrillic, Greek, IPA, and small capital lookalikes
const _confusablesMap: Record<string, string> = {
  // Cyrillic → Latin
  '\u0430': 'a', // а
  '\u0432': 'b', // в
  '\u0441': 'c', // с
  '\u0435': 'e', // е
  '\u0451': 'e', // ё
  '\u0454': 'e', // є (Ukrainian ie)
  '\u0456': 'i', // і (Ukrainian i)
  '\u0457': 'i', // ї (Ukrainian yi)
  '\u0458': 'j', // ј (Serbian/Macedonian je)
  '\u043A': 'k', // к
  '\u043C': 'm', // м
  '\u043D': 'h', // н
  '\u043E': 'o', // о
  '\u0440': 'p', // р
  '\u0455': 's', // ѕ (Macedonian)
  '\u0442': 't', // т
  '\u0443': 'y', // у
  '\u0445': 'x', // х
  '\u044C': 'b', // ь (soft sign)
  '\u044D': 'e', // э
  // Greek → Latin
  '\u03B1': 'a', // α
  '\u03B2': 'b', // β
  '\u03B5': 'e', // ε
  '\u03B7': 'n', // η
  '\u03B9': 'i', // ι
  '\u03BA': 'k', // κ
  '\u03BD': 'v', // ν
  '\u03BF': 'o', // ο
  '\u03C1': 'p', // ρ
  '\u03C2': 's', // ς (final sigma)
  '\u03C4': 't', // τ
  '\u03C5': 'u', // υ
  '\u03C7': 'x', // χ
  // IPA / Small capitals / Latin extended
  '\u0251': 'a', // ɑ (Latin alpha)
  '\u0261': 'g', // ɡ (script g)
  '\u026A': 'i', // ɪ (small capital I)
  '\u0274': 'n', // ɴ (small capital N)
  '\u0280': 'r', // ʀ (small capital R)
  '\u0299': 'b', // ʙ (small capital B)
  '\u029C': 'h', // ʜ (small capital H)
  '\u1D00': 'a', // ᴀ
  '\u1D04': 'c', // ᴄ
  '\u1D05': 'd', // ᴅ
  '\u1D07': 'e', // ᴇ
  '\u1D0B': 'k', // ᴋ
  '\u1D0D': 'm', // ᴍ
  '\u1D0F': 'o', // ᴏ
  '\u1D18': 'p', // ᴘ
  '\u1D1B': 't', // ᴛ
  '\u1D1C': 'u', // ᴜ
  '\u1D21': 'w', // ᴡ
  '\u1D22': 'z', // ᴢ
};

function normalizeText(text: string): string {
  return text
    // Strip zero-width, invisible, and formatting characters
    .replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\uFFA0]/g, '')
    // NFKD: decomposes fullwidth, math styled, superscript/subscript, accented chars to base forms
    .normalize('NFKD')
    // Strip combining diacritical marks (accents, overlines, etc.)
    .replace(/[\u0300-\u036F\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, '')
    .toLowerCase()
    // Map known Unicode confusables (Cyrillic, Greek, etc.) to Latin; strip any remaining non-ASCII
    .replace(/[^\x00-\x7F]/g, ch => _confusablesMap[ch] || '')
    // Original leetspeak / symbol substitutions
    .replace(/\s+/g, '')
    .replace(/l/g, 'i')
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
