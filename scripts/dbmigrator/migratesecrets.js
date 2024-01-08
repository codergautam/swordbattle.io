// script to migrate legacy sb database to v2 database
// note: doesnt support games table since its so different basically pointless for a leaderboard
// u can prob add it pretty easily

import postgres from 'postgres'
import cosmetics from '../../cosmetics.json' assert { type: "json" };
import {config} from 'dotenv';
import fs from 'fs';
config();
console.log('Swordbattle.io secret* database migrator');
let lastLog = 0;

const ignoreNewDb = false;
const useStatsCached = false;
// set stopAt to integer to limit to N users migrated
let stopAt = false;

if(!process.env.OLD_DB) throw new Error('No old db url provided');
if(!process.env.NEW_DB && !ignoreNewDb) throw new Error('No new db url provided');
// connect to the old db
console.log('Connecting to old db...');
const sql = postgres(process.env.OLD_DB, {
  max: 3
});

const sql2 = !ignoreNewDb ? postgres(process.env.NEW_DB, {
  ssl: {
    rejectUnauthorized: false
  },
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

// get all the users in the old db
const users = await sql`SELECT * FROM accounts`;
console.log('Found', users.length, 'users in old db');

// get all the users in the new db
let newUsers = !ignoreNewDb ? await sql2`SELECT * FROM accounts where is_v1 = true` : [];
console.log('Found', newUsers.length, 'users in new db');

let success = 0;
let failed = 0;
let alreadyDone = 0;
let remaining = users.length;
let noUserfound = 0;

for(const oldUser of users) {
  // find new user with same username
  const newUserIndex = newUsers.findIndex(u => u.username === oldUser.username);
  const newUser = newUserIndex !== -1 ? newUsers[newUserIndex] : false;
  remaining--;
  console.clear();
  console.log('Migrating secrets...');
  console.log('Success:', success);
  console.log('Errored:', failed);
  console.log('No user found:', noUserfound);
  console.log('Already done:', alreadyDone);
  console.log('Remaining:', remaining);

  if(!newUser) {
    console.log('No new user found for', oldUser.username);
    noUserfound++;
    continue;
  }
  // update new user secret
  // console.log('Migrating', oldUser.username);
  if(newUser.secret === oldUser.secret) {
    alreadyDone++;
    continue;
  }
  newUser.secret = oldUser.secret;
  // save
  try {
  await sql2`UPDATE accounts SET secret = ${newUser.secret} WHERE id = ${newUser.id}`;
  success++;
  } catch (error) {
    failed++;
  }
  // remove from new users
  newUsers.splice(newUserIndex, 1);
}