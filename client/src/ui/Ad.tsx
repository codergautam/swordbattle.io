import { useEffect, useRef, useState } from 'react';
import { config } from '../config';
import { crazygamesSDK } from '../crazygames/sdk';
import { trackAd } from '../analytics';
import { getAdblockStatus } from '../crazygames/adblock';
import AdblockPromo from './AdblockPromo';
import AdsenseSlot from './AdsenseSlot';

type AdSize = [number, number];

interface AdProps {
  screenW: number;
  screenH: number;
  types: AdSize[];
  adinplayTypes?: AdSize[];
  centerOnOverflow?: number;
  horizThresh?: number;
  placement?: string;
  adblockPromo?: boolean;
  provider?: string;
}

const cycleTickMs = 1500;
const fillTimeoutMs = 15000;
const viewableDwellMs = 1000;
const debug = config.isDev;

const slotOwners = new Map<string, symbol>();
const slotWaiters = new Map<string, Array<() => void>>();

function findAdType(screenW: number, screenH: number, types: AdSize[], horizThresh: number): number {
  let preferred = -1;
  let fallback = -1;

  for (let i = 0; i < types.length; i++) {
    const [width, height] = types[i];
    if (width > screenW || height > screenH * horizThresh) continue;
    fallback = i;
    if (width <= screenW * 0.9) preferred = i;
  }

  return preferred === -1 ? fallback : preferred;
}

function isAdsDisabled(): boolean {
  return !!(window as any)._isCrazyGamesBasicLaunch || crazygamesSDK.shouldUseSDK();
}

function destroyAdSlot(slotId: string) {
  const tag = (window as any).aipDisplayTag;
  try { tag?.setAutoRefresh?.(slotId, false); } catch (e) {}
  try {
    if (tag?.destroySlot) tag.destroySlot(slotId);
    else if (tag?.destroy) tag.destroy(slotId);
    else tag?.clear?.(slotId);
  } catch (e) {}
}

function isRendered(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  return Number(style.opacity || 1) > 0.01;
}

function isSlotViewable(element: HTMLElement | null): boolean {
  if (!element || document.visibilityState !== 'visible' || (window as any).videoAdActive) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return false;
  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  if (visibleWidth * visibleHeight < 0.5 * rect.width * rect.height) return false;

  const overlays = document.querySelectorAll('.modal, .loading-screen, .loading-cover, .tutorial-overlay.show');
  for (let i = 0; i < overlays.length; i++) {
    const overlay = overlays[i];
    if (!overlay.contains(element) && isRendered(overlay)) return false;
  }

  return true;
}

export default function Ad({
  screenW,
  screenH,
  types,
  adinplayTypes,
  centerOnOverflow,
  horizThresh = 0.3,
  placement,
  adblockPromo,
  provider,
}: AdProps) {
  const [windowProvider, setWindowProvider] = useState<string>((window as any).adProvider || 'adsense');
  const [adblock, setAdblock] = useState(() => (adblockPromo ? getAdblockStatus() : false));
  const [ownedSlotId, setOwnedSlotId] = useState<string | null>(null);
  const tokenRef = useRef<symbol | null>(null);
  if (!tokenRef.current) tokenRef.current = Symbol('ad-slot-owner');

  const adProvider = provider || windowProvider;
  const activeTypes = adProvider === 'adinplay' && adinplayTypes?.length ? adinplayTypes : types;
  const type = findAdType(screenW, screenH, activeTypes, horizThresh);
  const blocked = !!(adblockPromo && adblock);
  const width = type === -1 ? 0 : activeTypes[type][0];
  const height = type === -1 ? 0 : activeTypes[type][1];
  const slotId = adProvider === 'adinplay' && type !== -1 ? `swordbattle-io_${width}x${height}` : null;
  const owner = !!slotId && ownedSlotId === slotId;

  useEffect(() => {
    if (!adblockPromo) return;
    const handleStatus = (event: Event) => setAdblock(!!(event as CustomEvent).detail);
    window.addEventListener('adblockStatusChanged', handleStatus);
    setAdblock(getAdblockStatus());
    return () => window.removeEventListener('adblockStatusChanged', handleStatus);
  }, [adblockPromo]);

  useEffect(() => {
    const handleProvider = (event: Event) => setWindowProvider((event as CustomEvent).detail);
    window.addEventListener('adProviderChanged', handleProvider);
    return () => window.removeEventListener('adProviderChanged', handleProvider);
  }, []);

  useEffect(() => {
    if (!slotId || blocked || debug || isAdsDisabled()) {
      setOwnedSlotId(null);
      return;
    }

    const token = tokenRef.current as symbol;
    let active = true;
    const claim = () => {
      if (!active) return;
      slotOwners.set(slotId, token);
      setOwnedSlotId(slotId);
    };

    if (!slotOwners.has(slotId)) {
      claim();
    } else {
      const waiters = slotWaiters.get(slotId) || [];
      waiters.push(claim);
      slotWaiters.set(slotId, waiters);
    }

    return () => {
      active = false;
      setOwnedSlotId((current) => current === slotId ? null : current);
      const waiters = slotWaiters.get(slotId) || [];
      const waiterIndex = waiters.indexOf(claim);
      if (waiterIndex >= 0) waiters.splice(waiterIndex, 1);

      if (slotOwners.get(slotId) === token) {
        slotOwners.delete(slotId);
        destroyAdSlot(slotId);
        const next = waiters.shift();
        if (next) next();
      }

      if (waiters.length) slotWaiters.set(slotId, waiters);
      else slotWaiters.delete(slotId);
    };
  }, [slotId, blocked]);

  useEffect(() => {
    if (!owner || !slotId || blocked || debug || isAdsDisabled()) return;

    const windowAny = window as any;
    const size = `${width}x${height}`;
    let cancelled = false;
    let requested = false;
    let initialSettled = false;
    let fillTimer: ReturnType<typeof setTimeout> | null = null;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let viewabilityObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let eventsTarget: EventTarget | null = null;
    let lastRefreshEnabled: boolean | null = null;
    let lastRenderAt = 0;
    let lastRenderEmpty: boolean | null = null;

    const stopViewability = () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      dwellTimer = null;
      viewabilityObserver?.disconnect();
      viewabilityObserver = null;
    };

    const startViewability = () => {
      stopViewability();
      const element = document.getElementById(slotId);
      if (!element) return;

      let viewed = false;
      let ratio = 0;
      const beginDwell = () => {
        if (viewed || dwellTimer || !isSlotViewable(element)) return;
        dwellTimer = setTimeout(() => {
          dwellTimer = null;
          if (cancelled || viewed || !isSlotViewable(element)) return;
          viewed = true;
          trackAd('display_viewable', {
            ad_format: 'banner',
            ad_size: size,
            placement,
            visible_ms: viewableDwellMs,
            viewability: ratio,
          });
        }, viewableDwellMs);
      };

      if (typeof IntersectionObserver === 'undefined') {
        ratio = 1;
        beginDwell();
        return;
      }

      viewabilityObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        ratio = entry.intersectionRatio;
        if (entry.isIntersecting && ratio >= 0.5 && isSlotViewable(element)) {
          beginDwell();
        } else if (dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      }, { threshold: [0, 0.5, 1] });
      viewabilityObserver.observe(element);
    };

    const syncAutoRefresh = () => {
      const tag = windowAny.aipDisplayTag;
      if (!tag?.setAutoRefresh) return;
      const enabled = isSlotViewable(document.getElementById(slotId));
      if (enabled === lastRefreshEnabled) return;
      try {
        tag.setAutoRefresh(slotId, enabled);
        lastRefreshEnabled = enabled;
      } catch (e) {}
    };

    const recordRender = (empty: boolean) => {
      const now = Date.now();
      if (lastRenderEmpty === empty && now - lastRenderAt < 100) return;
      lastRenderAt = now;
      lastRenderEmpty = empty;
      initialSettled = true;
      if (fillTimer) clearTimeout(fillTimer);
      fillTimer = null;
      mutationObserver?.disconnect();
      mutationObserver = null;
      lastRefreshEnabled = null;
      syncAutoRefresh();

      if (empty) {
        stopViewability();
        trackAd('display_no_fill', { ad_format: 'banner', ad_size: size, placement });
      } else {
        trackAd('display_filled', { ad_format: 'banner', ad_size: size, placement });
        startViewability();
      }
    };

    const handleRender = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || (detail.adType && detail.adType !== 'display')) return;
      if ((detail.slotId ?? detail.slotElementId) !== slotId) return;
      recordRender(detail.isEmpty === true);
    };

    const attachEvents = () => {
      const nextTarget = windowAny.aiptag?.events as EventTarget | undefined;
      if (!nextTarget?.addEventListener || nextTarget === eventsTarget) return;
      eventsTarget?.removeEventListener('slotRenderEnded', handleRender);
      eventsTarget = nextTarget;
      eventsTarget.addEventListener('slotRenderEnded', handleRender);
    };

    const request = () => {
      if (cancelled || requested) return;
      const element = document.getElementById(slotId);
      if (!isSlotViewable(element)) return;

      windowAny.loadAdinplay?.();
      const queue = windowAny.aiptag?.cmd?.display;
      if (!queue?.push) return;

      requested = true;
      attachEvents();
      trackAd('display_request', { ad_format: 'banner', ad_size: size, placement });

      if (element && typeof MutationObserver !== 'undefined') {
        mutationObserver = new MutationObserver(() => {
          if (initialSettled) return;
          const child = element.querySelector('iframe, ins') as HTMLElement | null;
          if (child && element.offsetHeight > 10 && child.offsetWidth > 1) recordRender(false);
        });
        mutationObserver.observe(element, { childList: true, subtree: true });
      }

      fillTimer = setTimeout(() => {
        if (!initialSettled) recordRender(true);
      }, fillTimeoutMs);

      queue.push(() => {
        if (cancelled || !document.getElementById(slotId)) return;
        try {
          windowAny.aipDisplayTag.display(slotId);
          lastRefreshEnabled = null;
          attachEvents();
          syncAutoRefresh();
        } catch (error) {
          console.warn('[ads] AdInPlay display failed', error);
          recordRender(true);
        }
      });
    };

    const update = () => {
      attachEvents();
      request();
      if (requested) syncAutoRefresh();
      if (!isSlotViewable(document.getElementById(slotId)) && dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    windowAny.loadAdinplay?.();
    window.addEventListener('aip_slotRenderEnded', handleRender);
    window.addEventListener('adinplayLoadStateChanged', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('visibilitychange', update);
    const timerId = window.setInterval(update, cycleTickMs);
    update();

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
      if (fillTimer) clearTimeout(fillTimer);
      stopViewability();
      mutationObserver?.disconnect();
      eventsTarget?.removeEventListener('slotRenderEnded', handleRender);
      window.removeEventListener('aip_slotRenderEnded', handleRender);
      window.removeEventListener('adinplayLoadStateChanged', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('visibilitychange', update);
      try { windowAny.aipDisplayTag?.setAutoRefresh?.(slotId, false); } catch (e) {}
    };
  }, [owner, slotId, width, height, placement, blocked]);

  if (isAdsDisabled()) return null;

  if (blocked) {
    const fallbackType = type === -1 ? 0 : type;
    return (
      <AdblockPromo
        w={Math.min(activeTypes[fallbackType][0], screenW)}
        h={activeTypes[fallbackType][1]}
        centerOnOverflow={centerOnOverflow}
      />
    );
  }

  if (type === -1) return null;

  const centerTransform = centerOnOverflow && centerOnOverflow < width
    ? `translateX(calc(-1 * (${width}px - ${centerOnOverflow}px) / 2))`
    : undefined;

  if (debug) {
    return (
      <div style={{
        width,
        height,
        boxSizing: 'border-box',
        transform: centerTransform,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #7a7a7a',
        borderRadius: 6,
        color: '#cfcfcf',
        userSelect: 'none',
        background: '#242424',
        fontFamily: "'Saira', sans-serif",
        fontWeight: 700,
      }}>
        <span style={{ fontSize: Math.max(12, Math.min(24, Math.round(height * 0.16))), letterSpacing: 1 }}>test ad</span>
        <span style={{ fontSize: Math.max(10, Math.min(15, Math.round(height * 0.1))), opacity: 0.8 }}>
          {`${width}x${height}${placement ? ` (${placement})` : ''}`}
        </span>
      </div>
    );
  }

  if (adProvider === 'adsense') {
    return <AdsenseSlot key={`${placement || 'default'}:${width}x${height}`} w={width} h={height} placement={placement} centerTransform={centerTransform} />;
  }

  if (adProvider !== 'adinplay' || !owner || !slotId) return null;

  return <div style={{ width, height, transform: centerTransform }} id={slotId} />;
}
