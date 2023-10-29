import { useState } from 'react';
import { Settings } from '../../game/Settings';
import './SettingsModal.scss';

const isDev = process.env.NODE_ENV === 'development';
const serverList = [
  { value: 'eu', name: 'EU' },
  { value: 'us', name: 'US' },
];
if (isDev) {
  serverList.unshift({ value: 'dev', name: 'Dev (localhost)' });
}

function SettingsModal() {
  const [useWebGL, setUseWebGL] = useState(Settings.useWebGL);
  const [antialiasing, setAntialiasing] = useState(Settings.antialiasing);
  const [movementMode, setMovementMode] = useState(Settings.movementMode);
  const [sound, setSound] = useState(Settings.sound);
  const [server, setServer] = useState(Settings.server);

  const updateUseWebGL = (value: any) => {
    setUseWebGL(value);
    Settings.useWebGL = value;
  }
  const updateAntialiasing = (value: any) => {
    setAntialiasing(value);
    Settings.antialiasing = value;
  }
  const updateMovementMode = (value: any) => {
    setMovementMode(value);
    Settings.movementMode = value;
  }
  const updateSound = (value: any) => {
    setSound(value);
    Settings.sound = value;
  }
  const updateServer = (value: any) => {
    setServer(value);
    Settings.server = value;
  }

  return (
    <div className="settings">
      <div className="settings-title">Settings</div>

      <div className="settings-line">
        <label htmlFor="useWebGL">Use WebGL (requires reload):</label>
        <label className="switch">
          <input type="checkbox" name="useWebGL" id="useWebGL"
            checked={useWebGL}
            onChange={(e) => updateUseWebGL(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      <div className="settings-line">
        <label htmlFor="antialiasing">Use Antialiasing:</label>
        <label className="switch">
          <input type="checkbox" name="antialiasing" id="antialiasing"
            checked={antialiasing}
            onChange={(e) => updateAntialiasing(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      <label htmlFor="movement">Movement mode:</label>
      <select name="movement" id="movement"
        value={movementMode}
        onChange={(e) => updateMovementMode(e.target.value)}
      >
        <option value="mouse">Mouse Only</option>
        <option value="keys">Mouse + Keys</option>
      </select>

      <label htmlFor="sound">Sound:</label>
      <input type="range" name="sound" id="sound"
        min={0} max={10}
        value={sound}
        onChange={(e) => updateSound(e.target.value)}
      />

      <label htmlFor="server">Server:</label>
      <select name="server" id="server"
        value={server}
        onChange={(e) => updateServer(e.target.value)}
      >
        {serverList.map((server) => <option key={server.value} value={server.value}>{server.name}</option>)}
      </select>
    </div>
  )
}

export default SettingsModal;
