function combine(openings, endings) {
  const lines = [];
  for (const opening of openings) {
    for (const ending of endings) lines.push(`${opening} ${ending}`.trim());
  }
  return lines;
}

function unique(lines) {
  return Object.freeze([...new Set(lines)]);
}

const attackedEndings = [
  'Stop attacking me!', "You're gonna pay for that!", 'Back off!',
  "You'll regret that!", 'You picked the wrong fight!',
];

const dialogue = Object.freeze({
  attacked: unique([
    ...attackedEndings,
    ...combine(
      ['Hey!', 'Seriously?', 'Oh, come on!', 'Bad move!', 'That hurt!', 'Enough!', 'Watch it!', 'No warning?', 'My turn!', 'Big mistake!'],
      attackedEndings,
    ),
  ]),
  lowHealth: unique(combine(
    ['Not good!', 'I need space!', 'This is close!', 'Still standing!', 'Almost down!', 'Hold together!', 'Stay calm!', 'Need a way out!'],
    ['I can recover!', 'Keep them away!', 'One more chance!', 'Time to retreat!'],
  )),
  flee: unique(combine(
    ['Fall back!', 'Move, move!', 'Too dangerous!', 'Not worth it!', 'I need distance!', 'Changing plans!', 'Out of here!', 'Live to fight!'],
    ['Find some cover!', 'Break their line!', 'Keep moving!', 'We can reset!'],
  )),
  challenge: unique(combine(
    ['Your move!', 'Come on then!', 'I see you!', 'Let us settle this!', 'Ready yourself!', 'No running!', 'This is my fight!', 'Square up!'],
    ['Show me your skill!', 'Try to keep up!', 'Meet me head-on!', 'Let us make this count!'],
  )),
  mob: unique(combine(
    ['Mob incoming!', 'Watch that creature!', 'I found a beast!', 'Keep it busy!', 'That thing is angry!', 'Creature on me!', 'Here it comes!'],
    ['Aim for the opening!', 'Do not get surrounded!', 'Take it down!', 'Stay out of reach!'],
  )),
  boss: unique(combine(
    ['Boss nearby!', 'That one is huge!', 'We need a plan!', 'This is a real threat!', 'Eyes on the boss!', 'Do not rush it!', 'Heavy hitter!'],
    ['Keep your distance!', 'Move together!', 'Wait for an opening!', 'Do not stand still!'],
  )),
  coins: unique(combine(
    ['Coins ahead!', 'I found a pile!', 'Easy money!', 'That gold is mine!', 'Time to collect!'],
    ['Grab it quickly!', 'Before someone else does!', 'Every coin counts!', 'Then back to fighting!'],
  )),
  ore: unique(combine(
    ['Ore spotted!', 'Time to mine!', 'This node looks rich!', 'I need that ore!', 'Mining break!'],
    ['Crack it open!', 'Keep watch for me!', 'This should pay well!', 'One clean strike!'],
  )),
  chest: unique(combine(
    ['Chest spotted!', 'Treasure ahead!', 'That chest is mine!', 'Big loot incoming!', 'I found a prize!'],
    ['Break it open!', 'Cover me!', 'Let us see what drops!', 'This could be good!'],
  )),
  wander: unique(combine(
    ['Quiet out here.', 'Where is everyone?', 'Keep exploring.', 'Nothing yet.', 'The map feels huge.', 'Stay alert.', 'On the move.'],
    ['Something will turn up.', 'Check the next area.', 'Do not lose focus.', 'There is always a fight nearby.'],
  )),
  ability: unique(combine(
    ['Ability ready!', 'Now is the time!', 'Special move!', 'Watch this!', 'Here goes!', 'Turning this around!'],
    ['Make it count!', 'Catch them off guard!', 'Full power!', 'This should work!'],
  )),
  victory: unique(combine(
    ['Got one!', 'That is a win!', 'Target down!', 'Too slow!', 'Fight finished!', 'Victory!', 'Next challenger!', 'That worked!'],
    ['Who is next?', 'Keep the streak going!', 'Back to the hunt!', 'That was close!'],
  )),
  formation: unique(combine(
    ['Team up?', 'Want to stick together?', 'Need a partner?', 'Join me?', 'Temporary truce?'],
    ['We cover each other.', 'Two swords are better.', 'Stay close.', 'Let us survive this.'],
  )),
  reply: unique(combine(
    ['Deal!', 'Agreed!', 'I am in!', 'Together!', 'Sounds good!'],
    ['I have your back.', 'Lead the way.', 'Stay beside me.', 'Let us move.'],
  )),
  team: unique(combine(
    ['Stay close!', 'Cover me!', 'Nice work!', 'Watch my back!', 'Keep formation!'],
    ['We have this!', 'Do not split up!', 'Focus the same target!', 'Keep moving!'],
  )),
});

const totalLines = Object.values(dialogue).reduce((sum, lines) => sum + lines.length, 0);
if (totalLines < 200) throw new Error(`Bot dialogue catalog is too small: ${totalLines}`);

function pick(category, random = Math.random) {
  const lines = dialogue[category] || dialogue.wander;
  const value = Number(random());
  const index = Math.min(lines.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * lines.length)));
  return lines[index];
}

module.exports = { dialogue, pick, totalLines };
