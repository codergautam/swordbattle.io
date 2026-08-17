// Dialogue is composed lazily instead of storing hundreds of near-duplicate
// strings per bot. The Cartesian product below exposes more than 800 unique,
// profanity-free lines while keeping the shared table small.
const OPENERS = {
  greeting: ['Hey', 'Hello', 'Yo', 'Good to see you'],
  damaged: ['Ow', 'Nice hit', 'That stung', 'You got me'],
  lowHealth: ['I need space', 'Backing off', 'Too close', 'Not done yet'],
  dodge: ['Missed me', 'Too slow', 'Saw that', 'Not today'],
  swordThrow: ['Catch this', 'Sword away', 'Incoming', 'Try dodging'],
  mobWarning: ['Watch the mob', 'Big threat', 'Monster nearby', 'Heads up'],
  victory: ['Good fight', 'That was close', 'Well played', 'Victory'],
  defeat: ['You win this one', 'Good hit', 'I will be back', 'Fair fight'],
  teamOffer: ['Team up', 'Want backup', 'Join me', 'Let us cooperate'],
  teamAccept: ['Deal', 'I am with you', 'Team formed', 'I have your back'],
  teamAssist: ['Covering you', 'I am coming', 'Hold on', 'Backup is here'],
  rivalry: ['You are my rival', 'Rematch time', 'Just us two', 'I challenge you'],
  neutral: ['No trouble', 'Passing through', 'We are even', 'Peace for now'],
  runner: ['Nope', 'I choose distance', 'Keep away', 'Running is smart'],
  spartan: ['I stand my ground', 'No retreat', 'Come at me', 'Hold the line'],
  resource: ['Found loot', 'Treasure ahead', 'Coins spotted', 'Good haul'],
};

const CORES = {
  greeting: ['nice weather', 'stay sharp', 'good luck', 'ready to roam'],
  damaged: ['that was clean', 'my armor felt it', 'now I am awake', 'fight is on'],
  lowHealth: ['I need to recover', 'give me a moment', 'this is risky', 'resetting the fight'],
  dodge: ['your aim was close', 'projectile avoided', 'I read the angle', 'keep trying'],
  swordThrow: ['straight downrange', 'aimed and ready', 'from downtown', 'right on target'],
  mobWarning: ['do not stand still', 'spread out now', 'watch its attack', 'move together'],
  victory: ['you fought well', 'respect earned', 'that was intense', 'until next time'],
  defeat: ['I learned something', 'next round is mine', 'respect', 'that was close'],
  teamOffer: ['two swords are better', 'we can cover each other', 'let us share targets', 'strength in numbers'],
  teamAccept: ['focus the same threat', 'stay nearby', 'I will cover you', 'we move together'],
  teamAssist: ['targeting your attacker', 'stay alive', 'fall behind me', 'we fight together'],
  rivalry: ['first to three wins', 'prove your skill', 'no cheap shots', 'settle the score'],
  neutral: ['I will not engage', 'keep your distance', 'we can coexist', 'save it for later'],
  runner: ['range is my friend', 'not taking that fight', 'catch me first', 'I prefer arrows'],
  spartan: ['health is just a number', 'pressure makes legends', 'I can take it', 'never surrender'],
  resource: ['split the path', 'check the chest', 'mine it quickly', 'grab it before trouble'],
};

const ENDINGS = [
  '.',
  '!',
  ', {name}.',
  ' - stay ready.',
];

const situations = Object.keys(OPENERS);

function normalizeName(name) {
  const value = typeof name === 'string' && name.length > 0 ? name : 'friend';
  return value.slice(0, 20);
}

function lineCount() {
  let count = 0;
  for (const situation of situations) {
    count += OPENERS[situation].length * CORES[situation].length * ENDINGS.length;
  }
  return count;
}

function getLine(situation, context = {}, random = Math.random) {
  const openers = OPENERS[situation] || OPENERS.greeting;
  const cores = CORES[situation] || CORES.greeting;
  const total = openers.length * cores.length * ENDINGS.length;
  let index = Math.min(total - 1, Math.floor(random() * total));
  const ending = ENDINGS[index % ENDINGS.length];
  index = Math.floor(index / ENDINGS.length);
  const core = cores[index % cores.length];
  const opener = openers[Math.floor(index / cores.length) % openers.length];
  const name = normalizeName(context.name);
  return `${opener}, ${core}${ending}`.replace('{name}', name).slice(0, 60);
}

function allLines(name = 'friend') {
  const lines = [];
  for (const situation of situations) {
    for (const opener of OPENERS[situation]) {
      for (const core of CORES[situation]) {
        for (const ending of ENDINGS) {
          lines.push(`${opener}, ${core}${ending}`.replace('{name}', normalizeName(name)).slice(0, 60));
        }
      }
    }
  }
  return lines;
}

module.exports = { getLine, lineCount, allLines, situations };
