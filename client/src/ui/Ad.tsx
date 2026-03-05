import { useEffect, useState } from "react"
import { config } from "../config";
import { crazygamesSDK } from "../crazygames/sdk";

const AD_REFRESH_MS = 30000; // refresh ad every 30 seconds
const debug = config.isDev;

function findAdType(screenW: number, screenH: number, types: [number, number][], horizThresh: number): number {
  let type = 0;
  for (let i = 0; i < types.length; i++) {
    if (types[i][0] <= screenW*0.9 && types[i][1] <= screenH * horizThresh) {
      type = i;
    }
  }

  if(types[type][0] > screenW || types[type][1] > screenH*horizThresh) return -1;

  return type;
}

function isAdsDisabled(): boolean {
  return !!(window as any)._isCrazyGamesBasicLaunch || crazygamesSDK.shouldUseSDK();
}

export default function Ad({ screenW, screenH, types, centerOnOverflow, horizThresh = 0.3}: { screenW: number, screenH: number, types: [number, number][]; centerOnOverflow?: number; horizThresh?: number }) {
  const [type, setType] = useState(findAdType(screenW, screenH, types, horizThresh));
  const [adProvider, setAdProvider] = useState<string>((window as any).adProvider || 'adinplay');

  useEffect(() => {
    setType(findAdType(screenW, screenH, types, horizThresh));
  }, [screenW, screenH, types, horizThresh]);

  useEffect(() => {
    const handler = (e: Event) => setAdProvider((e as CustomEvent).detail);
    window.addEventListener('adProviderChanged', handler);
    return () => window.removeEventListener('adProviderChanged', handler);
  }, []);

  useEffect(() => {
    if (isAdsDisabled()) return;
    if (adProvider === 'crazygames') return;

    const windowAny = window as any;
    const displayNewAd = () => {
    try {
    if(windowAny.aipDisplayTag && windowAny.aipDisplayTag.clear) {
      for(const type of types) {
        windowAny.aipDisplayTag.clear(`swordbattle-io_${type[0]}x${type[1]}`);
      }
    }
  } catch(e) {
    alert("error clearing ad");
  }
  if(type === -1) return;
    if(windowAny.aiptag && windowAny.aiptag.cmd && windowAny.aiptag.cmd.display) {
      console.log(`requesting swordbattle-io_${types[type][0]}x${types[type][1]}`);
      if(debug) return;
      windowAny.aiptag.cmd.display.push(function() { windowAny.aipDisplayTag.display(`swordbattle-io_${types[type][0]}x${types[type][1]}`); });
    } else {
    }
    }

    let timerId = setInterval(()=> {
      displayNewAd();
    }, AD_REFRESH_MS);
    displayNewAd();
    return () => clearInterval(timerId);
  }, [type, types, adProvider]);

  if (isAdsDisabled()) return null;
  if(type === -1) return null;

  return (
    <div style={{
      backgroundColor: debug ? "gray" : undefined,
      transform: centerOnOverflow && centerOnOverflow < types[type][0] ? `translateX(calc(-1 * (${types[type][0]}px - ${centerOnOverflow}px) / 2))` : undefined,
    }} id={`swordbattle-io_${types[type][0]}x${types[type][1]}`}>
      { debug && (
        <>
      <h1>Ad</h1>
      <p>Ad size: {types[type][0]} x {types[type][1]}</p>
      </>
      )}
    </div>
  )
}
