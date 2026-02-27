/**
 * Daily Reset Script — Run by Heroku Scheduler at 12:00 AM UTC
 *
 * 1. For accounts where checkedIn != 0: increment streak, update bestStreak
 * 2. For accounts where checkedIn == 0 AND streak > 0: reset streak to 0
 * 3. Reset ALL accounts' checkedIn to 0
 */

const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DB_URL
    || `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/postgres`;

  const useSSL = (process.env.USE_SSL || '').toLowerCase() === 'true';

  const client = new Client({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('[DailyReset] Connected to database');

    // Step 1: Increment streak for accounts that checked in today, update bestStreak
    const step1 = await client.query(`
      UPDATE accounts
      SET "dailyLogin" = jsonb_set(
        jsonb_set(
          "dailyLogin",
          '{streak}',
          to_jsonb(COALESCE(("dailyLogin"->>'streak')::int, 0) + 1)
        ),
        '{bestStreak}',
        to_jsonb(GREATEST(
          COALESCE(("dailyLogin"->>'bestStreak')::int, 0),
          COALESCE(("dailyLogin"->>'streak')::int, 0) + 1
        ))
      )
      WHERE COALESCE(("dailyLogin"->>'checkedIn')::int, 0) != 0
    `);
    console.log(`[DailyReset] Step 1: Incremented streak for ${step1.rowCount} accounts`);

    // Step 2: Reset streak for accounts that did NOT check in but had an active streak
    const step2 = await client.query(`
      UPDATE accounts
      SET "dailyLogin" = jsonb_set("dailyLogin", '{streak}', '0'::jsonb)
      WHERE COALESCE(("dailyLogin"->>'checkedIn')::int, 0) = 0
        AND COALESCE(("dailyLogin"->>'streak')::int, 0) > 0
    `);
    console.log(`[DailyReset] Step 2: Reset streak for ${step2.rowCount} accounts`);

    // Step 3: Reset all checkedIn to 0 and playtime to 0
    const step3 = await client.query(`
      UPDATE accounts
      SET "dailyLogin" = jsonb_set(
        jsonb_set("dailyLogin", '{checkedIn}', '0'::jsonb),
        '{playtime}',
        '0'::jsonb
      )
      WHERE COALESCE(("dailyLogin"->>'checkedIn')::int, 0) != 0
        OR COALESCE(("dailyLogin"->>'playtime')::int, 0) != 0
    `);
    console.log(`[DailyReset] Step 3: Reset checkedIn and playtime for ${step3.rowCount} accounts`);

    console.log('[DailyReset] Complete');
  } catch (error) {
    console.error('[DailyReset] Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
