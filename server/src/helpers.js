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

 calculateGemsXP(coins, kills) {
    const xp = Math.floor(coins / 20) + kills
    return {
      xp,
      gems: Math.floor(xp / 5)
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
  }

};
