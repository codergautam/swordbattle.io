import { useEffect, useState } from 'react';
import { Settings, settingsList } from '../../game/Settings';
import { getServerList } from '../../ServerList';
import './SettingsModal.scss';

function SettingsModal() {
  const [useWebGL, setUseWebGL] = useState(Settings.useWebGL);
  const [swords, setSwords] = useState(Settings.swords);
  const [coins, setCoins] = useState(Settings.coins);
  const [loadskins, setLoadskins] = useState(Settings.loadskins);
  const [antialiasing, setAntialiasing] = useState(Settings.antialiasing);
  const [resolution, setResolution] = useState(Settings.resolution);
  const [movementMode, setMovementMode] = useState(Settings.movementMode);
  const [sound, setSound] = useState(Settings.sound);
  // const [server, setServer] = useState(Settings.server);
  // const [servers, setServers] = useState<any[]>([]);

  // useEffect(() => {
  //   getServerList().then(setServers);
  // }, []);

  const updateUseWebGL = (value: any) => {
    setUseWebGL(value);
    Settings.useWebGL = value;
  }
  const updateSwords = (value: any) => {
    setSwords(value);
    Settings.swords = value;
  }
  const updateCoins = (value: any) => {
    setCoins(value);
    Settings.coins = value;
  }
  const updateLoadskins = (value: any) => {
    setLoadskins(value);
    Settings.loadskins = value;
  }
  const updateAntialiasing = (value: any) => {
    setAntialiasing(value);
    Settings.antialiasing = value;
  }
  const updateResolution = (value: any) => {
    setResolution(value);
    Settings.resolution = Number(value);
  }
  const updateMovementMode = (value: any) => {
    setMovementMode(value);
    Settings.movementMode = value;
  }
  const updateSound = (value: any) => {
    setSound(value);
    Settings.sound = value;
  }
  // const updateServer = (value: any) => {
  //   setServer(value);
  //   Settings.server = value;
  // }

  return (
    <div className="settings">
      <div className="settings-title">Settings</div>

      <h3 className="section">Visual</h3>
      <div className="settings-line">
        <label htmlFor="swords">Show skins' swords in shop: </label>
        <label className="switch">
          <input type="checkbox" name="swords" id="swords"
            checked={swords}
            onChange={(e) => updateSwords(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="settings-line">
        <label htmlFor="coins">Use legacy coin images (requires reload): </label>
        <label className="switch">
          <input type="checkbox" name="coins" id="coins"
            checked={coins}
            onChange={(e) => updateCoins(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
    <br></br><h3 className="section">Performance</h3>
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

      <label htmlFor="resolution">Resolution (Beta):</label>
      <input type="range" name="resolution" id="resolution"
        min={settingsList.resolution.min} max={settingsList.resolution.max}
        value={resolution}
        onChange={(e) => updateResolution(e.target.value)}
      />


    <br></br><h3 className="section">Gameplay</h3>
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

      <br></br><h3 className="sectionDebug">Debug</h3>
      <div className="settings-line">
        <label htmlFor="loadskins" className="debug">Refuse skin loading attempts:</label>
        <label className="switch">
          <input type="checkbox" name="loadskins" id="loadskins"
            checked={loadskins}
            onChange={(e) => updateLoadskins(e.target.checked)}
          />
          <span className="slider round"></span>
        </label>
      </div>
      <p style={{color: 'red', marginTop: '-7px', fontSize: '13.2px'}}>WARNING: THIS SETTING CAN BE DANGEROUS</p>
      {/* <label htmlFor="server">Server:</label> */}
      {/* <select name="server" id="server"
        value={servers.length === 0 ? 'loading' : server}
        onChange={(e) => updateServer(e.target.value)}
      >
        {servers.length === 0 && <option value="loading" disabled>Loading...</option>}
        {servers.map((server) => <option key={server.value} value={server.value} disabled={server.offline}>
          {server.name} ({server.offline ? 'OFFLINE' : server.ping + 'ms' })
        </option>)}
      </select> */}
    </div>
  )
}

export default SettingsModal;
