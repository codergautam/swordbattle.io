/*
 Players with adblock should be able to play the game normally
 Certain features can be disabled (but most likely wont)
*/

import { crazygamesSDK } from './sdk';

let hasAdblock = false;
let adblockChecked = false;

/* check if the user has an adblocker */
export async function detectAdblock(): Promise<boolean> {
  if (adblockChecked) {
    return hasAdblock;
  }

  try {
    hasAdblock = await crazygamesSDK.hasAdblock();
    adblockChecked = true;

    if (hasAdblock) {
      console.warn('[CrazyGames] Adblock detected');
    } else {
      console.log('[CrazyGames] No adblock detected');
    }

    return hasAdblock;
  } catch (error) {
    console.error('[CrazyGames] Error detecting adblock:', error);
    adblockChecked = true;
    hasAdblock = false;
    return false;
  }
}

export function getAdblockStatus(): boolean {
  return hasAdblock;
}

export function isAdblockChecked(): boolean {
  return adblockChecked;
}
