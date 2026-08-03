import { useEffect, useState } from 'react';
import {
  screenEffectsState,
  updateEffects,
  resetEffects,
  ScreenEffectsState,
} from '../../game/effects/screenEffectsState';

function shouldShow(): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  try { return localStorage.getItem('swordbattle:fx') === '1'; } catch { return false; }
}

const zero: Partial<ScreenEffectsState> = {
  tintAmount: 0, vignette: 0, heat: 0, snow: 0, rain: 0, wind: 0, water: 0, darkness: 0,
};

const presets: Record<string, Partial<ScreenEffectsState>> = {
  Clear: {},
  Desert: { tintColor: '#ffb46b', tintAmount: 0.18, heat: 0.6, wind: 0.25, vignette: 0.25, vignetteColor: '#3a1e00' },
  Lava: { tintColor: '#ff5a2c', tintAmount: 0.12, heat: 0.4, vignette: 0.55, vignetteColor: '#2a0000', wind: 0.1 },
  Ice: { tintColor: '#bfe2ff', tintAmount: 0.12, snow: 0.7, wind: 0.45, vignette: 0.3, vignetteColor: '#16263a' },
  Dirt: { tintColor: '#5a4a32', tintAmount: 0.12, darkness: 0.42, vignette: 0.4, vignetteColor: '#160f06' },
  River: { tintColor: '#2a6fae', tintAmount: 0.1, water: 0.7, wind: 0.1, vignette: 0.32, vignetteColor: '#06223a' },
  Grass: { tintColor: '#aef0a0', tintAmount: 0.06, wind: 0.22, vignette: 0.16, vignetteColor: '#0f2c0d' },
  Savanna: { tintColor: '#ffd27a', tintAmount: 0.1, wind: 0.3, heat: 0.14, vignette: 0.2, vignetteColor: '#2a2008' },
  Rain: { tintColor: '#6a7a90', tintAmount: 0.12, rain: 0.7, wind: 0.4, darkness: 0.2, vignette: 0.35, vignetteColor: '#10161f' },
  Night: { darkness: 0.55, tintColor: '#1a2a55', tintAmount: 0.15, vignette: 0.45, vignetteColor: '#02040f' },
};

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 70, right: 12, zIndex: 4,
  width: 230, padding: '10px 12px',
  background: 'rgba(15,17,22,0.92)', color: '#e7e7e7',
  fontFamily: "'Saira', sans-serif", fontSize: '12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'auto',
  boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
};

function Slider({ label, value, onChange, max = 1, step = 0.01 }:
  { label: string; value: number; onChange: (v: number) => void; max?: number; step?: number; }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span style={{ opacity: 0.7 }}>{value.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={max} step={step} value={value}
        style={{ width: '100%' }}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function ScreenEffectsPanel() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const s = screenEffectsState;
  const set = (patch: Partial<ScreenEffectsState>) => { updateEffects(patch); force((n) => n + 1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!shouldShow()) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ ...panelStyle, width: 'auto', padding: '6px 10px', cursor: 'pointer' }}>
        🎛 FX
      </button>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>Screen Effects</strong>
        <span>
          <label style={{ marginRight: 8 }}>
            <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> on
          </label>
          <button onClick={() => setOpen(false)} style={{ cursor: 'pointer' }}>×</button>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {Object.keys(presets).map((name) => (
          <button key={name} onClick={() => set({ ...zero, ...presets[name] })} style={{ flex: '1 0 auto', cursor: 'pointer' }}>
            {name}
          </button>
        ))}
      </div>

      <Slider label="Tint" value={s.tintAmount} onChange={(v) => set({ tintAmount: v })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span>tint colour</span>
        <input type="color" value={s.tintColor} onChange={(e) => set({ tintColor: e.target.value })} />
      </div>

      <Slider label="Vignette" value={s.vignette} onChange={(v) => set({ vignette: v })} />
      <Slider label="Vignette size" value={s.vignetteSize} onChange={(v) => set({ vignetteSize: v })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span>edge colour</span>
        <input type="color" value={s.vignetteColor} onChange={(e) => set({ vignetteColor: e.target.value })} />
      </div>

      <Slider label="Heat haze" value={s.heat} onChange={(v) => set({ heat: v })} />
      <Slider label="Snow" value={s.snow} onChange={(v) => set({ snow: v })} />
      <Slider label="Rain" value={s.rain} onChange={(v) => set({ rain: v })} />
      <Slider label="Water" value={s.water} onChange={(v) => set({ water: v })} />
      <Slider label="Darkness" value={s.darkness} onChange={(v) => set({ darkness: v })} />
      <Slider label="Wind" value={s.wind} onChange={(v) => set({ wind: v })} />

      <button onClick={() => { resetEffects(); force((n) => n + 1); }}
        style={{ width: '100%', marginTop: 4, cursor: 'pointer' }}>
        Reset all
      </button>
      <div style={{ opacity: 0.55, marginTop: 6 }}>F2 toggles this panel</div>
    </div>
  );
}

export default ScreenEffectsPanel;
