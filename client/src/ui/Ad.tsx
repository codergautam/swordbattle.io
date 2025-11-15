import { useEffect, useState } from "react"
import { config } from "../config";
import { crazygamesSDK } from "../crazygames/sdk";

const AD_REFRESH_MS = 30000; // refresh ad every 30 seconds
const CRAZYGAMES_AD_REFRESH_MS = 60000; // CrazyGames requires minimum 60 seconds between refreshes
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

export default function Ad({ screenW, screenH, types, centerOnOverflow, horizThresh = 0.3}: { screenW: number, screenH: number, types: [number, number][]; centerOnOverflow?: number; horizThresh?: number }) {
  // just a div for now with optimal ad size, null if none are good
  const [type, setType] = useState(findAdType(screenW, screenH, types, horizThresh));

  useEffect(() => {
    setType(findAdType(screenW, screenH, types, horizThresh));
  }, [screenW, screenH, types, horizThresh]);

  useEffect(() => {
    const windowAny = window as any;
    const adProvider = windowAny.adProvider || 'adinplay';

    // CrazyGames banner ads
    if (adProvider === 'crazygames') {
      if (type === -1) return;

      const containerId = `swordbattle-io_${types[type][0]}x${types[type][1]}`;

      const displayCrazyGamesBanner = async () => {
        try {
          await crazygamesSDK.requestResponsiveBanner(containerId);
          console.log(`[CrazyGames] Banner requested: ${containerId}`);
        } catch (error) {
          console.error('[CrazyGames] Error requesting banner:', error);
        }
      };

      displayCrazyGamesBanner();

      // Refresh banner every 60 seconds
      const timerId = setInterval(() => {
        displayCrazyGamesBanner();
      }, CRAZYGAMES_AD_REFRESH_MS);

      return () => {
        clearInterval(timerId);
        crazygamesSDK.clearBanner(containerId);
      };
    }

    // other ad provider logic
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
  }, [type, types]);


  if(type === -1) return null;
  // if((window as any).adProvider === "gamemonetize") return null;

  return (
    <div style={{
      backgroundColor: debug ? "gray" : undefined,
      height: debug ? types[type][1] : undefined,
      width: debug ? types[type][0] : undefined,
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
