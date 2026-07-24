import api from './api';
import { isAdBlockActive } from './helpers';

function uuid(): string {
  try {
    if ((crypto as any)?.randomUUID) return (crypto as any).randomUUID();
  } catch (_) {}
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function ls(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key: string, val: string) { try { localStorage.setItem(key, val); } catch {} }

function dayKey(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }

const experiments: Record<string, string[]> = {
  death_preroll: ['off', 'on'],
};

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function assignVariants(visitorId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, variants] of Object.entries(experiments)) {
    const bucket = hashStr(visitorId + ':' + name) % variants.length;
    out[name] = variants[bucket];
  }
  return out;
}

function detectDevice() {
  const ua = (navigator.userAgent || '');
  const bodyMobile = typeof document !== 'undefined' && document.body?.classList?.contains('sb-mobile');
  const isTablet = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isPhone = /Mobi|iPhone|iPod|Android.*Mobile/i.test(ua);
  const device_type = isTablet ? 'tablet' : isPhone ? 'mobile' : 'desktop';
  const browser = /Edg/i.test(ua) ? 'Edge' : /OPR|Opera/i.test(ua) ? 'Opera'
    : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox'
    : /Safari/i.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS'
    : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Linux/i.test(ua) ? 'Linux' : 'Other';
  return { device_type, is_mobile: device_type !== 'desktop' || !!bodyMobile, browser, os };
}

interface SessionState {
  session_id: string;
  visitor_id: string;
  account_id: number | null;
  username: string | null;
  client_started_at: number;
  clicked_play: boolean;
  time_to_first_play_ms: number | null;
  play_count: number;
  death_count: number;
  total_playtime_ms: number;
  max_run_playtime_ms: number;
  reached_1min: boolean;
  reached_5min: boolean;
  is_first_visit: boolean;
  is_returning: boolean;
  is_logged_in: boolean;
  is_embedded: boolean;
  is_mobile: boolean;
  device_type: string;
  screen_w: number;
  screen_h: number;
  browser: string;
  os: string;
  language: string;
  timezone: string;
  referrer: string;
  landing_query: string;
  ad_provider: string;
  adblock: boolean | null;
  ad_impressions: number;
  video_ads_watched: number;
  rewarded_ads_watched: number;
  ab_variants: Record<string, string>;
  app_version?: string;
}

let session: SessionState | null = null;
let currentRun: { run_id: string; started_at: number; run_index: number } | null = null;
let finalized = false;

function post(path: string, body: any) {
  try {
    fetch(`${api.endpoint}${path}`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch (_) {}
}

function sendSession() {
  if (!session) return;
  post('/analytics/session', session);
}

export function getVariant(experiment: string): string | undefined {
  return session?.ab_variants?.[experiment];
}

export function getAnalyticsContext() {
  if (!session) return null;
  return {
    session_id: session.session_id,
    visitor_id: session.visitor_id,
    account_id: session.account_id,
    is_mobile: session.is_mobile,
    ab_variants: session.ab_variants,
    ad_provider: session.ad_provider,
  };
}

export function initAnalytics() {
  if (session) return;
  try { if (/\/metrics\/?(\?|$)/.test((window.location.hash || '').replace('#', ''))) return; } catch (_) {}
  try {
    let visitorId = ls('sb:visitorId');
    const isFirstVisit = !visitorId;
    if (!visitorId) { visitorId = uuid(); lsSet('sb:visitorId', visitorId); }

    const now = Date.now();
    const firstSeen = ls('sb:firstSeen');
    if (!firstSeen) lsSet('sb:firstSeen', String(now));
    const isReturning = !!firstSeen && dayKey(parseInt(firstSeen, 10)) < dayKey(now);

    const dev = detectDevice();
    const w = window as any;

    session = {
      session_id: uuid(),
      visitor_id: visitorId,
      account_id: null,
      username: null,
      client_started_at: now,
      clicked_play: false,
      time_to_first_play_ms: null,
      play_count: 0,
      death_count: 0,
      total_playtime_ms: 0,
      max_run_playtime_ms: 0,
      reached_1min: false,
      reached_5min: false,
      is_first_visit: isFirstVisit,
      is_returning: isReturning,
      is_logged_in: false,
      is_embedded: (() => { try { return window.self !== window.top; } catch { return true; } })(),
      is_mobile: dev.is_mobile,
      device_type: dev.device_type,
      screen_w: window.innerWidth || 0,
      screen_h: window.innerHeight || 0,
      browser: dev.browser,
      os: dev.os,
      language: navigator.language || '',
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })(),
      referrer: (document.referrer || '').slice(0, 500),
      landing_query: (window.location.search || '').slice(0, 500),
      ad_provider: w.adProvider || 'adinplay',
      adblock: null,
      ad_impressions: 0,
      video_ads_watched: 0,
      rewarded_ads_watched: 0,
      ab_variants: assignVariants(visitorId),
      app_version: process.env.REACT_APP_VERSION,
    };

    sendSession();

    setTimeout(() => {
      try {
        const blocked = isAdBlockActive();
        if (session) session.adblock = blocked;
        trackAd(blocked ? 'adblock_detected' : 'adblock_absent', {});
        sendSession();
      } catch (_) {}
    }, 3500);

    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendSession(); });
    window.addEventListener('pagehide', () => finalizeSession('closed_tab'));
  } catch (_) { }
}

export function setAnalyticsAccount(accountId: number | null, username: string | null, isLoggedIn: boolean) {
  if (!session) return;
  session.account_id = accountId;
  session.username = username;
  session.is_logged_in = isLoggedIn;
  sendSession();
}

export function trackPlayClick() {
  if (!session) return;
  if (!session.clicked_play) {
    session.clicked_play = true;
    session.time_to_first_play_ms = Date.now() - session.client_started_at;
  }
  sendSession();
}

export function trackRunStart() {
  if (!session) return;
  session.play_count += 1;
  currentRun = { run_id: uuid(), started_at: Date.now(), run_index: session.play_count };
}

export function trackRunEnd(reason: string, opts: { coins?: number; kills?: number; killerName?: string; playtimeMs?: number; prerollShown?: boolean } = {}) {
  if (!session) return;
  if (!currentRun) return;
  const run = currentRun;
  const now = Date.now();
  const playtimeMs = Math.max(0, Math.round(opts.playtimeMs != null ? opts.playtimeMs : (now - run.started_at)));

  if (reason !== 'quit_mid_game') session.death_count += 1;
  session.total_playtime_ms += playtimeMs;
  session.max_run_playtime_ms = Math.max(session.max_run_playtime_ms, playtimeMs);
  if (playtimeMs >= 60000) session.reached_1min = true;
  if (playtimeMs >= 300000) session.reached_5min = true;

  post('/analytics/run', {
    run_id: run?.run_id || uuid(),
    session_id: session.session_id,
    visitor_id: session.visitor_id,
    account_id: session.account_id,
    started_at: run?.started_at,
    ended_at: now,
    playtime_ms: Math.max(0, Math.round(playtimeMs)),
    end_reason: reason,
    killer_name: opts.killerName ?? null,
    coins: opts.coins ?? 0,
    kills: opts.kills ?? 0,
    run_index: run?.run_index ?? session.play_count,
    is_first_run: (run?.run_index ?? session.play_count) === 1,
    is_logged_in: session.is_logged_in,
    is_mobile: session.is_mobile,
    device_type: session.device_type,
    preroll_variant: session.ab_variants.death_preroll,
    preroll_shown: !!opts.prerollShown,
    ab_variants: session.ab_variants,
  });

  currentRun = null;
  sendSession();
}

export function trackAd(eventType: string, opts: { ad_format?: string; ad_size?: string; placement?: string; visible_ms?: number; viewability?: number } = {}) {
  if (!session) return;
  if (eventType === 'display_impression') session.ad_impressions += 1;
  if (eventType === 'video_complete') session.video_ads_watched += 1;
  if (eventType === 'rewarded_complete') session.rewarded_ads_watched += 1;

  post('/analytics/ad', {
    session_id: session.session_id,
    visitor_id: session.visitor_id,
    account_id: session.account_id,
    event_type: eventType,
    ad_provider: session.ad_provider,
    ad_format: opts.ad_format ?? null,
    ad_size: opts.ad_size ?? null,
    placement: opts.placement ?? null,
    visible_ms: opts.visible_ms ?? null,
    viewability: opts.viewability ?? null,
    is_mobile: session.is_mobile,
    ab_variants: session.ab_variants,
  });
}

export function finalizeSession(reason: string) {
  if (!session || finalized) return;
  finalized = true;
  try {
    if (currentRun) trackRunEnd('quit_mid_game');
    const now = Date.now();
    post('/analytics/session', { ...session, ended_at: now, end_reason: reason, duration_ms: now - session.client_started_at });
  } catch (_) {}
}
