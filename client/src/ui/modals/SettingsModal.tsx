import { useState } from 'react';
import { Settings, settingsList } from '../../game/Settings';
import './SettingsModal.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGear, faImage, faBolt, faGamepad, faCoins, faMoon, faMicrochip,
  faVectorSquare, faExpand, faComment, faArrowsUpDownLeftRight, faVolumeHigh,
} from '@fortawesome/free-solid-svg-icons';

function isChatForceDisabled(): boolean {
  try {
    const sdk = (window as any).CrazyGames?.SDK;
    if (sdk?.game?.settings?.disableChat === true) return true;
  } catch (e) {}
  return false;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider round" style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}></span>
    </label>
  );
}

function SettingsModal() {
  const [useWebGL, setUseWebGL] = useState(Settings.useWebGL);
  const [coins, setCoins] = useState(Settings.coins);
  const [livingShadows, setLivingShadows] = useState(Settings.livingShadows);
  const [screenEffects, setScreenEffects] = useState(Settings.screenEffects);
  const [antialiasing, setAntialiasing] = useState(Settings.antialiasing);
  const [interpolation, setInterpolation] = useState(Settings.interpolation);
  const [resolution, setResolution] = useState(Settings.resolution);
  const [fpsLimit, setFpsLimit] = useState(Settings.fpsLimit);
  const [gpuPreference, setGpuPreference] = useState(Settings.gpuPreference);
  const [movementMode, setMovementMode] = useState(Settings.movementMode);
  const [sound, setSound] = useState(Settings.sound);
  const chatForceDisabled = isChatForceDisabled();
  const [enableChat, setEnableChat] = useState(chatForceDisabled ? false : Settings.enableChat);

  const updateUseWebGL = (v: boolean) => { setUseWebGL(v); Settings.useWebGL = v; };
  const updateCoins = (v: boolean) => { setCoins(v); Settings.coins = v; };
  const updateLivingShadows = (v: boolean) => { setLivingShadows(v); Settings.livingShadows = v; };
  const updateScreenEffects = (v: boolean) => { setScreenEffects(v); Settings.screenEffects = v; };
  const updateAntialiasing = (v: boolean) => { setAntialiasing(v); Settings.antialiasing = v; };
  const updateInterpolation = (v: boolean) => { setInterpolation(v); Settings.interpolation = v; };
  const updateResolution = (v: any) => { setResolution(v); Settings.resolution = Number(v); };
  const updateFpsLimit = (v: any) => { setFpsLimit(Number(v)); Settings.fpsLimit = Number(v); };
  const updateGpuPreference = (v: any) => { setGpuPreference(v); Settings.gpuPreference = v; };
  const updateMovementMode = (v: any) => { setMovementMode(v); Settings.movementMode = v; };
  const updateSound = (v: any) => { setSound(v); Settings.sound = v; };
  const updateEnableChat = (v: boolean) => {
    if (chatForceDisabled) return;
    setEnableChat(v); Settings.enableChat = v;
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <FontAwesomeIcon icon={faGear} className="settings-header-icon" />
        <span>Settings</span>
      </div>

      <div className="settings-body">
        <h3 className="section"> Visual</h3>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faCoins} className="s-icon" /> Legacy coin images <em>(reloads)</em></span>
          <Toggle checked={coins} onChange={updateCoins} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faMoon} className="s-icon" /> Player &amp; mob shadows</span>
          <Toggle checked={livingShadows} onChange={updateLivingShadows} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faImage} className="s-icon" /> Screen effects (snow, heat) <em>(off = more FPS)</em></span>
          <Toggle checked={screenEffects} onChange={updateScreenEffects} />
        </div>

        <h3 className="section"> Performance</h3>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faMicrochip} className="s-icon" /> Use WebGL <em>(reloads)</em></span>
          <Toggle checked={useWebGL} onChange={updateUseWebGL} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faVectorSquare} className="s-icon" /> Antialiasing</span>
          <Toggle checked={antialiasing} onChange={updateAntialiasing} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faBolt} className="s-icon" /> Smooth other players <em>(interpolation, experimental)</em></span>
          <Toggle checked={interpolation} onChange={updateInterpolation} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faExpand} className="s-icon" /> Resolution</span>
          <div className="s-range">
            <input type="range" name="resolution" id="resolution"
              min={settingsList.resolution.min} max={settingsList.resolution.max} step={0.05}
              value={resolution}
              onChange={(e) => updateResolution(e.target.value)}
            />
            <span className="s-val">{Number(resolution).toFixed(2)}</span>
          </div>
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faBolt} className="s-icon" /> FPS limit</span>
          <select name="fpsLimit" id="fpsLimit" value={fpsLimit} onChange={(e) => updateFpsLimit(e.target.value)}>
            {(settingsList.fpsLimit.list as any[]).map((o) => (
              <option key={o.value} value={o.value}>{o.name}</option>
            ))}
          </select>
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faMicrochip} className="s-icon" /> GPU preference <em>(reloads)</em></span>
          <select name="gpuPreference" id="gpuPreference" value={gpuPreference} onChange={(e) => updateGpuPreference(e.target.value)}>
            {(settingsList.gpuPreference.list as any[]).map((o) => (
              <option key={o.value} value={o.value}>{o.name}</option>
            ))}
          </select>
        </div>

        <h3 className="section"> Gameplay</h3>
        <div className="settings-line">
          <span className="s-label">
            <FontAwesomeIcon icon={faComment} className="s-icon" /> Enable chat
            {chatForceDisabled && <em>(disabled by platform)</em>}
          </span>
          <Toggle checked={enableChat} onChange={updateEnableChat} disabled={chatForceDisabled} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="s-icon" /> Movement mode</span>
          <select name="movement" id="movement" value={movementMode} onChange={(e) => updateMovementMode(e.target.value)}>
            <option value="mouse">Mouse Only</option>
            <option value="keys">Mouse + Keys</option>
          </select>
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faVolumeHigh} className="s-icon" /> Sound</span>
          <div className="s-range">
            <input type="range" name="sound" id="sound"
              min={0} max={10}
              value={sound}
              onChange={(e) => updateSound(e.target.value)}
            />
            <span className="s-val">{sound}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
