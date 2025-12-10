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
      .replace(/\s+/g, '') // no whitespace
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/\$/g, 's')
      .replace(/@/g, 'a')
      .replace(/\!/g, 'i')
      .replace(/\*/g, '')
      .replace(/\+/g, 't')
      .replace(/\|/g, 'i')
      .replace(/\./g, '')
      .replace(/\_/g, '')
      .replace(/-/g, '');
  },

  filterChatMessage(message, filter) {
    if (!message || message.length === 0) return message;

    const normalizeText = module.exports.normalizeText;
    const normalizedMessage = normalizeText(message);

    // Split message into words for word-boundary checking
    const words = message.toLowerCase().split(/\s+/);

    // Normalize all bad words from the filter
    const badWords = filter.list();
    const hasProfanity = badWords.some(word => {
      const normalizedBadWord = normalizeText(word);

      // Check each word in the message individually (prevents "pass" from matching "ass")
      for (const messageWord of words) {
        const normalizedWord = normalizeText(messageWord);

        // 1. Exact match after normalization (catches leet speak, symbols, spaces)
        if (normalizedWord === normalizedBadWord) {
          return true;
        }

        // 2. Fuzzy vowel matching - only for short messages or single words
        const badWordNoVowels = normalizedBadWord.replace(/[aeiou]/g, '');
        const wordNoVowels = normalizedWord.replace(/[aeiou]/g, '');

        // Match if consonants are identical AND word is shorter (vowels removed)
        if (badWordNoVowels.length >= 3 &&
            wordNoVowels === badWordNoVowels &&
            normalizedWord.length < normalizedBadWord.length) {
          return true;
        }
      }

      // 3. Special case: check if entire message (normalized) is just the bad word with spaces
      if (normalizedMessage === normalizedBadWord) {
        return true;
      }

      // 4. Special case: check if entire message has consonants matching bad word
      const normalizedMessageNoVowels = normalizedMessage.replace(/[aeiou]/g, '');
      const badWordNoVowels = normalizedBadWord.replace(/[aeiou]/g, '');

      if (badWordNoVowels.length >= 3 &&
          normalizedMessageNoVowels === badWordNoVowels &&
          normalizedMessage.length < normalizedBadWord.length) {
        return true;
      }

      return false;
    });

    if (hasProfanity) {
      return '*'.repeat(message.length);
    }

    return message;
  }

};
