const { words: bannedWords, severeIndices } = require('./bannedWords');

// Unicode confusable characters → Latin equivalents (lowercase only, applied after toLowerCase())
// Covers Cyrillic, Greek, IPA, and small capital lookalikes
const _confusablesMap = {
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

module.exports = {
  random(min, max) {
    return min + (Math.random() * (max - min));
  },

  randomInteger(min, max) {
    return Math.floor(this.random(min, max + 1));
  },

  randomChoice(array) {
    return array[this.randomInteger(0, array.length - 1)];
  },

  randomNickname() {
    const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];
    const vowels = ['a', 'e', 'i', 'o', 'u'];

    let code = '';
    for (let i = 0; i < this.randomInteger(2, 5); i++) {
      code += this.randomChoice(consonants);
      code += this.randomChoice(vowels);
    }
    return `${code[0].toUpperCase()}${code.slice(1)}`;
  },

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  angleLerp(a0, a1, t) {
    const diff = this.angleDifference(a0, a1);
    return a0 + diff * t;
  },

  angleDifference(a, b) {
    return Math.atan2(Math.sin(b - a), Math.cos(b - a));
  },

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

 calculateGemsXP(coins, kills, tokens) {
    const xp = Math.floor(coins / 20) + (kills * 50)
    if (coins >= 1250000) {
      return {
        xp,
        gems: Math.floor(xp / 5),
        mastery: Math.floor((coins / 794) ** 1.5),
        tokens: tokens,
      };
    } else {
      return {
        xp,
        gems: Math.floor(xp / 5),
        mastery: Math.floor((coins / 5000) ** 2),
        tokens: tokens,
      };
    }
  },

  importCaptcha(captcha) {
    const prefix = 'captchaP';
    let output = '';
    // const matchingKeys = Object.keys(captcha).filter(key => key.startsWith(prefix));
    // for(let i = 0; i < matchingKeys.length; i++) {
    //   const part = captcha[prefix + i];
    //   if(!part) {
    //     alert('Invalid captcha');
    //     return;
    //   }
    //   output += part;
    // }
    Object.keys(captcha).forEach(key => {
      if(key.startsWith(prefix)) {
        output += captcha[key];
      }
    });
    return output;
  },

  normalizeText(text) {
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
  },

  _normalizedBannedCache: null,
  _getNormalizedBannedCache() {
    if (!this._normalizedBannedCache) {
      this._normalizedBannedCache = bannedWords.map(banned => {
        const normalized = this.normalizeText(banned);
        return { word: banned, normalized, deduped: normalized.replace(/(.)\1{2,}/g, '$1') };
      });
    }
    return this._normalizedBannedCache;
  },
  _normalizedSevereCache: null,
  _getNormalizedSevereCache() {
    if (!this._normalizedSevereCache) {
      this._normalizedSevereCache = severeIndices.map(i => {
        const word = bannedWords[i];
        const normalized = this.normalizeText(word);
        return { word, normalized, deduped: normalized.replace(/(.)\1{2,}/g, '$1') };
      });
    }
    return this._normalizedSevereCache;
  },

  filterChatMessage(message, filter) {
    if (!message || message.length === 0) return { filtered: message, matched: [] };

    const normalizeText = module.exports.normalizeText;
    const words = message.toLowerCase().split(/\s+/);
    const matchedWords = [];

    const bannedCache = module.exports._getNormalizedBannedCache();
    const severeCache = module.exports._getNormalizedSevereCache();

    for (const word of words) {
      const normalized = normalizeText(word);
      const deduped = normalized.replace(/(.)\1{2,}/g, '$1');

      for (const entry of bannedCache) {
        if (normalized === entry.normalized || deduped === entry.deduped) {
          if (!matchedWords.includes(entry.word)) {
            matchedWords.push(entry.word);
          }
          break;
        }

        const strippedWord = normalized
          .replace(/[sz]+$/i, '')
          .replace(/y$/i, '')
          .replace(/ed$/i, '')
          .replace(/ing$/i, '')
          .replace(/er$/i, '');
        const strippedDeduped = strippedWord.replace(/(.)\1{2,}/g, '$1');

        if ((strippedWord === entry.normalized || strippedDeduped === entry.deduped) && strippedWord.length >= 3) {
          if (!matchedWords.includes(entry.word)) {
            matchedWords.push(entry.word);
          }
          break;
        }
      }

      for (const entry of severeCache) {
        if (normalized.length >= entry.normalized.length + 1) {
          if (normalized.includes(entry.normalized) || deduped.includes(entry.deduped)) {
            if (!matchedWords.includes(entry.word)) {
              matchedWords.push(entry.word);
            }
            break;
          }
        }
      }
    }

    if (matchedWords.length > 0) {
      return { filtered: '*'.repeat(message.length), matched: matchedWords };
    }

    return { filtered: message, matched: [] };
  }

};
