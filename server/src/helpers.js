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

  shortAngleDist(a0,a1) {
    const max = Math.PI * 2;
    const da = (a1 - a0) % max;
    return 2 * da % max - da;
  },

  angleLerp(a0, a1, t, shortest = true) {
    if (shortest) {
      return a0 + this.shortAngleDist(a0, a1) * t;
    }
    return a0 + (a1 - a0) * t;
  },

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  },

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2, (y2 - y1) ** 2);
  },
};
