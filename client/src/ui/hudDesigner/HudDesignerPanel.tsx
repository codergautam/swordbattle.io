import { useEffect, useMemo, useState } from 'react';
import {
  HudThemePreset,
  defaultHudThemePreset,
  getHudThemePreset,
  nextHudThemeId,
  normalizeHudThemePreset,
  setHudTheme,
} from '../../hudTheme';
import './HudDesignerPanel.scss';

interface HudDesignerPanelProps {
  onClose?: () => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}

const hexPattern = /^#[0-9a-f]{6}$/i;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return Promise.resolve();
}

function fragment(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .slice(1, -1)
    .map((line) => line.replace(/^ {2}/, ''))
    .join('\n');
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="hd-color">
      <input
        type="color"
        aria-label={label}
        value={hexPattern.test(value) ? value : '#000000'}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="hd-color-meta">
        <span>{label}</span>
        <input
          className="hd-hex"
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, suffix = '', onChange }: SliderFieldProps) {
  return (
    <label className="hd-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <b>{value}{suffix}</b>
    </label>
  );
}

const HudDesignerPanel: React.FC<HudDesignerPanelProps> = ({ onClose }) => {
  const [theme, setThemeState] = useState<HudThemePreset>(() => getHudThemePreset());
  const [displayName, setDisplayName] = useState('My HUD Theme');
  const [themeId, setThemeId] = useState(() => String(nextHudThemeId()));
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('A custom HUD theme');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState('');

  const name = slugify(displayName) || 'myhudtheme';

  useEffect(() => {
    setHudTheme(theme);
  }, [theme]);

  const presetJson = useMemo(() => fragment({ [name]: theme }), [name, theme]);
  const cosmeticJson = useMemo(() => fragment({
    [name]: {
      name,
      displayName,
      id: Number(themeId) || 0,
      buyable: false,
      price: Number(price) || 0,
      description,
    },
  }), [name, displayName, themeId, price, description]);

  const update = <K extends keyof HudThemePreset>(key: K, value: HudThemePreset[K]) => {
    setThemeState((current) => ({ ...current, [key]: value }));
  };

  const flashCopy = (label: string, value: string) => {
    copyText(value).then(() => {
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1400);
    });
  };

  const applyImport = () => {
    setImportError('');
    const raw = importText.trim();
    if (!raw) return;

    let parsed: any;
    try {
      parsed = JSON.parse(raw.startsWith('{') ? raw : `{${raw}}`);
    } catch (error) {
      try {
        parsed = JSON.parse(`{${raw.replace(/,\s*$/, '')}}`);
      } catch (nestedError) {
        setImportError('Not valid JSON');
        return;
      }
    }

    const keys = Object.keys(parsed || {});
    const wrapped = keys.length === 1 && parsed[keys[0]] && typeof parsed[keys[0]] === 'object' && !('bg' in parsed);
    const design = wrapped ? parsed[keys[0]] : parsed;
    if (!design || typeof design !== 'object' || Array.isArray(design)) {
      setImportError('Could not find a HUD theme object');
      return;
    }

    if (wrapped) setDisplayName(keys[0]);
    setThemeState(normalizeHudThemePreset({ ...defaultHudThemePreset, ...design }));
  };

  return (
    <aside
      className="hd-panel"
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <div className="hd-titlebar">
        <div>
          <div className="hd-title">HUD Theme Designer</div>
        </div>
        {onClose && <button type="button" className="hd-close" onClick={onClose} aria-label="Close">×</button>}
      </div>

      <section className="hd-section">
        <div className="hd-section-head">Theme Info</div>
        <label className="hd-field">
          <span>Display Name</span>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <div className="hd-note">key: <code>{name}</code></div>
        <div className="hd-row">
          <label className="hd-field">
            <span>ID</span>
            <input value={themeId} onChange={(event) => setThemeId(event.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="hd-field">
            <span>Price</span>
            <input value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ''))} />
          </label>
        </div>
        <label className="hd-field">
          <span>Description</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Panels</div>
        <ColorField label="Panel Background" value={theme.bg} onChange={(value) => update('bg', value)} />
        <SliderField label="Panel Opacity" value={theme.bgAlpha} min={0} max={1} step={0.01} onChange={(value) => update('bgAlpha', value)} />
        <ColorField label="Header Background" value={theme.headerBg} onChange={(value) => update('headerBg', value)} />
        <SliderField label="Header Opacity" value={theme.headerAlpha} min={0} max={1} step={0.01} onChange={(value) => update('headerAlpha', value)} />
        <SliderField label="Corner Radius" value={theme.radius} min={0} max={40} step={1} suffix="px" onChange={(value) => update('radius', value)} />
        <SliderField label="Backdrop Blur" value={theme.backdropBlur} min={0} max={30} step={1} suffix="px" onChange={(value) => update('backdropBlur', value)} />
        <div className="hd-note hd-note-spaced">Backdrop blur only applies to leaderboard</div>
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Progress Bar</div>
        <label className="hd-toggle">
          <input type="checkbox" checked={theme.progressBarBackgroundEnabled} onChange={(event) => update('progressBarBackgroundEnabled', event.target.checked)} />
          <span>Show progress bar background</span>
        </label>
        <div className={theme.progressBarBackgroundEnabled ? '' : 'hd-disabled'}>
          <ColorField label="Background" value={theme.progressBarBg} onChange={(value) => update('progressBarBg', value)} />
          <SliderField label="Opacity" value={theme.progressBarBgAlpha} min={0} max={1} step={0.01} onChange={(value) => update('progressBarBgAlpha', value)} />
        </div>
        <ColorField label="Fill Color" value={theme.progressBarFill} onChange={(value) => update('progressBarFill', value)} />
        <label className="hd-toggle">
          <input type="checkbox" checked={theme.progressBarShineEnabled} onChange={(event) => update('progressBarShineEnabled', event.target.checked)} />
          <span>Show shine effect</span>
        </label>
        <div className={theme.progressBarShineEnabled ? '' : 'hd-disabled'}>
          <ColorField label="Shine Color" value={theme.progressBarShine} onChange={(value) => update('progressBarShine', value)} />
          <SliderField label="Shine Opacity" value={theme.progressBarShineAlpha} min={0} max={1} step={0.01} onChange={(value) => update('progressBarShineAlpha', value)} />
        </div>
        <SliderField label="Corner Radius" value={theme.progressBarRadius} min={0} max={40} step={1} suffix="px" onChange={(value) => update('progressBarRadius', value)} />
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Colored Outline</div>
        <label className="hd-toggle">
          <input type="checkbox" checked={theme.borderEnabled} onChange={(event) => update('borderEnabled', event.target.checked)} />
          <span>Show colored outline</span>
        </label>
        <div className={theme.borderEnabled ? '' : 'hd-disabled'}>
          <ColorField label="Outline Color" value={theme.border} onChange={(value) => update('border', value)} />
          <SliderField label="Opacity" value={theme.borderAlpha} min={0} max={1} step={0.01} onChange={(value) => update('borderAlpha', value)} />
          <SliderField label="Thickness" value={theme.borderW} min={0} max={12} step={1} suffix="px" onChange={(value) => update('borderW', value)} />
        </div>
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Black Outer Outline</div>
        <label className="hd-toggle">
          <input type="checkbox" checked={theme.outerEnabled} onChange={(event) => update('outerEnabled', event.target.checked)} />
          <span>Show outer outline</span>
        </label>
        <div className={theme.outerEnabled ? '' : 'hd-disabled'}>
          <ColorField label="Outer Color" value={theme.outer} onChange={(value) => update('outer', value)} />
          <SliderField label="Opacity" value={theme.outerAlpha} min={0} max={1} step={0.01} onChange={(value) => update('outerAlpha', value)} />
          <SliderField label="Thickness" value={theme.outerW} min={0} max={12} step={1} suffix="px" onChange={(value) => update('outerW', value)} />
        </div>
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Text and Accent</div>
        <ColorField label="Accent" value={theme.accent} onChange={(value) => update('accent', value)} />
        <ColorField label="Text" value={theme.text} onChange={(value) => update('text', value)} />
        <ColorField label="Muted Text" value={theme.muted} onChange={(value) => update('muted', value)} />
        <ColorField label="Text Outline" value={theme.textOutline} onChange={(value) => update('textOutline', value)} />
        <SliderField label="Outline Thickness" value={theme.textOutlineW} min={0} max={12} step={1} suffix="px" onChange={(value) => update('textOutlineW', value)} />
        <button type="button" className="hd-btn hd-btn-wide" onClick={() => setThemeState({ ...defaultHudThemePreset })}>Reset Theme</button>
      </section>

      <section className="hd-section">
        <div className="hd-section-head">
          Export
          {copied && <span className="hd-copied">Copied {copied}</span>}
        </div>
        <div className="hd-export-label">
          <span>client/src/game/hudThemes.json</span>
          <button type="button" className="hd-btn" onClick={() => flashCopy('preset', presetJson)}>Copy</button>
        </div>
        <textarea className="hd-code" readOnly value={presetJson} rows={18} />
        <div className="hd-export-label">
          <span>cosmetics.json → "hudThemes"</span>
          <button type="button" className="hd-btn" onClick={() => flashCopy('entry', cosmeticJson)}>Copy</button>
        </div>
        <textarea className="hd-code" readOnly value={cosmeticJson} rows={9} />
      </section>

      <section className="hd-section">
        <div className="hd-section-head">Import</div>
        <textarea
          className="hd-code"
          placeholder='Paste a HUD theme preset here, such as "ocean": { "bg": "#102038", ... }'
          value={importText}
          spellCheck={false}
          onChange={(event) => setImportText(event.target.value)}
          rows={7}
        />
        {importError && <div className="hd-error">{importError}</div>}
        <button type="button" className="hd-btn hd-btn-wide" onClick={applyImport}>Load Preset</button>
      </section>
    </aside>
  );
};

export default HudDesignerPanel;
