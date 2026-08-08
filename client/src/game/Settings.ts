const isDev = process.env.NODE_ENV === 'development';

interface SettingType {
  name: string;
  default: any,
  type?: string;
  min?: number;
  max?: number;
  list?: any;
  onChange?: any;
};

let isLoaded = false;

export const settingsList: Record<string, SettingType> = {
  skinSort: {
    name: 'Sort skins by',
    list: [
      { name: 'Price (Low to High)', value: 'low' },
      { name: 'Price (High to Low)', value: 'high' },
      { name: 'Name', value: 'name' },
    ],
    default: 'low',
  },
  showUltimate: {
      name: 'Show ultimate skins',
      type: 'toggle',
      default: true,
    },
  showEvent: {
      name: 'Show event skins',
      type: 'toggle',
      default: true,
    },
  showOG: {
    name: 'Show OG skins',
    type: 'toggle',
    default: true,
  },
  coins: {
      name: 'Use legacy coin images (requires reload)',
      type: 'toggle',
      default: false,
      onChange: () => {
        if (isLoaded) {
          window.location.reload();
        }
      },
    },
  useWebGL: {
    name: 'Use WebGL (requires reload)',
    type: 'toggle',
    default: true,
    onChange: (newValue: boolean) => {
      try {
        if (newValue) {
          localStorage.setItem('swordbattle:WebGL', 'OK');
          localStorage.removeItem('swordbattle:webgl_failed');
          localStorage.removeItem('swordbattle:webgl_slow');
        } else {
          localStorage.removeItem('swordbattle:WebGL');
        }
      } catch (e) {}
      if (isLoaded) {
        try { window.onbeforeunload = null; } catch (e) {}
        window.location.reload();
      }
    },
  },
  antialiasing: {
    name: 'Antialiasing',
    type: 'toggle',
    default: true,
    onChange: () => {
      if (isLoaded) {
        window.location.reload();
      }
    },
  },
  gpuPreference: {
    name: 'GPU preference (requires reload)',
    list: [
      { name: 'Auto (recommended)', value: 'default' },
      { name: 'High performance (force dGPU)', value: 'high-performance' },
      { name: 'Power saving (force iGPU)', value: 'low-power' },
    ],
    default: 'default',
    onChange: () => {
      if (isLoaded) {
        window.location.reload();
      }
    },
  },
  resolution: {
    name: 'Resolution',
    type: 'range',
    default: 100,
    min: 30,
    max: 100,
    onChange: () => {
      // Emit resize event to update game resolution
      window.dispatchEvent(new Event('resize'));
    },
  },
  fpsLimit: {
    name: 'FPS limit',
    list: [
      { name: 'Unlimited', value: 0 },
      { name: '144 FPS', value: 144 },
      { name: '120 FPS', value: 120 },
      { name: '90 FPS', value: 90 },
      { name: '75 FPS', value: 75 },
      { name: '60 FPS', value: 60 },
      { name: '30 FPS', value: 30 },
    ],
    default: 0,
    onChange: (value: any) => {
      window.dispatchEvent(new CustomEvent('fpsLimitChanged', { detail: { limit: Number(value) || 0 } }));
    },
  },
  movementMode: {
    name: 'Movement mode',
    list: [
      { name: 'Mouse Only', value: 'mouse' },
      { name: 'Mouse + Keys', value: 'keys' },
    ],
    default: 'keys',
  },
  cameraFollowsMouse: {
    name: 'Camera follows cursor',
    type: 'toggle',
    default: true,
  },
  sound: {
    name: 'Sound',
    type: 'range',
    min: 0,
    max: 10,
    default: 3,
    onChange: (value: number) => {
      window.dispatchEvent(new CustomEvent('soundVolumeChanged', { detail: { volume: Number(value) } }));
    },
  },
  server: {
    name: 'Server',
    default: 'auto',
  },
  enableChat: {
    name: 'Enable Chat',
    type: 'toggle',
    default: false,
    onChange: (value: boolean) => {
      window.dispatchEvent(new CustomEvent('chatSettingChanged', { detail: { enabled: value } }));
    },
  },
  unloadSkins: {
    name: 'Unload skins (use default only)',
    type: 'toggle',
    default: false,
  },
  livingShadows: {
    name: 'Shadows on players & mobs',
    type: 'toggle',
    default: true,
    onChange: (value: boolean) => {
      window.dispatchEvent(new CustomEvent('livingShadowsChanged', { detail: { enabled: value } }));
    },
  },
  screenEffects: {
    name: 'Screen effects (snow, heat haze, etc.)',
    type: 'toggle',
    default: true,
    onChange: (value: boolean) => {
      window.dispatchEvent(new CustomEvent('screenEffectsChanged', { detail: { enabled: value } }));
    },
  },
  interpolation: {
    name: 'Smooth other players (interpolation, experimental)',
    type: 'toggle',
    default: false,
  },
  moreAds: {
    name: 'More ads',
    type: 'toggle',
    default: false,
    onChange: (value: boolean) => {
      window.dispatchEvent(new CustomEvent('moreAdsChanged', { detail: { enabled: value } }));
    },
  },
};

export const Settings: any = {};

class SettingsManager {
  key: string = 'swordbattle:settings';

  initialize() {
    for (const key in settingsList) {
      const setting = settingsList[key as keyof typeof settingsList];
      let value = setting.default;

      Object.defineProperty(Settings, key, {
        get: () => value,
        set: (newValue) => {
          value = newValue;
          this.saveSettingSafe(key, newValue);
        },
      })
    }

    try {
      if (!localStorage.getItem('swordbattle:webgl_migrated')) {
        localStorage.setItem('swordbattle:webgl_migrated', '1');
        const saved = this.get();
        if (saved.useWebGL === undefined) {
          localStorage.setItem('swordbattle:WebGL', 'OK');
        }
      }
    } catch (e) {}

    const savedSettings = this.get();
    for (const key in savedSettings) {
      Settings[key] = savedSettings[key];
    }
    isLoaded = true;
  }

  saveSettingSafe(key: string, value: any) {
    try { this.saveSetting(key, value); } catch (e) {}
  }

  get() {
    let savedSettings: any = {};
		try {
			const data = JSON.parse(localStorage.getItem(this.key) as string);
			// console.log('Loaded Settings', data);
      if (data) {
				savedSettings = data;
			}
		} catch (e) {
			console.warn('Corrupted Settings');
			localStorage.removeItem(this.key);
		}
		return savedSettings;
  }

  saveSetting(key: string, value: any) {
		const savedSettings = this.get();
		savedSettings[key] = value;
		localStorage.setItem(this.key, JSON.stringify(savedSettings));

    // console.log('Saved Settings', savedSettings);
    if (settingsList[key].onChange) {
      settingsList[key].onChange(value);
    }
  }
}

const manager = new SettingsManager();
manager.initialize();
export default manager;
