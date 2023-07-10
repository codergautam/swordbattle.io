import { useState } from 'react';
import { Settings } from '../game/Settings';
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
  const [movementMode, setMovementMode] = useState(Settings.movementMode);
  const [sound, setSound] = useState(Settings.sound);
  const [server, setServer] = useState(Settings.server);

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
