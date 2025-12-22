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
    const normalizedMessage = normalizeText(message);

    const words = message.toLowerCase().split(/\s+/);

    const whitelist = [
      'rap', 'raps', 'shot', 'shots', 'hunt', 'hunts', 'hunter', 'hunting',
      'bass', 'pass', 'class', 'grass', 'sass', 'mass', 'assassin',
      'por', 'para', 'pero', 'como', 'con', 'sin', 'las', 'los', 'una', 'uno',
      'que', 'esta', 'ese', 'esa', 'este', 'son', 'muy', 'bien', 'mas',
      'analyze', 'analysis', 'bass', 'bassist',
      'suck', 'sucks', 'sucking', 'sucked',
      'coins', 'coin', 'speed', 'dmg', 'damage', 'max', 'and', 'the'
    ];

    const strictWords = ['fuck', 'nigga', 'nigger', 'niga', 'nga', 'fag', 'faggot', 'fk'];

    const badWords = filter.list();
    const matchedWords = [];

    strictWords.forEach(strictWord => {
      const normalizedStrict = normalizeText(strictWord);
      const dedupedStrict = normalizedStrict.replace(/(.)\1+/g, '$1');

      for (const messageWord of words) {
        if (whitelist.includes(messageWord.toLowerCase())) {
          continue;
        }

        const normalizedWord = normalizeText(messageWord);
        if (normalizedWord.length >= 4 && (normalizedWord.includes(normalizedStrict) || normalizedWord.includes(dedupedStrict))) {
          if (!matchedWords.includes(strictWord)) {
            matchedWords.push(strictWord);
          }
          break;
        }
      }
    });

    badWords.forEach(word => {
      const normalizedBadWord = normalizeText(word);

      for (const messageWord of words) {
        if (whitelist.includes(messageWord.toLowerCase())) {
          continue;
        }

        let normalizedWord = normalizeText(messageWord);

        if (normalizedWord === normalizedBadWord) {
          matchedWords.push(word);
          return;
        }

        const dedupedWord = normalizedWord.replace(/(.)\1+/g, '$1');
        const dedupedBad = normalizedBadWord.replace(/(.)\1+/g, '$1');
        if (dedupedWord === dedupedBad) {
          matchedWords.push(word);
          return;
        }

        const suffixVariants = [
          normalizedWord.replace(/[sz]+$/i, ''),
          normalizedWord.replace(/ed$/i, ''),
          normalizedWord.replace(/ing$/i, ''),
          normalizedWord.replace(/er$/i, ''),
          normalizedWord.replace(/y$/i, ''),
          normalizedWord.replace(/ie$/i, ''),
        ];

        for (const variant of suffixVariants) {
          if (variant.length >= 3 && variant === normalizedBadWord) {
            matchedWords.push(word);
            return;
          }
          const dedupedVariant = variant.replace(/(.)\1+/g, '$1');
          if (dedupedVariant.length >= 2 && dedupedVariant === dedupedBad) {
            matchedWords.push(word);
            return;
          }
          if (dedupedVariant.length >= 4 && dedupedBad.length >= 4 &&
              dedupedVariant.startsWith(dedupedBad)) {
            matchedWords.push(word);
            return;
          }
        }

        if (normalizedBadWord.length >= 4) {
          const wordNoVowels = normalizedWord.replace(/[aeiou]/g, '');
          const badNoVowels = normalizedBadWord.replace(/[aeiou]/g, '');

          if (wordNoVowels.length >= 2 && wordNoVowels === badNoVowels) {
            matchedWords.push(word);
            return;
          }
        }

        const cleanedWord = normalizedWord.replace(/[hx]/g, '');
        const cleanedBad = normalizedBadWord.replace(/[hx]/g, '');
        if (cleanedWord.length >= 3 && cleanedWord === cleanedBad) {
          matchedWords.push(word);
          return;
        }
      }

      if (normalizedMessage === normalizedBadWord) {
        matchedWords.push(word);
        return;
      }

      const dedupedMessage = normalizedMessage.replace(/(.)\1+/g, '$1');
      const dedupedBad = normalizedBadWord.replace(/(.)\1+/g, '$1');
      if (dedupedMessage === dedupedBad) {
        matchedWords.push(word);
        return;
      }
    });

    if (matchedWords.length > 0) {
      return { filtered: '*'.repeat(message.length), matched: matchedWords };
    }

    return { filtered: message, matched: [] };
  }

};
