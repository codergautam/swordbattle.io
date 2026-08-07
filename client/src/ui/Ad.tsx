import { useEffect, useRef, useState } from "react"
import { config } from "../config";
import { crazygamesSDK } from "../crazygames/sdk";
import { trackAd } from "../analytics";
import { getAdblockStatus } from "../crazygames/adblock";
import AdblockPromo from "./AdblockPromo";
import AdsenseSlot from "./AdsenseSlot";

const adRefreshMs = 30000;
const cycleTickMs = 2000;
const unconfirmedRetryMs = 10000;
const unconfirmedBackoffMs = 60000;
const maxUnconfirmedAttempts = 3;
const debug = config.isDev;

const deadSlotSizes = new Set<string>();

function findAdType(screenW: number, screenH: number, types: [number, number][], horizThresh: number, dead: Set<string> = deadSlotSizes): number {
  let type = -1;
  for (let i = 0; i < types.length; i++) {
    if (dead.has(`${types[i][0]}x${types[i][1]}`)) continue;
    if (type === -1) type = i;
    if (types[i][0] <= screenW*0.9 && types[i][1] <= screenH * horizThresh) {
      type = i;
    }
  }

  if (type === -1) return -1;
  if(types[type][0] > screenW || types[type][1] > screenH*horizThresh) return -1;

  return type;
}

function isAdsDisabled(): boolean {
  return !!(window as any)._isCrazyGamesBasicLaunch || crazygamesSDK.shouldUseSDK();
}

const slotOwners = new Map<string, symbol>();
const slotWaiters = new Map<string, Array<() => void>>();
const confirmedSlots = new Set<string>();

function destroyAdSlot(slotId: string) {
  const tag = (window as any).aipDisplayTag;
  confirmedSlots.delete(slotId);
  try {
    if (tag && tag.destroySlot) tag.destroySlot(slotId);
    else if (tag && tag.clear) tag.clear(slotId);
  } catch (e) {}
}

function isSlotViewable(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (document.visibilityState !== 'visible') return false;
  if ((window as any).videoAdActive) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 10 || r.height < 10) return false;
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  const ix = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  const iy = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  if (ix * iy < 0.5 * r.width * r.height) return false;
  const overlays = document.querySelectorAll('.modal, .loading-screen, .loading-cover');
  for (let i = 0; i < overlays.length; i++) {
    if (!overlays[i].contains(el)) return false;
  }
  return true;
}

export default function Ad({ screenW, screenH, types, centerOnOverflow, horizThresh = 0.3, placement, adblockPromo, provider }: { screenW: number, screenH: number, types: [number, number][]; centerOnOverflow?: number; horizThresh?: number; placement?: string; adblockPromo?: boolean; provider?: string }) {
  const [type, setType] = useState(findAdType(screenW, screenH, types, horizThresh));
  const [windowProvider, setWindowProvider] = useState<string>((window as any).adProvider || 'adsense');
  const adProvider = provider || windowProvider;
  const setAdProvider = setWindowProvider;
  const [adblock, setAdblock] = useState(() => (adblockPromo ? getAdblockStatus() : false));
  const [owner, setOwner] = useState(false);
  const tokenRef = useRef<symbol | null>(null);
  if (!tokenRef.current) tokenRef.current = Symbol('ad-slot-owner');
  const showMock = debug;
  const typesKey = types.map((t) => `${t[0]}x${t[1]}`).join('|');
  const blocked = !!(adblockPromo && adblock);

  useEffect(() => {
    const recompute = () => setType(findAdType(screenW, screenH, types, horizThresh));
    recompute();
    window.addEventListener('adSlotSizeDead', recompute);
    return () => window.removeEventListener('adSlotSizeDead', recompute);
  }, [screenW, screenH, types, horizThresh]);

  useEffect(() => {
    if (!adblockPromo) return;
    const h = (e: Event) => setAdblock(!!(e as CustomEvent).detail);
    window.addEventListener('adblockStatusChanged', h);
    setAdblock(getAdblockStatus());
    return () => window.removeEventListener('adblockStatusChanged', h);
  }, [adblockPromo]);

  useEffect(() => {
    if (isAdsDisabled() || type === -1 || showMock || blocked) return;
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
  }, [type, blocked]);

  useEffect(() => {
    const handler = (e: Event) => setAdProvider((e as CustomEvent).detail);
    window.addEventListener('adProviderChanged', handler);
    return () => window.removeEventListener('adProviderChanged', handler);
  }, []);

  useEffect(() => {
    if (isAdsDisabled()) return;
    if (adProvider !== 'adinplay') return;
    if (blocked) return;
    if (showMock) return;
    if (type === -1) return;

    const slotId = `swordbattle-io_${types[type][0]}x${types[type][1]}`;
    const token = tokenRef.current!;
    const claim = () => {
      slotOwners.set(slotId, token);
      setOwner(true);
    };
    if (!slotOwners.has(slotId)) {
      claim();
    } else {
      const waiters = slotWaiters.get(slotId) || [];
      waiters.push(claim);
      slotWaiters.set(slotId, waiters);
    }

    return () => {
      const waiters = slotWaiters.get(slotId) || [];
      const idx = waiters.indexOf(claim);
      if (idx >= 0) waiters.splice(idx, 1);
      if (slotOwners.get(slotId) === token) {
        slotOwners.delete(slotId);
        destroyAdSlot(slotId);
        setOwner(false);
        const next = waiters.shift();
        if (next) next();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, adProvider, typesKey, blocked]);

  useEffect(() => {
    if (!owner) return;
    if (isAdsDisabled()) return;
    if (adProvider !== 'adinplay') return;
    if (blocked) return;
    if (showMock) return;
    if (type === -1) return;

    const windowAny = window as any;
    const w = types[type][0];
    const h = types[type][1];
    const slotId = `swordbattle-io_${w}x${h}`;
    const size = `${w}x${h}`;

    let cycleCleanup: (() => void) | null = null;
    let lastAttemptAt = 0;
    let unconfirmedAttempts = 0;

    const runCycle = () => {
      if (cycleCleanup) { cycleCleanup(); cycleCleanup = null; }
      const canRefresh = confirmedSlots.has(slotId) && !!(windowAny.aipDisplayTag && windowAny.aipDisplayTag.refresh);
      if (!(windowAny.aiptag && windowAny.aiptag.cmd && windowAny.aiptag.cmd.display)) return;

      let settled = false;
      let noFillReported = false;
      let viewed = false;
      let dwell: any = null;
      let noFillTimer: any = null;
      let io: IntersectionObserver | null = null;
      let mo: MutationObserver | null = null;

      const startViewability = () => {
        try {
          const el = document.getElementById(slotId);
          if (!el || typeof IntersectionObserver === 'undefined') return;
          io = new IntersectionObserver((entries) => {
            const entry = entries[0];
            const on = entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible';
            if (on && !viewed && !dwell) {
              dwell = setTimeout(() => {
                viewed = true;
                trackAd('display_viewable', { ad_format: 'banner', ad_size: size, placement, visible_ms: 1000, viewability: entry.intersectionRatio });
              }, 1000);
            } else if (!on && dwell) { clearTimeout(dwell); dwell = null; }
          }, { threshold: [0, 0.5, 1] });
          io.observe(el);
        } catch (e) {}
      };

      const settle = (empty: boolean) => {
        if (settled) return;
        settled = true;
        if (noFillTimer) { clearTimeout(noFillTimer); noFillTimer = null; }
        if (mo) { mo.disconnect(); mo = null; }
        if (empty) {
          if (!noFillReported) { noFillReported = true; trackAd('display_no_fill', { ad_format: 'banner', ad_size: size, placement }); }
        } else {
          confirmedSlots.add(slotId);
          trackAd('display_filled', { ad_format: 'banner', ad_size: size, placement });
          startViewability();
        }
      };

      const onRenderEnded = (e: any) => {
        const det = e?.detail;
        if (!det) return;
        if (det.adType && det.adType !== 'display') return;
        if ((det.slotId ?? det.slotElementId) !== slotId) return;
        confirmedSlots.add(slotId);
        if (!settled) settle(det.isEmpty === true);
      };
      const onVis = () => { if (document.visibilityState === 'hidden' && dwell) { clearTimeout(dwell); dwell = null; } };

      const events = windowAny.aiptag.events;
      if (events && events.addEventListener) events.addEventListener('slotRenderEnded', onRenderEnded);
      window.addEventListener('aip_slotRenderEnded', onRenderEnded as any);
      document.addEventListener('visibilitychange', onVis);

      const el = document.getElementById(slotId);
      if (el && typeof MutationObserver !== 'undefined') {
        mo = new MutationObserver(() => {
          const inner = el.querySelector('iframe, ins') as HTMLElement | null;
          if (inner && el.offsetHeight > 10 && inner.offsetWidth > 1) settle(false);
        });
        mo.observe(el, { childList: true, subtree: true });
      }
      noFillTimer = setTimeout(() => {
        if (settled || noFillReported) return;
        noFillReported = true;
        trackAd('display_no_fill', { ad_format: 'banner', ad_size: size, placement });
      }, 8000);

      trackAd('display_request', { ad_format: 'banner', ad_size: size, placement });
      let refreshed = false;
      if (canRefresh) {
        try {
          windowAny.aipDisplayTag.refresh(slotId);
          refreshed = true;
        } catch (e) {}
      }
      if (!refreshed) {
        try {
          if (windowAny.aipDisplayTag && windowAny.aipDisplayTag.clear) windowAny.aipDisplayTag.clear(slotId);
        } catch (e) { console.warn('error clearing ad', e); }
        windowAny.aiptag.cmd.display.push(function () { windowAny.aipDisplayTag.display(slotId); });
      }

      cycleCleanup = () => {
        if (dwell) clearTimeout(dwell);
        if (noFillTimer) clearTimeout(noFillTimer);
        if (io) io.disconnect();
        if (mo) mo.disconnect();
        if (events && events.removeEventListener) events.removeEventListener('slotRenderEnded', onRenderEnded);
        window.removeEventListener('aip_slotRenderEnded', onRenderEnded as any);
        document.removeEventListener('visibilitychange', onVis);
      };
    };

    const tick = () => {
      const el = document.getElementById(slotId);
      if (!isSlotViewable(el as HTMLElement | null)) return;
      const confirmed = confirmedSlots.has(slotId);
      const since = Date.now() - lastAttemptAt;
      if (!confirmed && unconfirmedAttempts >= maxUnconfirmedAttempts && since >= unconfirmedRetryMs) {
        const excluded = new Set(deadSlotSizes);
        excluded.add(size);
        if (findAdType(screenW, screenH, types, horizThresh, excluded) !== -1) {
          deadSlotSizes.add(size);
          window.dispatchEvent(new Event('adSlotSizeDead'));
          return;
        }
      }
      const retryMs = unconfirmedAttempts >= maxUnconfirmedAttempts ? unconfirmedBackoffMs : unconfirmedRetryMs;
      const due = lastAttemptAt === 0
        || (!confirmed && since >= retryMs)
        || (confirmed && since >= adRefreshMs);
      if (!due) return;
      lastAttemptAt = Date.now();
      if (!confirmed) unconfirmedAttempts++;
      else unconfirmedAttempts = 0;
      runCycle();
    };

    const timerId = setInterval(tick, cycleTickMs);
    tick();
    return () => {
      clearInterval(timerId);
      if (cycleCleanup) cycleCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, type, adProvider, placement, typesKey, blocked]);

  if (isAdsDisabled()) return null;

  if (blocked) {
    const t = type === -1 ? 0 : type;
    return <AdblockPromo w={Math.min(types[t][0], screenW)} h={types[t][1]} centerOnOverflow={centerOnOverflow} />;
  }

  if(type === -1) return null;

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

  if (adProvider === 'adsense') {
    return <AdsenseSlot key={`${w}x${h}`} w={w} h={h} placement={placement} centerTransform={centerTransform} />;
  }

  if (adProvider !== 'adinplay') return null;
  if (!owner) return null;

  return (
    <div style={{ width: w, height: h, transform: centerTransform }} id={`swordbattle-io_${w}x${h}`} />
  )
}
