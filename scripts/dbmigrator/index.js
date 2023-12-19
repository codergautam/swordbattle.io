// script to migrate legacy sb database to v2 database
// note: doesnt support games table since its so different basically pointless for a leaderboard
// u can prob add it pretty easily

import postgres from 'postgres'
import cosmetics from '../../cosmetics.json' assert { type: "json" };
import {config} from 'dotenv';
import fs from 'fs';
config();

const ignoreNewDb = true;
const useStatsCached = true;

if(!process.env.OLD_DB) throw new Error('No old db url provided');
if(!process.env.NEW_DB && !ignoreNewDb) throw new Error('No new db url provided');

// connect to the old db
const sql = postgres(process.env.OLD_DB, {
  ssl: {
    rejectUnauthorized: false,
  },
  max: 3
});

const sql2 = !ignoreNewDb ? postgres(process.env.NEW_DB, {
}) : () => {};

if(!ignoreNewDb) {
// check if te new db works
(async () => {
  try {
    await sql2`SELECT * FROM accounts limit 1`;
  } catch (error) {
    console.error('Failed to connect to new db', error);
    throw error;
  }
})();
}

let permText = ["Swordbattle.io Database Migrator\n"];

// ask confirmation on clearing all rows in new db
let clear = true;
if(clear) {
// clear all rows in new db
const tables = ['daily_stats', 'games', 'sessions', 'total_stats', 'transactions', 'accounts'];
for(const table of tables) {
  try {
    await sql2`DELETE FROM ${sql2(table)}`;
  } catch (error) {
    console.error('Failed to clear table', table, error);
    throw error;
  }
}
addTextToPerm('Cleared '+ tables.length +' tables');
}




let ignoredList = ["bass"]
function calcXp(coins, kills) {
  return Math.floor((coins) / 50) + kills;
}
function calculateTotals(stats) {
  let totalCoins = stats.reduce((acc, curr) => acc + convertIfNumber(curr.coins), 0);
  let totalStabs = stats.reduce((acc, curr) => acc + convertIfNumber(curr.stabs), 0);
  let totalXp = calcXp(totalCoins, totalStabs);
  return {
    playtime: stats.reduce((acc, curr) => acc + convertIfNumber(curr.game_time), 0),
    coins: totalCoins,
    kills: totalStabs,
    games: stats.reduce((acc, curr) => acc + convertIfNumber(curr.game_count), 0),
    xp: totalXp,
  }
}

let warnings = 0;

function convertIfNumber(value) {
  if(typeof value === 'number') return value;
  if(typeof value === 'string') {
    if(isNaN(value)) {
      if(!value) {
        warnings++;
        // logText(`Warning: Value is empty ${warnings}`);
        return 0;
      }
      throw new Error('Value is not a number1- '+ value);

    }
    return parseInt(value);
  }
  if(typeof value === 'undefined' || value === null) {
    warnings++;
    // logText(`Warning: Value is undefined ${warnings}`);
    return 0;
  }
  throw new Error('Value is not a number- '+ value);
}

function getNewSkins (skins) {
  if(!skins || !skins.hasOwnProperty('collected') || !skins.hasOwnProperty('selected')) throw new Error('Invalid skins object- '+ JSON.stringify(skins));
  function getSkinId(skinName) {
    let skin = Object.values(cosmetics.skins).find(s => s.name.toLowerCase() === skinName.toLowerCase())?.id;
    if(!skin) throw new Error('Skin not found- '+ skinName);
    return skin;
  }
  let newSkins = {}
  newSkins.owned = skins.collected.filter(s => !s || !ignoredList.includes(s)).map(s => getSkinId(s));
  newSkins.equipped = !skins.selected || ignoredList.includes(skins.selected) ? 1 : getSkinId(skins.selected);
  if(newSkins.equipped === -1) throw new Error('Skin not found', skins.equipped);
  if(newSkins.owned.includes(-1)) throw new Error('Skin not found', skins.owned.find(s => s === -1));

  // remove duplicates
  newSkins.owned = [...new Set(newSkins.owned)];

  return newSkins;
}

function calculateGemsXP(stats, coinsDiff) {
  // console.log(stats, totalStats(stats, 1));
  let totaled = calculateTotals(stats);
  const totaledCoins = totaled.coins;
  const totaledStabs = totaled.kills;
  const totaledXp = totaled.xp;
  coinsDiff = convertIfNumber(coinsDiff);

  // logic to convert old coins/xp to new system
  /*
  newC = oldCoins /3
  newXp = (newC / 50) + kills
  Gems = 100 + ((coinBal / 3) / 50)

  use logaithms after 10k gems, way too much
*/
let gems = Math.floor((totaledCoins + coinsDiff) / 50 / 5);
if(gems > 10000) {
  gems = Math.floor(10000 + Math.log10(gems - 10000) * 3000);
}
  return {
    xp: totaledXp,
    gems: 50+gems,
  }
}

async function migrateUser(username, account, stats, games) {
  // need to transfer account, game data and stats data from respective tables
  // get account
  // let account = await sql`SELECT * FROM accounts WHERE username = ${username}`;
  if(!account) return false;


  // get user stats
  // let stats = await sql`SELECT * FROM stats WHERE username = ${username}`;
  // let games = await sql`SELECT * FROM games WHERE name = ${username}`;

  if(typeof account.skins === "string") {
    account.skins = JSON.parse(account.skins)
  }

  let newAccStruct = {
    created_at: account.created_at,
    username: account.username,
    password: account.password,
    email: account.email,
    gems: calculateGemsXP(stats, account.coins)?.gems,
    xp: calculateGemsXP(stats, account.coins)?.xp,
    is_v1: true,
    profile_views: convertIfNumber(account.profile_views),
    skins: getNewSkins(account.skins),
  }

  return newAccStruct;
}
function logText(text) {
  console.clear();
  if(!text) return console.log(permText.join('\n'));
  console.log(permText.join('\n') + '\n' + text??'');
}

function addTextToPerm(text) {
  console.clear();
  permText.push(text);
  logText('');
}
function calculateEta(start, done, total) {
  let timeTaken = Date.now() - start;
  let timePerItem = timeTaken / done;
  let timeLeft = timePerItem * (total - done);
  // format it hours, min, sec
  let hours = Math.floor(timeLeft / 3600000);
  timeLeft -= hours * 3600000;
  let minutes = Math.floor(timeLeft / 60000);
  timeLeft -= minutes * 60000;
  let seconds = Math.floor(timeLeft / 1000);
  timeLeft -= seconds * 1000;
  timeLeft = `${hours}h ${minutes}m ${seconds}s`;
  return timeLeft;
}

function mapStatsDaily(oldStats, account_id) {
  return {
    account_id,
    date: oldStats.game_date,
    xp: calcXp(convertIfNumber(oldStats.coins), convertIfNumber(oldStats.stabs)),
    coins: convertIfNumber(oldStats.coins),
    kills: convertIfNumber(oldStats.stabs),
    games: convertIfNumber(oldStats.game_count),
    playtime: convertIfNumber(oldStats.game_time),
  }
}

async function insertAccount(account) {
  let newAcc = await sql2`INSERT INTO accounts (created_at, username, password, email, gems, xp, is_v1, profile_views, skins) VALUES (${account.created_at}, ${account.username}, ${account.password}, ${account.email}, ${account.gems}, ${account.xp}, ${account.is_v1}, ${account.profile_views}, ${account.skins}) RETURNING *`;
  return newAcc;
}

async function insertTotalStats(stats, account_id) {
  let newStats = await sql2`INSERT INTO total_stats (id, xp, coins, kills, games, playtime) VALUES (${account_id}, ${stats.xp}, ${stats.coins}, ${stats.kills}, ${stats.games}, ${stats.playtime}) RETURNING *`;
  return newStats;
}

async function createTransaction(account_id, amount, desc) {
  /*  public.transactions (
    id serial NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    transaction_id character varying NOT NULL,
    description character varying NOT NULL,
    amount integer NOT NULL,
    account_id integer NULL
  ); */
  let newTransaction = await sql2`INSERT INTO transactions (account_id, amount, description, transaction_id) VALUES (${account_id}, ${amount}, ${desc}, 'gems') RETURNING *`;
  return newTransaction;
}

async function insertDailyStats(stats, acc_id) {
  let newStats = await sql2`INSERT INTO daily_stats (account_id, date, xp, coins, kills, games, playtime) VALUES (${acc_id}, ${stats.date}, ${stats.xp}, ${stats.coins}, ${stats.kills}, ${stats.games}, ${stats.playtime}) RETURNING *`;
  return newStats;
}

let stopAt = 10000;
(async () => {
  let accs;
  logText('Downloading database (0/2)');
  if(stopAt) {
  accs= await sql`SELECT * FROM accounts limit ${stopAt}`;
  } else {
    accs = await sql`SELECT * FROM accounts`;
  }
  logText('Downloading database (1/2)');
  let accStats = {};
  // const accGames = {};
  const allStats = await sql`SELECT * FROM stats`;
  // logText('Downloading database (2/2)');
  // const allGames = await sql`SELECT * FROM games`;
  addTextToPerm('Downloaded database (2/2)');

  function findAll(dataset, predicate) {
    return dataset.filter(predicate);
}
let done = 0;
const start = Date.now();

if(useStatsCached) {
  accStats = fs.readFileSync('./accStats.json');
  accStats = JSON.parse(accStats);
  done = Object.keys(accStats).length;
} else {
  const processAccount = async (acc, index, total) => {
    try {
      accStats[acc.username] = findAll(allStats, s => s.username === acc.username);
      done++;
      logText(`Fetching accounts (${done}/${total}) ETA: ${calculateEta(start, done, total)} ${acc.username}`);
    } catch (error) {
      console.error('Error processing account:', acc.username, error);
    }
  };

  let promises = accs;
  promises = promises.map((acc, index) => processAccount(acc, index, promises.length));
  logText(`Fetching accounts..`)
  await Promise.all(promises);
}
  addTextToPerm(`Fetched accounts (${done}/${typeof promises !== 'undefined' ? promises.length : done})`);
  // save in json file
  if(!useStatsCached){
  fs.writeFileSync('./accStats.json', JSON.stringify(accStats));
  }
  // migrate users
  const waitMs = 10;
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let migrated = 0;
  let migratedUsers = {};
  let migratedTotalStats = {};
  let migratedDailyStats = {};
  for (const acc of accs) {
      let migratedUser = await migrateUser(acc.username, acc, accStats[acc.username], null);
      if(migratedUser) {
        migratedUsers[acc.username] = migratedUser;
      } else {
        throw new Error('User failed mapping - '+ acc.username);
      }
      let migratedTotalStat = calculateTotals(accStats[acc.username]);

      if(!migratedTotalStat) throw new Error('Failed to calculate totals for user - '+ acc.username);
      migratedTotalStats[acc.username] = migratedTotalStat;

      let migratedStatsDaily = accStats[acc.username].map(s => mapStatsDaily(s, migratedUser.id));
      if(!migratedStatsDaily) throw new Error('Failed to map stats daily for user - '+ acc.username);
      migratedDailyStats[acc.username] = migratedStatsDaily;
      migrated++;

      if(migrated !== Object.values(migratedUsers).length) throw new Error('Failed to map user - '+ acc.username+' - probably a duplicate username');
      await wait(waitMs);
      logText(`Mapping users (${migrated}/${accs.length}) ETA: ${calculateEta(start, migrated, accs.length)} ${acc.username}`);

  }
  addTextToPerm(`Mapped users (${migrated}/${accs.length})`);

  if(accs.length !== Object.values(migratedUsers).length) {
    console.log('accs', accs.length, 'migrated', Object.values(migratedUsers).length);
    let failed = accs.filter(acc => !Object.keys(migratedUsers).includes(acc.username));
    failed = failed.concat(Object.values(migratedUsers).filter(acc => !acc));
    // rm duplicates
    failed = [...new Set(failed)];
    console.log(failed)
    // addTextToPerm(`Failed to migrate ${failed.length} users`);
    // // log the users that failed
    // addTextToPerm(`Failed users: ${failed.map(f => f.username).join(', ')}`);
    throw new Error('Failed to migrate all users');
  }

  // insert accounts
  let inserted = 0;
  for(const acc of Object.values(migratedUsers)) {
      let newAcc = await insertAccount(acc);
      if(!newAcc) throw new Error('Failed to insert account - '+ acc.username+' - data: '+JSON.stringify(acc));

      newAcc = newAcc[0];
      let newId = newAcc.id;
      const totalStats = migratedTotalStats[acc.username];
      let totalinserted = await insertTotalStats(totalStats, newId);
      if(!totalinserted) throw new Error('Failed to insert total stats - '+ acc.username);
      const userGems = calculateGemsXP(migratedDailyStats[acc.username], acc.coins)?.gems;
      let transaction = await createTransaction(newId, userGems, 'Veteran player reward');
      if(!transaction) throw new Error('Failed to insert transaction - '+ acc.username);
      // daily stats
      for(const stat of migratedDailyStats[acc.username]) {
        let newStat = await insertDailyStats(stat, newId);
        if(!newStat) throw new Error('Failed to insert daily stat - '+ acc.username);
      }
      inserted++;

        logText(`Inserting accounts (${inserted}/${Object.values(migratedUsers).length})`);
  }
  addTextToPerm(`Inserted accounts (${inserted}/${Object.values(migratedUsers).length})`);
  console.log('Done migrating! Built with <3 by Gautam');
})();
