/*
 Players with adblock should be able to play the game normally
 Certain features can be disabled (but most likely wont)
*/

let hasAdblock = false;
let adblockChecked = false;

export function isAdScriptBlocked(providerOverride?: string): boolean {
  const w = window as any;
  if (w._isCrazyGamesBasicLaunch) return false;
  const provider = providerOverride || w.adProvider || 'adsense';
  if (provider === 'adsense') {
    if (w.adsenseFailed === true) return true;
    const startedAt = w.adsenseStartedAt || 0;
    if (!startedAt || Date.now() - startedAt < 5000) return false;
    return w.adsbygoogle?.loaded !== true;
  }
  if (provider !== 'adinplay') return false;
  if (w.adinplayFailed === true) return true;
  if (w.adinplayLoading === true) return false;
  const startedAt = w.adinplayStartedAt || 0;
  if (!startedAt || Date.now() - startedAt < 5000) return false;
  return typeof w.aipDisplayTag === 'undefined' && typeof w.aipPlayer === 'undefined';
}

function baitBlocked(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any)._isCrazyGamesBasicLaunch) return resolve(false);
    let bait: HTMLDivElement;
    try {
      bait = document.createElement('div');
      bait.className = 'adsbox ad-banner ads ad pub_300x250 text-ad textAd';
      bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;height:2px;width:2px;';
      document.body.appendChild(bait);
    } catch (e) { return resolve(false); }
    setTimeout(() => {
      let blocked = false;
      try {
        blocked = bait.offsetParent === null || bait.offsetHeight === 0
          || window.getComputedStyle(bait).display === 'none';
      } catch (e) {}
      try { bait.remove(); } catch (e) {}
      resolve(blocked);
    }, 300);
  });
}

async function runCheck() {
  const blocked = (await baitBlocked()) || isAdScriptBlocked();
  adblockChecked = true;
  if (blocked === hasAdblock) return;
  hasAdblock = blocked;
  window.dispatchEvent(new CustomEvent('adblockStatusChanged', { detail: blocked }));
}

export async function detectAdblock(): Promise<boolean> {
  await runCheck();
  for (const delay of [3500, 6000, 8000, 15000]) setTimeout(runCheck, delay);
  return hasAdblock;
}

export function getAdblockStatus(): boolean {
  return hasAdblock;
}

export function isAdblockChecked(): boolean {
  return adblockChecked;
}
