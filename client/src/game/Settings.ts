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
  useWebGL: {
    name: 'Use WebGL (requires reload)',
    type: 'toggle',
    default: false,
    onChange: (newValue: boolean) => {
      const saved = localStorage.getItem('swordbattle:WebGL');
      if (newValue) localStorage.setItem('swordbattle:WebGL', 'OK');
      else localStorage.removeItem('swordbattle:WebGL');
      if (saved !== (newValue ? 'OK' : null)) {
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
  movementMode: {
    name: 'Movement mode',
    list: [
      { name: 'Mouse Only', value: 'mouse' },
      { name: 'Mouse + Keys', value: 'keys' },
    ],
    default: 'keys',
  },
  sound: {
    name: 'Sound',
    type: 'range',
    min: 0,
    max: 10,
    default: 3,
  },
  server: {
    name: 'Server',
    default: 'auto',
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
          this.saveSetting(key, newValue);
        },
      })
    }

    const savedSettings = this.get();
    for (const key in savedSettings) {
      Settings[key] = savedSettings[key];
    }
    isLoaded = true;
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
