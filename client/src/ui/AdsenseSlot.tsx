import { useEffect, useRef, useState } from 'react';
import { adsenseClient, getAdSlot } from '../adConfig';
import { trackAd } from '../analytics';

const minRequestGapMs = 30000;
const fillTimeoutMs = 8000;
const viewableDwellMs = 1000;

const lastRequestAt = new Map<string, number>();
const warnedPlacements = new Set<string>();

function warnMissingSlot(placement?: string) {
  const key = placement || 'default';
  if (warnedPlacements.has(key)) return;
  warnedPlacements.add(key);
  console.error(`[ads] no AdSense data-ad-slot configured for placement "${key}" — add it to client/src/adConfig.ts (Ads > By ad unit > Display ads in the AdSense dashboard). No ad will render here.`);
  trackAd('display_misconfigured', { ad_format: 'banner', placement });
}

function isViewable(el: HTMLElement | null): boolean {
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

export default function AdsenseSlot({ w, h, placement, centerTransform }: { w: number; h: number; placement?: string; centerTransform?: string }) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const [size, setSize] = useState(`${w}x${h}`);

  useEffect(() => { setSize(`${w}x${h}`); }, [w, h]);

  useEffect(() => {
    const slot = getAdSlot(placement);
    if (!slot) { warnMissingSlot(placement); return; }

    const key = placement || 'default';
    let timers: any[] = [];
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;
    let cancelled = false;
    let settled = false;

    const startViewability = () => {
      const el = insRef.current;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      let viewed = false;
      let dwell: any = null;
      io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        const on = entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible';
        if (on && !viewed && !dwell) {
          dwell = setTimeout(() => {
            viewed = true;
            trackAd('display_viewable', { ad_format: 'banner', ad_size: size, placement, visible_ms: viewableDwellMs, viewability: entry.intersectionRatio });
          }, viewableDwellMs);
          timers.push(dwell);
        } else if (!on && dwell) { clearTimeout(dwell); dwell = null; }
      }, { threshold: [0, 0.5, 1] });
      io.observe(el);
    };

    const settle = (filled: boolean) => {
      if (settled || cancelled) return;
      settled = true;
      if (mo) { mo.disconnect(); mo = null; }
      if (filled) {
        trackAd('display_filled', { ad_format: 'banner', ad_size: size, placement });
        startViewability();
      } else {
        trackAd('display_no_fill', { ad_format: 'banner', ad_size: size, placement });
      }
    };

    const push = (): boolean => {
      const el = insRef.current;
      if (cancelled || pushedRef.current) return true;
      if (!el || !isViewable(el)) return false;
      if (el.getAttribute('data-adsbygoogle-status')) return true;

      pushedRef.current = true;
      lastRequestAt.set(key, Date.now());

      if (typeof MutationObserver !== 'undefined') {
        mo = new MutationObserver(() => {
          const status = el.getAttribute('data-ad-status');
          if (status === 'filled') settle(true);
          else if (status === 'unfilled' || status === 'unfill-optimized') settle(false);
        });
        mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
      }
      timers.push(setTimeout(() => settle(el.getAttribute('data-ad-status') === 'filled'), fillTimeoutMs));

      trackAd('display_request', { ad_format: 'banner', ad_size: size, placement });
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.warn('[ads] adsbygoogle push failed', e);
      }
      return true;
    };

    const since = Date.now() - (lastRequestAt.get(key) || 0);
    const initialDelay = since >= minRequestGapMs ? 0 : minRequestGapMs - since;
    const attempt = () => {
      if (cancelled || pushedRef.current) return;
      if (!push()) timers.push(setTimeout(attempt, 1000));
    };
    timers.push(setTimeout(attempt, initialDelay));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (io) io.disconnect();
      if (mo) mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, size]);

  if (!getAdSlot(placement)) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', width: w, height: h, flexShrink: 0, transform: centerTransform }}
      data-ad-client={adsenseClient}
      data-ad-slot={getAdSlot(placement)}
    />
  );
}
