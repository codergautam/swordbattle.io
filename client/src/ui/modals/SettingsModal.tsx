import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Settings, settingsList } from '../../game/Settings';
import { selectAccount } from '../../redux/account/selector';
import api from '../../api';
import './SettingsModal.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGear, faImage, faCoins,
  faVectorSquare, faExpand, faComment, faArrowsUpDownLeftRight, faVolumeHigh, faVideo, faRectangleAd, faCrosshairs,
} from '@fortawesome/free-solid-svg-icons';

const isBasicLaunch = typeof window !== 'undefined' && !!(window as any)._isCrazyGamesBasicLaunch;

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
  const account = useSelector(selectAccount);
  const [coins, setCoins] = useState(Settings.coins);
  const [moreAds, setMoreAds] = useState(Settings.moreAds);
  const [screenEffects, setScreenEffects] = useState(Settings.screenEffects);
  const [antialiasing, setAntialiasing] = useState(Settings.antialiasing);
  const [resolution, setResolution] = useState(Settings.resolution);
  const [movementMode, setMovementMode] = useState(Settings.movementMode);
  const [cameraFollowsMouse, setCameraFollowsMouse] = useState(Settings.cameraFollowsMouse);
  const [showHitboxes, setShowHitboxes] = useState(Settings.showHitboxes);
  const [sound, setSound] = useState(Settings.sound);
  const chatForceDisabled = isChatForceDisabled();
  const [enableChat, setEnableChat] = useState(chatForceDisabled ? false : Settings.enableChat);
  const [useWebGL, setUseWebGL] = useState(Settings.useWebGL);
  const rendererMode = (window as any).__rendererMode;

  const updateCoins = (v: boolean) => { setCoins(v); Settings.coins = v; };
  const updateScreenEffects = (v: boolean) => { setScreenEffects(v); Settings.screenEffects = v; };
  const updateAntialiasing = (v: boolean) => { setAntialiasing(v); Settings.antialiasing = v; };
  const updateResolution = (v: any) => { setResolution(v); Settings.resolution = Number(v); };
  const updateMovementMode = (v: any) => { setMovementMode(v); Settings.movementMode = v; };
  const updateCameraFollowsMouse = (v: boolean) => { setCameraFollowsMouse(v); Settings.cameraFollowsMouse = v; };
  const updateShowHitboxes = (v: boolean) => { setShowHitboxes(v); Settings.showHitboxes = v; };
  const updateSound = (v: any) => { setSound(v); Settings.sound = v; };
  const updateEnableChat = (v: boolean) => {
    if (chatForceDisabled) return;
    setEnableChat(v); Settings.enableChat = v;
  };
  const updateUseWebGL = (v: boolean) => { setUseWebGL(v); Settings.useWebGL = v; };
  const updateMoreAds = (v: boolean) => {
    setMoreAds(v);
    Settings.moreAds = v;
    if (account?.isLoggedIn) {
      api.post(`${api.endpoint}/auth/set-more-ads`, { enabled: v });
    }
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
          <span className="s-label"><FontAwesomeIcon icon={faImage} className="s-icon" /> Screen effects (snow, heat) <em>(off = more FPS)</em></span>
          <Toggle checked={screenEffects} onChange={updateScreenEffects} />
        </div>

        <h3 className="section"> Performance</h3>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faVectorSquare} className="s-icon" /> Antialiasing</span>
          <Toggle checked={antialiasing} onChange={updateAntialiasing} />
        </div>
        <div className="settings-line">
          <span className="s-label">
            <FontAwesomeIcon icon={faGear} className="s-icon" /> Use WebGL
            {rendererMode === 'canvas' && <em> (currently running in compatibility mode)</em>}
          </span>
          <Toggle checked={useWebGL} onChange={updateUseWebGL} />
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
          <span className="s-label"><FontAwesomeIcon icon={faVideo} className="s-icon" /> Camera follows cursor</span>
          <Toggle checked={cameraFollowsMouse} onChange={updateCameraFollowsMouse} />
        </div>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faCrosshairs} className="s-icon" /> Show player and sword hitboxes</span>
          <Toggle checked={showHitboxes} onChange={updateShowHitboxes} />
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

        {!isBasicLaunch && (
        <>
        <h3 className="section"> Support the game</h3>
        <div className="settings-line">
          <span className="s-label"><FontAwesomeIcon icon={faRectangleAd} className="s-icon" /> More ads <em>(shows a banner ad while you play)</em></span>
          <Toggle checked={moreAds} onChange={updateMoreAds} />
        </div>
        {moreAds && (
          <div className="more-ads-benefits">
            {account?.isLoggedIn ? (
              <>
                <div className="mab-title">Thanks for supporting Swordbattle.</div>
                <div className="mab-line"><span className="mab-yellow">Ad Supporter</span> profile tag</div>
                <div className="mab-line"><span className="mab-yellow">Yellow</span> in-game name</div>
              </>
            ) : (
              <div className="mab-title">Log in to get the <span className="mab-yellow">Ad Supporter</span> profile tag and a <span className="mab-yellow">yellow</span> in-game name!</div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;
