// script to migrate legacy sb database to v2 database
// note: doesnt support games table since its so different basically pointless for a leaderboard
// u can prob add it pretty easily

import postgres from 'postgres'
import cosmetics from '../../cosmetics.json' assert { type: "json" };
import {config} from 'dotenv';
import fs from 'fs';
config();
console.log('Swordbattle.io Database Migrator.. Initializing..');
let lastLog = 0;

const ignoreNewDb = false;
const useStatsCached = false;
// set stopAt to integer to limit to N users migrated
let stopAt = false;

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




let ignoredList = ["bass", "realZombie"]
function calcXp(coins, kills) {
  return Math.floor((coins) / 50) + kills;
}
function calculateTotals(stats) {
  let totalCoins = stats.reduce((acc, curr) => acc + convertIfNumber(curr.coins), 0);
  let totalStabs = stats.reduce((acc, curr) => acc + convertIfNumber(curr.stabs), 0);
  let totalXp = calcXp(totalCoins, totalStabs);
  return {
    playtime: Math.round(stats.reduce((acc, curr) => acc + convertIfNumber(curr.game_time), 0)/1000),
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
let gems = Math.floor((totaledCoins + coinsDiff) / 50 / 3);
// if(gems > 50000) {
//   gems = Math.floor(50000 + Math.log10(gems - 50000) * 3000);
// }
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
    email: account.email ?? '',
    gems: calculateGemsXP(stats, account.coins)?.gems,
    xp: calculateGemsXP(stats, account.coins)?.xp,
    is_v1: true,
    profile_views: convertIfNumber(account.views),
    skins: getNewSkins(account.skins),
  }

  return newAccStruct;
}
function logText(text) {
  if(Date.now() - lastLog < 50) return;
  console.clear();
  if(!text) return console.log(permText.join('\n'));
  console.log(permText.join('\n') + '\n' + text??'');
  lastLog = Date.now();
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
    playtime: Math.round(convertIfNumber(oldStats.game_time)/1000),
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

(async () => {
  let accs;
  logText('Downloading database (0/2)');
  if(stopAt) {
  accs= await sql`SELECT * FROM accounts limit ${stopAt}`;
  } else {
    // accs = await sql`SELECT * FROM accounts`;
    accs = await sql`select * from accounts`;
    // check for duplicates
    let duplicateAccQuery = await sql`SELECT username, COUNT(*) FROM accounts GROUP BY username HAVING COUNT(*) > 1`;
    if(duplicateAccQuery.length > 0) {
      console.log(duplicateAccQuery);
      throw new Error('Duplicate accounts found');
    }
  }
  logText('Downloading database (1/2)');
  let accStats = {};
  // const accGames = {};
  // const allStats = await sql`SELECT * FROM stats`;
  const allStats = await sql`select * from stats`;
  let allStatsClone = [...allStats];
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
      // accStats[acc.username] = findAll(allStats, s => s.username === acc.username);
      // find all stats for this account and remove them from the array
  // can be optimized by not using promises and sorting but im lazy

      // let stats = findAll(allStatsClone, s => s.username === acc.username);
      // allStatsClone = allStatsClone.filter(s => !stats.includes(s));

      let stats = [];
      for(let i = 0; i < allStatsClone.length; i++) {
        if(allStatsClone[i].username === acc.username) {
          stats.push(allStatsClone[i]);
          allStatsClone.splice(i, 1);
          i--;
        }
      }

      accStats[acc.username] = stats;

      done++;
      logText(`Fetching accounts (${done}/${total}) ${allStatsClone.length} records left ETA: ${calculateEta(start, done, total)}`);
    } catch (error) {
      console.error('Error processing account:', acc.username, error);
    }
  };

  let promises = accs;
  promises = promises.map((acc, index) => processAccount(acc, index, promises.length));
  logText(`Fetching accounts..`)
  await Promise.all(promises);
}
  addTextToPerm(`Fetched accounts (${done}/${typeof promises !== 'undefined' ? promises.length : accs.length})`);
  // save in json file
  if(!useStatsCached){
  fs.writeFileSync('./accStats.json', JSON.stringify(accStats));
  }

  //check for differences
  if(accs.length > Object.keys(accStats).length) {
    // find the missing accounts
    for(const acc of accs) {
      if(!accStats.hasOwnProperty(acc.username)) {
        console.log(acc.username);
      }
    }
    // check for duplicate usernames in accs
    // let duplicates = accs.filter((acc, index) => accs.findIndex(a => a.username === acc.username) !== index);
    // console.log(duplicates);
    throw new Error('Not all accounts have stats, dbAccs-'+accs.length+', statsLen-'+Object.keys(accStats).length)
  }
  // migrate users
  // const waitMs = 1;
  // const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let migrated = 0;
  let migratedUsers = {};
  let migratedTotalStats = {};
  let migratedDailyStats = {};

  // Function to process each user
  async function processUser(acc) {
      let migratedUser = await migrateUser(acc.username, acc, accStats[acc.username], null);
      if (!migratedUser) {
          throw new Error('User failed mapping - ' + acc.username);
      }

      let migratedTotalStat = calculateTotals(accStats[acc.username]);
      if (!migratedTotalStat) {
          throw new Error('Failed to calculate totals for user - ' + acc.username);
      }

      let migratedStatsDaily = accStats[acc.username].map(s => mapStatsDaily(s, migratedUser.id));
      if (!migratedStatsDaily) {
          throw new Error('Failed to map stats daily for user - ' + acc.username);
      }

      return { username: acc.username, migratedUser, migratedTotalStat, migratedStatsDaily };
  }

  // Function to handle all migrations
  async function migrateAllUsers(accs) {
      const promises = accs.map(acc => processUser(acc).catch(error => {
          console.error(error.message);
          return null; // Return null in case of error to keep array alignment
      }));

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
          if (result) {
              const { username, migratedUser, migratedTotalStat, migratedStatsDaily } = result;
              migratedUsers[username] = migratedUser;
              migratedTotalStats[username] = migratedTotalStat;
              migratedDailyStats[username] = migratedStatsDaily;
              migrated++;

              logText(`Mapping users (${migrated}/${accs.length}) ETA: ${calculateEta(start, migrated, accs.length)} ${username}`);
          }
      });

      if (migrated !== Object.keys(migratedUsers).length) {
          throw new Error('Failed to map all users - possibly due to duplicate usernames or other issues');
      }

      addTextToPerm(`Mapped users (${migrated}/${accs.length})`);
  }

  await migrateAllUsers(accs);

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

  // Function to handle insertion of an account and its related data
  async function insertAccountData(acc) {
      let newAcc = await insertAccount(acc);
      if (!newAcc) {
          throw new Error('Failed to insert account - ' + acc.username + ' - data: ' + JSON.stringify(acc));
      }
      newAcc = newAcc[0];
      let newId = newAcc.id;

      // Insert total stats
      const totalStats = migratedTotalStats[acc.username];
      let totalinserted = await insertTotalStats(totalStats, newId);
      if (!totalinserted) {
          throw new Error('Failed to insert total stats - ' + acc.username);
      }

      // Handle gems transactions
      const userGems = calculateGemsXP(migratedDailyStats[acc.username], acc.coins)?.gems;
      let transaction = await createTransaction(newId, userGems, 'Veteran player reward');
      if (!transaction) {
          throw new Error('Failed to insert transaction - ' + acc.username);
      }

      // Insert daily stats
      const dailyStatsPromises = migratedDailyStats[acc.username].map(stat => insertDailyStats(stat, newId));
      await Promise.all(dailyStatsPromises);
  }

  // Function to handle all account insertions
  async function insertAllAccounts(migratedUsers) {
      const promises = Object.values(migratedUsers).map(acc => insertAccountData(acc).catch(error => {
          console.error(error.message);
          return null; // Return null in case of error to keep array alignment
      }));

      logText(`Inserting accounts..`);
      const results = await Promise.all(promises);

      addTextToPerm(`Inserted accounts (${Object.values(migratedUsers).length}/${Object.values(migratedUsers).length})`);
  }

  // Call the insertAllAccounts function with your migrated users
  await insertAllAccounts(migratedUsers);

  console.log('Done migrating! Built with <3 by Gautam');
})();
