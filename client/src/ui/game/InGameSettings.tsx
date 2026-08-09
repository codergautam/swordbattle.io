import { useEffect, useState } from 'react';
import { Settings } from '../../game/Settings';
import './InGameSettings.scss';

function InGameSettings() {
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(Settings.sound);
  const [enableChat, setEnableChat] = useState(Settings.enableChat);
  const [screenEffects, setScreenEffects] = useState(Settings.screenEffects);
  const [cameraFollowsMouse, setCameraFollowsMouse] = useState(Settings.cameraFollowsMouse);

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
            <span>Chat</span>
            <input type="checkbox" checked={!!enableChat}
              onChange={(e) => apply('enableChat', e.target.checked, setEnableChat)} />
          </label>

          <label className="igs-row">
            <span>Screen effects (snow, heat)</span>
            <input type="checkbox" checked={!!screenEffects}
              onChange={(e) => apply('screenEffects', e.target.checked, setScreenEffects)} />
          </label>

          <label className="igs-row">
            <span>Camera follows cursor</span>
            <input type="checkbox" checked={!!cameraFollowsMouse}
              onChange={(e) => apply('cameraFollowsMouse', e.target.checked, setCameraFollowsMouse)} />
          </label>

        </div>
      </div>
    </div>
  );
}

export default InGameSettings;
