export type SDKEnvironment = 'disabled' | 'crazygames' | 'local';

export type AdType = 'midgame' | 'rewarded';

export interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: AdError) => void;
}

export interface AdError {
  code: 'unfilled' | 'adblock' | 'other';
  message: string;
}

export interface BannerOptions {
  id: string;
  width: number;
  height: number;
}

export interface User {
  username: string;
  profilePictureUrl: string;
  userId: string;
}

export interface SystemInfo {
  countryCode: string;
  device: {
    type: 'desktop' | 'tablet' | 'mobile';
  };
  os: {
    name: string;
    version: string;
  };
  browser: {
    name: string;
    version: string;
  };
}

export interface GameSettings {
  disableChat: boolean;
}

export interface InviteLink {
  inviteUrl: string;
}

export interface InviteParams {
  [key: string]: string | number;
}

/* How long the player may sit on the death/respawn screen before we treat the
   session as abandoned. The death screen counts as gameplay (it's part of the
   .io loop), but an unattended tab must not accrue playtime forever. */
const IDLE_ABANDON_MS = 180_000;

/* Ceiling on how long an ad may hold the gameplay lock before we assume the ad
   flow died and release it ourselves. Longer than any real ad, short enough that
   a single stalled ad doesn't cost the whole session's playtime. */
const AD_WATCHDOG_MS = 90_000;

/* Minimum gap between idle-timer rebuilds. See noteActivity(). */
const ACTIVITY_THROTTLE_MS = 5_000;

class CrazyGamesSDK {
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /* --- gameplay session state ------------------------------------------------
     Two separate ideas, deliberately:
       sessionActive - the player is logically in a run, INCLUDING the death /
                       respawn screen. Only cleared by going home, disconnecting,
                       or idling out.
       suspendedBy   - reasons gameplay is temporarily paused (ad playing, tab
                       hidden). CrazyGames requires gameplayStop() around ads.
     The SDK is only in "gameplay" when the session is active and nothing has
     suspended it. sync() makes the SDK match, and is idempotent so we never
     double-fire start/stop. */
  private sessionActive = false;
  private gameplaySdkActive = false;
  private loadingActive = false;
  private suspendedBy = new Set<string>();
  private idleTimer: any = null;
  private idleWatching = false;
  private _boundIdleActivity = () => this.noteActivity();
  private _boundVisibility = () => {
    if (document.hidden) this.suspendGameplay('hidden');
    else this.resumeGameplay('hidden');
  };

  private state(): string {
    const s = this.suspendedBy.size ? ` suspendedBy=[${Array.from(this.suspendedBy).join(',')}]` : '';
    return `session=${this.sessionActive} sdk=${this.gameplaySdkActive}${s}`;
  }

  /* Every gameplay transition logs, including when the SDK is inert (localhost,
     non-CrazyGames), so the state machine can be verified off-platform. Opt-in in
     production: this fires on every ad, death and tab switch, and callSite()
     below builds a stack trace for each one. */
  private cgDebug: boolean = (() => {
    try {
      return process.env.NODE_ENV === 'development'
        || window.location.search.includes('cgdebug');
    } catch (e) { return false; }
  })();

  private cgLog(msg: string, ...rest: any[]): void {
    if (!this.cgDebug) return;
    console.log(`[cg-gameplay] ${performance.now().toFixed(0).padStart(6)}ms  ${msg}`, ...rest);
  }

  private callSite(): string {
    if (!this.cgDebug) return '';
    try {
      const lines = (new Error().stack || '').split('\n');
      return (lines[3] || lines[2] || '').trim().replace(/^at\s+/, '');
    } catch (e) { return '?'; }
  }

  private syncGameplay(): void {
    const desired = this.sessionActive && this.suspendedBy.size === 0;
    if (desired === this.gameplaySdkActive) {
      this.cgLog(`no-op (already ${desired ? 'STARTED' : 'STOPPED'})  ${this.state()}`);
      return;
    }
    this.gameplaySdkActive = desired;

    const live = this.shouldUseSDK() && this.initialized;
    const call = desired ? 'gameplayStart()' : 'gameplayStop()';
    const why = desired
      ? ''
      : (this.suspendedBy.size ? ` reason=suspended(${Array.from(this.suspendedBy).join(',')})` : ' reason=session-ended');
    this.cgLog(
      `>>> SDK.game.${call} ${live ? 'SENT' : 'SKIPPED (SDK inactive: ' + (this.shouldUseSDK() ? 'not initialized' : 'not on CrazyGames') + ')'}` +
      `${why}  ${this.state()}  <- ${this.callSite()}`
    );

    if (!live) return;
    try {
      if (desired) window.CrazyGames.SDK.game.gameplayStart();
      else window.CrazyGames.SDK.game.gameplayStop();
    } catch (error) {
      console.error('[cg-gameplay] error signaling gameplay state:', error);
    }
  }

  /* Temporarily pause gameplay without ending the session (ads, hidden tab). */
  suspendGameplay(reason: string): void {
    this.cgLog(`suspendGameplay('${reason}')  <- ${this.callSite()}`);
    this.suspendedBy.add(reason);
    this.syncGameplay();
  }

  resumeGameplay(reason: string): void {
    this.cgLog(`resumeGameplay('${reason}')  <- ${this.callSite()}`);
    if (!this.suspendedBy.delete(reason)) {
      this.cgLog(`  ...'${reason}' was not suspended, nothing to resume`);
      return;
    }
    this.syncGameplay();
  }

  /* --- idle watch: only armed while sitting on the death screen ------------- */
  private lastActivity = 0;

  /* pointermove alone fires 60-120x/sec, and re-arming the timer on each one is
     pure churn. Rebuilding it at most once every ACTIVITY_THROTTLE_MS is just as
     accurate: the timeout is three minutes, so a few seconds of slack is noise. */
  private noteActivity(): void {
    if (!this.idleWatching) return;
    const now = performance.now();
    if (this.idleTimer && now - this.lastActivity < ACTIVITY_THROTTLE_MS) return;
    this.lastActivity = now;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.cgLog(`IDLE TIMEOUT after ${IDLE_ABANDON_MS}ms on results screen - ending session`);
      this.gameplayStop();
    }, IDLE_ABANDON_MS);
  }

  startIdleWatch(): void {
    if (this.idleWatching) return;
    this.idleWatching = true;
    for (const e of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) {
      window.addEventListener(e, this._boundIdleActivity, { passive: true });
    }
    this.noteActivity();
  }

  stopIdleWatch(): void {
    if (!this.idleWatching) return;
    this.idleWatching = false;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
    for (const e of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) {
      window.removeEventListener(e, this._boundIdleActivity);
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized) {
      return Promise.resolve();
    }

    // Check if SDK is available
    if (!this.isAvailable()) {
      console.warn('CrazyGames SDK not available');
      return Promise.resolve();
    }

    // Initialize SDK
    this.initPromise = window.CrazyGames.SDK.init()
      .then(() => {
        this.initialized = true;
        console.log('CrazyGames SDK initialized successfully');
        console.log('Environment:', this.getEnvironment());
        // A backgrounded tab is not gameplay. Without this, an abandoned tab
        // would keep accruing playtime.
        document.addEventListener('visibilitychange', this._boundVisibility);
      })
      .catch((error) => {
        console.error('CrazyGames SDK initialization failed:', error);
        throw error;
      });

    return this.initPromise;
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           !!window.CrazyGames &&
           !!window.CrazyGames.SDK;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getEnvironment(): SDKEnvironment {
    if (!this.isAvailable()) return 'disabled';
    return window.CrazyGames.SDK.environment;
  }

  shouldUseSDK(): boolean {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return false; // change to false for no sdk on localhos
    }

    const env = this.getEnvironment();
    return env === 'crazygames' || env === 'local';
  }

  /* True whenever the game is running on CrazyGames, including the basic
     launch where the SDK never reports an environment. */
  isCrazyGamesContext(): boolean {
    if (typeof window !== 'undefined' && (window as any)._isCrazyGamesBasicLaunch) return true;
    return this.shouldUseSDK();
  }

  /* Request a video ad */
  async requestAd(type: AdType, callbacks?: AdCallbacks): Promise<void> {
    // No ads during basic launch
    if ((window as any)._isCrazyGamesBasicLaunch) {
      callbacks?.adFinished?.();
      return;
    }
    if (!this.shouldUseSDK()) {
      console.warn('CrazyGames SDK not available - skipping ad request');
      callbacks?.adError?.({ code: 'other', message: 'SDK not available' });
      return;
    }

    if (!this.initialized) {
      console.warn('CrazyGames SDK not initialized - skipping ad request');
      callbacks?.adError?.({ code: 'other', message: 'SDK not initialized' });
      return;
    }

    // CrazyGames requires gameplayStop() before an ad and gameplayStart() after.
    // Enforced here rather than at each call site so it cannot be forgotten.
    this.suspendGameplay('ad');
    let released = false;
    let watchdog: any = null;
    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(watchdog);
      this.resumeGameplay('ad');
    };
    // Last resort. gameplayStart() deliberately preserves the 'ad' lock across a
    // new run, so an ad whose promise never settles and whose callbacks never
    // fire (adblock, a stalled ad network) would suspend gameplay for the rest of
    // the session and CrazyGames would record no playtime at all.
    watchdog = setTimeout(() => {
      console.warn(`[cg-gameplay] ${type} ad never reported completion after ${AD_WATCHDOG_MS}ms - releasing gameplay lock`);
      release();
    }, AD_WATCHDOG_MS);

    try {
      await window.CrazyGames.SDK.ad.requestAd(type, {
        adStarted: () => {
          console.log(`[CrazyGames] ${type} ad started`);
          callbacks?.adStarted?.();
        },
        adFinished: () => {
          console.log(`[CrazyGames] ${type} ad finished`);
          release();
          callbacks?.adFinished?.();
        },
        adError: (error) => {
          console.log(`[CrazyGames] ${type} ad error:`, error);
          release();
          callbacks?.adError?.(error);
        }
      });
      // The promise settles when the ad flow is over; release() is idempotent,
      // so this only matters if neither callback fired.
      release();
    } catch (error) {
      console.error('Error requesting ad:', error);
      release();
      callbacks?.adError?.({ code: 'other', message: String(error) });
    }
  }

  /* Check if user has adblock enabled */
  async hasAdblock(): Promise<boolean> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return false;
    }

    try {
      return await window.CrazyGames.SDK.ad.hasAdblock();
    } catch (error) {
      console.error('Error checking adblock:', error);
      return false;
    }
  }

  /* Request a static banner ad */
  async requestBanner(options: BannerOptions): Promise<void> {
    // No ads during basic launch
    if ((window as any)._isCrazyGamesBasicLaunch) return;
    if (!this.shouldUseSDK() || !this.initialized) {
      console.warn('CrazyGames SDK not available - skipping banner request');
      return;
    }

    try {
      await window.CrazyGames.SDK.banner.requestBanner(options);
      console.log(`[CrazyGames] Banner requested: ${options.width}x${options.height}`);
    } catch (error) {
      console.error('Error requesting banner:', error);
      throw error;
    }
  }

  /* Request a responsive banner ad */
  async requestResponsiveBanner(containerId: string): Promise<void> {
    // No ads during basic launch
    if ((window as any)._isCrazyGamesBasicLaunch) return;
    if (!this.shouldUseSDK() || !this.initialized) {
      console.warn('CrazyGames SDK not available - skipping responsive banner request');
      return;
    }

    try {
      await window.CrazyGames.SDK.banner.requestResponsiveBanner(containerId);
      console.log(`[CrazyGames] Responsive banner requested for container: ${containerId}`);
    } catch (error) {
      console.error('Error requesting responsive banner:', error);
      throw error;
    }
  }

  clearBanner(containerId: string): void {
    if ((window as any)._isCrazyGamesBasicLaunch) return;
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.banner.clearBanner(containerId);
      console.log(`[CrazyGames] Banner cleared: ${containerId}`);
    } catch (error) {
      console.error('Error clearing banner:', error);
    }
  }

  clearAllBanners(): void {
    if ((window as any)._isCrazyGamesBasicLaunch) return;
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.banner.clearAllBanners();
      console.log('[CrazyGames] All banners cleared');
    } catch (error) {
      console.error('Error clearing all banners:', error);
    }
  }

  /* Begin (or resume) a gameplay session. Safe to call repeatedly. */
  gameplayStart(): void {
    this.cgLog(`gameplayStart() requested  ${this.state()}  <- ${this.callSite()}`);
    this.stopIdleWatch();
    this.sessionActive = true;
    // A fresh run clears stale suspensions, but never the ad lock - an ad that
    // is still on screen must keep gameplay stopped until it reports finished.
    for (const r of Array.from(this.suspendedBy)) if (r !== 'ad') this.suspendedBy.delete(r);
    if (document.hidden) {
      this.suspendedBy.add('hidden');
      this.cgLog('  ...tab is hidden, holding gameplay suspended');
    }
    this.syncGameplay();
  }

  /* End the gameplay session entirely (home, disconnect, idle-out). */
  gameplayStop(): void {
    this.cgLog(`gameplayStop() requested  ${this.state()}  <- ${this.callSite()}`);
    this.stopIdleWatch();
    this.sessionActive = false;
    this.suspendedBy.clear();
    this.syncGameplay();
  }

  /* The player died and is on the results screen. That still counts as
     gameplay for an .io game, so the session stays open - we just start
     watching for abandonment. */
  gameplayEnterResults(): void {
    if (!this.sessionActive) {
      this.cgLog('gameplayEnterResults() but no active session - ignoring');
      return;
    }
    this.cgLog(`gameplayEnterResults() - session STAYS OPEN (death screen counts as playtime), idle watch armed for ${IDLE_ABANDON_MS}ms`);
    this.startIdleWatch();
  }

  isGameplayActive(): boolean { return this.gameplaySdkActive; }

  /* Signal that loading has started. Paired with loadingStop() via a flag so
     loadingStop() can be called from several places - a scene that never boots
     must still close the loading window. */
  loadingStart(): void {
    if (this.loadingActive) return;
    this.loadingActive = true;
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.loadingStart();
      console.log('[CrazyGames] Loading started');
    } catch (error) {
      console.error('Error signaling loading start:', error);
    }
  }

  /* Signal that loading has finished. Safe to call more than once. */
  loadingStop(): void {
    if (!this.loadingActive) return;
    this.loadingActive = false;
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.loadingStop();
      console.log('[CrazyGames] Loading stopped');
    } catch (error) {
      console.error('Error signaling loading stop:', error);
    }
  }

  /* Display an invite button */
  showInviteButton(params: { roomId?: string }): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.showInviteButton(params);
      console.log('[CrazyGames] Invite button shown');
    } catch (error) {
      console.error('Error showing invite button:', error);
    }
  }

  /* Hide the invite button */
  hideInviteButton(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.hideInviteButton();
      console.log('[CrazyGames] Invite button hidden');
    } catch (error) {
      console.error('Error hiding invite button:', error);
    }
  }

  /* Set the invite mode to enable/disable invite functionality */
  setInviteMode(mode: 'playing' | 'disabled', params?: { roomId?: string }): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      if (mode === 'playing') {
        this.showInviteButton(params || {});
      } else {
        this.hideInviteButton();
      }
      console.log('[CrazyGames] Invite mode set to:', mode);
    } catch (error) {
      console.error('Error setting invite mode:', error);
    }
  }

  /* Get an invite link for multiplayer */
  async getInviteLink(params: InviteParams): Promise<InviteLink | null> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      const link = await window.CrazyGames.SDK.game.inviteLink(params);
      console.log('[CrazyGames] Invite link generated:', link);
      return link;
    } catch (error) {
      console.error('Error getting invite link:', error);
      return null;
    }
  }

  /* Get game settings (like disableChat) */
  getSettings(): GameSettings {
    if (!this.shouldUseSDK() || !this.initialized) {
      return { disableChat: false };
    }

    try {
      return window.CrazyGames.SDK.game.settings;
    } catch (error) {
      console.error('Error getting game settings:', error);
      return { disableChat: false };
    }
  }

  isInstantMultiplayer(): boolean {
    if (!this.shouldUseSDK() || !this.initialized) {
      return false;
    }

    try {
      return window.CrazyGames.SDK.game.isInstantMultiplayer || false;
    } catch (error) {
      console.error('Error checking instant multiplayer:', error);
      return false;
    }
  }

  getInviteParam(paramName: string): string | null {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      return window.CrazyGames.SDK.game.getInviteParam(paramName);
    } catch (error) {
      console.error('Error getting invite param:', error);
      return null;
    }
  }

  /* Trigger happy time celebration (confetti, etc.) */
  happytime(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.happytime();
      console.log('[CrazyGames] Happy time triggered!');
    } catch (error) {
      console.error('Error triggering happy time:', error);
    }
  }

  /* Check if user account is available */
  isUserAccountAvailable(): boolean {
    if (!this.shouldUseSDK() || !this.initialized) return false;
    return window.CrazyGames.SDK.user.isUserAccountAvailable;
  }

  /* Get the current logged-in user */
  async getUser(): Promise<User | null> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      const user = await window.CrazyGames.SDK.user.getUser();
      console.log('[CrazyGames] User retrieved:', user);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /* Show the CrazyGames account dialog */
  async showAuthPrompt(): Promise<User | null> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      const user = await window.CrazyGames.SDK.user.showAuthPrompt();
      console.log('[CrazyGames] User authenticated:', user);
      return user;
    } catch (error) {
      console.error('Error showing auth prompt:', error);
      return null;
    }
  }

  async getUserToken(): Promise<string | null> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      const token = await window.CrazyGames.SDK.user.getUserToken();
      console.log('[CrazyGames] User token retrieved');
      return token;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  }

  getSystemInfo(): SystemInfo | null {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      return window.CrazyGames.SDK.user.systemInfo;
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }

  /* Get user data from cloud storage */
  async getData(key: string): Promise<string | null> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return null;
    }

    try {
      const data = await window.CrazyGames.SDK.data.getItem(key);
      return data;
    } catch (error) {
      console.error('Error getting data:', error);
      return null;
    }
  }

  /* Save user data to cloud storage */
  async setData(key: string, value: string): Promise<void> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return;
    }

    try {
      await window.CrazyGames.SDK.data.setItem(key, value);
      console.log('[CrazyGames] Data saved:', key);
    } catch (error) {
      console.error('Error setting data:', error);
      throw error;
    }
  }

  /* Remove user data from cloud storage */
  async removeData(key: string): Promise<void> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return;
    }

    try {
      await window.CrazyGames.SDK.data.removeItem(key);
      console.log('[CrazyGames] Data removed:', key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  }

  /* Clear all user data from cloud storage */
  async clearData(): Promise<void> {
    if (!this.shouldUseSDK() || !this.initialized) {
      return;
    }

    try {
      await window.CrazyGames.SDK.data.clear();
      console.log('[CrazyGames] All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}

declare global {
  interface Window {
    CrazyGames: {
      SDK: {
        init: () => Promise<void>;
        environment: SDKEnvironment;
        ad: {
          requestAd: (type: AdType, callbacks: {
            adStarted?: () => void;
            adFinished?: () => void;
            adError?: (error: AdError) => void;
          }) => void;
          hasAdblock: () => Promise<boolean>;
        };
        banner: {
          requestBanner: (options: BannerOptions) => Promise<void>;
          requestResponsiveBanner: (containerId: string) => Promise<void>;
          clearBanner: (containerId: string) => void;
          clearAllBanners: () => void;
        };
        game: {
          gameplayStart: () => void;
          gameplayStop: () => void;
          loadingStart: () => void;
          loadingStop: () => void;
          showInviteButton: (params: InviteParams) => void;
          hideInviteButton: () => void;
          inviteLink: (params: InviteParams) => Promise<InviteLink>;
          settings: GameSettings;
          isInstantMultiplayer: boolean;
          getInviteParam: (paramName: string) => string | null;
          happytime: () => void;
        };
        user: {
          isUserAccountAvailable: boolean;
          getUser: () => Promise<User>;
          showAuthPrompt: () => Promise<User>;
          getUserToken: () => Promise<string>;
          systemInfo: SystemInfo;
        };
        data: {
          getItem: (key: string) => Promise<string | null>;
          setItem: (key: string, value: string) => Promise<void>;
          removeItem: (key: string) => Promise<void>;
          clear: () => Promise<void>;
        };
      };
    };
  }
}

export const crazygamesSDK = new CrazyGamesSDK();

/* First-time CrazyGames players skip the menu and drop straight into a game.
   Returns true when this call is what flipped the flag, so React state can
   follow. Safe to call repeatedly - invite/instant-multiplayer already set
   instantStart, and a returning player never trips it. */
export function applyCrazygamesFirstVisitAutoStart(): boolean {
  try {
    if (!crazygamesSDK.isCrazyGamesContext()) return false;
    if ((window as any).instantStart) return false;
    if (localStorage.getItem('swordbattle:hasVisited')) return false;

    (window as any).instantStart = true;
    (window as any)._cgFirstVisitAutoStart = true;
    console.log('[CrazyGames] First visit - dropping straight into a game');
    return true;
  } catch (e) {
    return false;
  }
}

export default crazygamesSDK;
