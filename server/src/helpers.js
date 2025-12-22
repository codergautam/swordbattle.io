const { words: bannedWords, severeIndices } = require('./bannedWords');

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
    return Math.sqrt((x2 - x1) ** 2, (y2 - y1) ** 2);
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
  },

  filterChatMessage(message, filter) {
    if (!message || message.length === 0) return { filtered: message, matched: [] };

    const normalizeText = module.exports.normalizeText;
    const words = message.toLowerCase().split(/\s+/);
    const matchedWords = [];

    const severeWords = severeIndices.map(i => bannedWords[i]);

    for (const word of words) {
      const normalized = normalizeText(word);
      const deduped = normalized.replace(/(.)\1+/g, '$1');

      for (const banned of bannedWords) {
        const normalizedBanned = normalizeText(banned);
        const dedupedBanned = normalizedBanned.replace(/(.)\1+/g, '$1');

        if (normalized === normalizedBanned || deduped === dedupedBanned) {
          if (!matchedWords.includes(banned)) {
            matchedWords.push(banned);
          }
          break;
        }

        const strippedWord = normalized
          .replace(/[sz]+$/i, '')
          .replace(/y$/i, '')
          .replace(/ed$/i, '')
          .replace(/ing$/i, '')
          .replace(/er$/i, '');
        const strippedDeduped = strippedWord.replace(/(.)\1+/g, '$1');

        if ((strippedWord === normalizedBanned || strippedDeduped === dedupedBanned) && strippedWord.length >= 3) {
          if (!matchedWords.includes(banned)) {
            matchedWords.push(banned);
          }
          break;
        }
      }

      for (const severe of severeWords) {
        const normalizedSevere = normalizeText(severe);
        const dedupedSevere = normalizedSevere.replace(/(.)\1+/g, '$1');

        if (normalized.length >= normalizedSevere.length + 3) {
          if (normalized.includes(normalizedSevere) || deduped.includes(dedupedSevere)) {
            if (!matchedWords.includes(severe)) {
              matchedWords.push(severe);
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
