const isDev = process.env.NODE_ENV === 'development';

export const settingsList = {
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
    list: [
      { name: 'Dev (localhost)', value: 'dev' },
      { name: 'EU', value: 'eu' },
      { name: 'US', value: 'us' },
    ],
    default: isDev ? 'dev' : 'eu',
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
  }

  get() {
    let savedSettings: any = {};
		try {
			const data = JSON.parse(localStorage.getItem(this.key) as string);
			if (data) {
				savedSettings = data;
			}
		} catch (e) {
			console.log('Corrupted Settings');
			localStorage.removeItem(this.key);
		}
		return savedSettings;
  }

  saveSetting(key: string, value: any) {
		const savedSettings = this.get();
		savedSettings[key] = value;
		localStorage.setItem(this.key, JSON.stringify(savedSettings));
  }
}

const manager = new SettingsManager();
manager.initialize();
export default manager;
