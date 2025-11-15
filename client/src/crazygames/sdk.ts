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

export interface InviteLink {
  inviteUrl: string;
}

export interface GameSettings {
  disableChat: boolean;
}

export interface InviteParams {
  [key: string]: string | number;
}

class CrazyGamesSDK {
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

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
    const env = this.getEnvironment();
    return env === 'crazygames' || env === 'local';
  }

  /* Request a video ad */
  async requestAd(type: AdType, callbacks?: AdCallbacks): Promise<void> {
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

    try {
      await window.CrazyGames.SDK.ad.requestAd(type, {
        adStarted: () => {
          console.log(`[CrazyGames] ${type} ad started`);
          callbacks?.adStarted?.();
        },
        adFinished: () => {
          console.log(`[CrazyGames] ${type} ad finished`);
          callbacks?.adFinished?.();
        },
        adError: (error) => {
          console.log(`[CrazyGames] ${type} ad error:`, error);
          callbacks?.adError?.(error);
        }
      });
    } catch (error) {
      console.error('Error requesting ad:', error);
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
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.banner.clearBanner(containerId);
      console.log(`[CrazyGames] Banner cleared: ${containerId}`);
    } catch (error) {
      console.error('Error clearing banner:', error);
    }
  }

  clearAllBanners(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.banner.clearAllBanners();
      console.log('[CrazyGames] All banners cleared');
    } catch (error) {
      console.error('Error clearing all banners:', error);
    }
  }

  /* Signal that gameplay has started */
  gameplayStart(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.gameplayStart();
      console.log('[CrazyGames] Gameplay started');
    } catch (error) {
      console.error('Error signaling gameplay start:', error);
    }
  }

  /* Signal that gameplay has stopped */
  gameplayStop(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.gameplayStop();
      console.log('[CrazyGames] Gameplay stopped');
    } catch (error) {
      console.error('Error signaling gameplay stop:', error);
    }
  }

  /* Signal that loading has started */
  loadingStart(): void {
    if (!this.shouldUseSDK() || !this.initialized) return;

    try {
      window.CrazyGames.SDK.game.loadingStart();
      console.log('[CrazyGames] Loading started');
    } catch (error) {
      console.error('Error signaling loading start:', error);
    }
  }

  /* Signal that loading has finished */
  loadingStop(): void {
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
export default crazygamesSDK;
