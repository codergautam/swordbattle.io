import { useEffect, useState } from "react"
import { config } from "../config";
import { crazygamesSDK } from "../crazygames/sdk";
import { trackAd } from "../analytics";
import { isAdBlockBait } from "../helpers";
import AdblockPromo from "./AdblockPromo";

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

export default function Ad({ screenW, screenH, types, centerOnOverflow, horizThresh = 0.3, placement, adblockPromo }: { screenW: number, screenH: number, types: [number, number][]; centerOnOverflow?: number; horizThresh?: number; placement?: string; adblockPromo?: boolean }) {
  const [type, setType] = useState(findAdType(screenW, screenH, types, horizThresh));
  const [adProvider, setAdProvider] = useState<string>((window as any).adProvider || 'adinplay');
  const [adblock] = useState(() => (adblockPromo ? isAdBlockBait() : false));
  const showMock = debug;
  const typesKey = types.map((t) => `${t[0]}x${t[1]}`).join('|');

  useEffect(() => {
    setType(findAdType(screenW, screenH, types, horizThresh));
  }, [screenW, screenH, types, horizThresh]);

  useEffect(() => {
    if (isAdsDisabled() || type === -1 || showMock || (adblockPromo && adblock)) return;
    const mountedAt = Date.now();
    return () => {
      trackAd('display_view', {
        ad_format: 'banner',
        ad_size: `${types[type][0]}x${types[type][1]}`,
        placement,
        visible_ms: Date.now() - mountedAt,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    const handler = (e: Event) => setAdProvider((e as CustomEvent).detail);
    window.addEventListener('adProviderChanged', handler);
    return () => window.removeEventListener('adProviderChanged', handler);
  }, []);

  useEffect(() => {
    if (isAdsDisabled()) return;
    if (adProvider === 'crazygames') return;
    if (adblockPromo && adblock) return;
    if (showMock) return;

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
      windowAny.aiptag.cmd.display.push(function() { windowAny.aipDisplayTag.display(`swordbattle-io_${types[type][0]}x${types[type][1]}`); });
      trackAd('display_impression', { ad_format: 'banner', ad_size: `${types[type][0]}x${types[type][1]}`, placement });
    } else {
    }
    }

    let timerId = setInterval(()=> {
      displayNewAd();
    }, AD_REFRESH_MS);
    displayNewAd();
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, adProvider, placement, typesKey]);

  if (isAdsDisabled()) return null;
  if(type === -1) return null;

  if (adblockPromo && adblock) {
    return <AdblockPromo w={types[type][0]} h={types[type][1]} centerOnOverflow={centerOnOverflow} />;
  }

  const w = types[type][0];
  const h = types[type][1];
  const centerTransform = centerOnOverflow && centerOnOverflow < w
    ? `translateX(calc(-1 * (${w}px - ${centerOnOverflow}px) / 2))`
    : undefined;

  if (showMock) {
    return (
      <div style={{
        width: w, height: h, boxSizing: 'border-box', transform: centerTransform,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        border: '2px dashed #7a7a7a', borderRadius: 6, color: '#cfcfcf', userSelect: 'none',
        background: '#242424',
        fontFamily: "'Saira', sans-serif", fontWeight: 700,
      }}>
        <span style={{ fontSize: Math.max(12, Math.min(24, Math.round(h * 0.16))), letterSpacing: 1 }}>test ad</span>
        <span style={{ fontSize: Math.max(10, Math.min(15, Math.round(h * 0.1))), opacity: 0.8 }}>
          {`${w}×${h}${placement ? ` (${placement})` : ''}`}
        </span>
      </div>
    );
  }

  return (
    <div style={{ transform: centerTransform }} id={`swordbattle-io_${w}x${h}`} />
  )
}
