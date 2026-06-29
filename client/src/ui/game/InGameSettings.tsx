import { useEffect, useState } from 'react';
import { Settings, settingsList } from '../../game/Settings';
import './InGameSettings.scss';

function InGameSettings() {
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(Settings.sound);
  const [resolution, setResolution] = useState(Settings.resolution);
  const [fpsLimit, setFpsLimit] = useState(Settings.fpsLimit);
  const [enableChat, setEnableChat] = useState(Settings.enableChat);
  const [livingShadows, setLivingShadows] = useState(Settings.livingShadows);
  const [screenEffects, setScreenEffects] = useState(Settings.screenEffects);
  const [interpolation, setInterpolation] = useState(Settings.interpolation);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener('toggleInGameSettings', toggle);
    return () => window.removeEventListener('toggleInGameSettings', toggle);
  }, []);

  if (!open) return null;

  const apply = (key: string, val: any, setter: (v: any) => void) => {
    setter(val);
    Settings[key] = val;
  };

  return (
    <div className="ingame-settings-overlay" onClick={() => setOpen(false)}>
      <div className="ingame-settings" onClick={(e) => e.stopPropagation()}>
        <div className="igs-header">
          <span>Settings</span>
          <button className="igs-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="igs-body">
          <label className="igs-row">
            <span>Sound</span>
            <input type="range" min={0} max={10} value={sound}
              onChange={(e) => apply('sound', Number(e.target.value), setSound)} />
          </label>

          <label className="igs-row">
            <span>Resolution</span>
            <input type="range" min={settingsList.resolution.min} max={settingsList.resolution.max} value={resolution}
              onChange={(e) => apply('resolution', Number(e.target.value), setResolution)} />
          </label>

          <label className="igs-row">
            <span>FPS limit</span>
            <select value={fpsLimit}
              onChange={(e) => apply('fpsLimit', Number(e.target.value), setFpsLimit)}>
              {(settingsList.fpsLimit.list as any[]).map((o) => (
                <option key={o.value} value={o.value}>{o.name}</option>
              ))}
            </select>
          </label>

          <label className="igs-row">
            <span>Chat</span>
            <input type="checkbox" checked={!!enableChat}
              onChange={(e) => apply('enableChat', e.target.checked, setEnableChat)} />
          </label>

          <label className="igs-row">
            <span>Shadows (players &amp; mobs)</span>
            <input type="checkbox" checked={!!livingShadows}
              onChange={(e) => apply('livingShadows', e.target.checked, setLivingShadows)} />
          </label>

          <label className="igs-row">
            <span>Screen effects (snow, heat)</span>
            <input type="checkbox" checked={!!screenEffects}
              onChange={(e) => apply('screenEffects', e.target.checked, setScreenEffects)} />
          </label>

          <label className="igs-row">
            <span>Smooth other players (interpolation)</span>
            <input type="checkbox" checked={!!interpolation}
              onChange={(e) => apply('interpolation', e.target.checked, setInterpolation)} />
          </label>
        </div>
      </div>
    </div>
  );
}

export default InGameSettings;
