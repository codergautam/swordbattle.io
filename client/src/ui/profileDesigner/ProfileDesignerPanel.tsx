import { useMemo, useState } from 'react';
import { ProfileTheme, banners, bannerUrl, defaultTheme, fontSuggestions, isSystemFont, nextThemeId, themeFields, themeSliders } from '../profileTheme';
import './ProfileDesignerPanel.scss';

interface ProfileDesignerPanelProps {
  theme: ProfileTheme;
  onChange: (theme: ProfileTheme) => void;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
}

const hexPattern = /^#[0-9a-f]{6}$/i;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

const ProfileDesignerPanel: React.FC<ProfileDesignerPanelProps> = ({ theme, onChange, displayName, onDisplayNameChange }) => {
  const [themeId, setThemeId] = useState(() => String(nextThemeId()));
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('A custom profile theme');
  const [search, setSearch] = useState('');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [copied, setCopied] = useState('');

  const name = slugify(displayName) || 'mytheme';

  const filteredBanners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banners;
    return banners.filter((b) => b.displayName.toLowerCase().includes(q) || b.file.toLowerCase().includes(q));
  }, [search]);

  const presetJson = useMemo(
    () => JSON.stringify({ [name]: theme }, null, 2).split('\n').slice(1, -1).map((l) => l.replace(/^ {2}/, '')).join('\n'),
    [name, theme],
  );

  const cosmeticJson = useMemo(() => {
    const entry: any = {
      name,
      displayName,
      id: Number(themeId) || 0,
      buyable: false,
      price: Number(price) || 0,
      description,
    };
    return JSON.stringify({ [name]: entry }, null, 2).split('\n').slice(1, -1).map((l) => l.replace(/^ {2}/, '')).join('\n');
  }, [name, displayName, themeId, price, description]);

  const set = (key: keyof ProfileTheme, value: string | number | boolean) => onChange({ ...theme, [key]: value });

  const flashCopy = (label: string, text: string) => {
    copyText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1400);
    });
  };

  const applyImport = () => {
    setImportError('');
    const raw = importText.trim();
    if (!raw) return;
    let parsed: any;
    try {
      parsed = JSON.parse(raw.startsWith('{') ? raw : `{${raw}}`);
    } catch (e) {
      try {
        parsed = JSON.parse(`{${raw.replace(/,\s*$/, '')}}`);
      } catch (e2) {
        setImportError('Not valid JSON');
        return;
      }
    }
    const keys = Object.keys(parsed || {});
    const design = keys.length === 1 && typeof parsed[keys[0]] === 'object' && !('banner' in parsed) ? parsed[keys[0]] : parsed;
    if (!design || typeof design !== 'object') {
      setImportError('Could not find a theme object');
      return;
    }
    if (keys.length === 1 && design !== parsed) onDisplayNameChange(keys[0]);
    onChange({ ...defaultTheme, ...design });
    setImportError('');
  };

  return (
    <div className="pd-panel">
      <div className="pd-title">Profile Theme Designer</div>

      <div className="pd-section">
        <div className="pd-section-head">Theme Info</div>
        <label className="pd-field">
          <span>Display Name</span>
          <input value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} />
        </label>
        <div className="pd-note">key: <code>{name}</code></div>
        <div className="pd-row">
          <label className="pd-field">
            <span>ID</span>
            <input value={themeId} onChange={(e) => setThemeId(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
          <label className="pd-field">
            <span>Price</span>
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))} />
          </label>
        </div>
        <label className="pd-field">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">
          Banner
          <span className="pd-count">{filteredBanners.length} / {banners.length}</span>
        </div>
        <input
          className="pd-search"
          placeholder="Search banners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="pd-banners">
          <button
            className={`pd-banner${theme.banner ? '' : ' active'}`}
            onClick={() => set('banner', '')}
            title="No banner image"
          >
            <span className="pd-banner-none">None</span>
            <span>No Banner</span>
          </button>
          {filteredBanners.map((b) => (
            <button
              key={b.file}
              className={`pd-banner${theme.banner === b.file ? ' active' : ''}`}
              onClick={() => set('banner', b.file)}
              title={b.file}
            >
              <img src={bannerUrl(b.file)} alt={b.displayName} draggable={false} />
              <span>{b.displayName}</span>
            </button>
          ))}
          {filteredBanners.length === 0 && <div className="pd-empty">No banners match.</div>}
        </div>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Banner Fade</div>
        <div className="pd-color">
          <input
            type="color"
            value={hexPattern.test(theme.scrim) ? theme.scrim : '#000000'}
            onChange={(e) => set('scrim', e.target.value)}
          />
          <div className="pd-color-meta">
            <span className="pd-color-label" title="Color the banner fades into behind the name">Fade Color</span>
            <input className="pd-hex" value={theme.scrim} spellCheck={false} onChange={(e) => set('scrim', e.target.value)} />
          </div>
        </div>
        {themeSliders.map(({ key, label, help, min, max, step }) => (
          <div className="pd-slider" key={key}>
            <span className="pd-color-label" title={help}>{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={theme[key]}
              onChange={(e) => set(key, Number(e.target.value))}
            />
            <b>{theme[key]}</b>
          </div>
        ))}
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Theme Label</div>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.showThemeLabel}
            onChange={(e) => set('showThemeLabel', e.target.checked)}
          />
          <span>Show in banner corner</span>
        </label>
        <div className="pd-color">
          <input
            type="color"
            value={hexPattern.test(theme.themeLabel) ? theme.themeLabel : '#000000'}
            onChange={(e) => set('themeLabel', e.target.value)}
          />
          <div className="pd-color-meta">
            <span className="pd-color-label" title="Color of the theme label text">Label Color</span>
            <input className="pd-hex" value={theme.themeLabel} spellCheck={false} onChange={(e) => set('themeLabel', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Graph</div>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.classicGraph}
            onChange={(e) => set('classicGraph', e.target.checked)}
          />
          <span>Classic graph (line only, no fill)</span>
        </label>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.darkGraphGrid}
            onChange={(e) => set('darkGraphGrid', e.target.checked)}
          />
          <span>Dark grid &amp; labels</span>
        </label>
        <div className="pd-color">
          <input
            type="color"
            value={hexPattern.test(theme.chart) ? theme.chart : '#000000'}
            onChange={(e) => set('chart', e.target.value)}
          />
          <div className="pd-color-meta">
            <span className="pd-color-label" title="XP graph line, dots and fill">Graph Color</span>
            <input className="pd-hex" value={theme.chart} spellCheck={false} onChange={(e) => set('chart', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Typography</div>
        <label className="pd-field">
          <span>Font Family</span>
          <input
            list="pd-font-list"
            placeholder="Saira (default)"
            value={theme.font}
            onChange={(e) => onChange({ ...theme, font: e.target.value, googleFont: !isSystemFont(e.target.value) })}
          />
        </label>
        <datalist id="pd-font-list">
          {fontSuggestions.map((f) => <option key={f} value={f} />)}
        </datalist>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.googleFont}
            onChange={(e) => set('googleFont', e.target.checked)}
          />
          <span>Load from Google Fonts</span>
        </label>
        <label className="pd-field">
          <span>Font Weight</span>
          <input
            value={theme.fontWeight}
            onChange={(e) => set('fontWeight', e.target.value.replace(/[^0-9]/g, ''))}
          />
        </label>
        <div className="pd-note">500 = Medium, 700 = Bold</div>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Style</div>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.plainStatColors}
            onChange={(e) => set('plainStatColors', e.target.checked)}
          />
          <span>Stat numbers follow text color</span>
        </label>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.textShadows}
            onChange={(e) => set('textShadows', e.target.checked)}
          />
          <span>Text shadows</span>
        </label>
        <label className="pd-toggle">
          <input
            type="checkbox"
            checked={!!theme.panelShadows}
            onChange={(e) => set('panelShadows', e.target.checked)}
          />
          <span>Panel shadows</span>
        </label>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Colors</div>
        {themeFields.map(({ key, label, help }) => {
          const value = (theme[key] as string) || '';
          return (
            <div className="pd-color" key={key}>
              <input
                type="color"
                value={hexPattern.test(value) ? value : '#000000'}
                onChange={(e) => set(key, e.target.value)}
              />
              <div className="pd-color-meta">
                <span className="pd-color-label" title={help}>{label}</span>
                <input
                  className="pd-hex"
                  value={value}
                  spellCheck={false}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            </div>
          );
        })}
        <button className="pd-btn pd-btn-wide" onClick={() => onChange({ ...defaultTheme, banner: theme.banner })}>
          Reset Colors
        </button>
      </div>

      <div className="pd-section">
        <div className="pd-section-head">
          Export
          {copied && <span className="pd-copied">Copied {copied}</span>}
        </div>

        <div className="pd-export-label">
          <span>client/src/game/profileThemes.json</span>
          <button className="pd-btn" onClick={() => flashCopy('preset', presetJson)}>Copy</button>
        </div>
        <textarea className="pd-code" readOnly value={presetJson} rows={14} />

        <div className="pd-export-label">
          <span>cosmetics.json &rarr; "themes"</span>
          <button className="pd-btn" onClick={() => flashCopy('entry', cosmeticJson)}>Copy</button>
        </div>
        <textarea className="pd-code" readOnly value={cosmeticJson} rows={9} />
      </div>

      <div className="pd-section">
        <div className="pd-section-head">Import</div>
        <textarea
          className="pd-code"
          placeholder='Paste a theme preset here, e.g. "lava": { "banner": "lava.png", ... }'
          value={importText}
          spellCheck={false}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
        />
        {importError && <div className="pd-error">{importError}</div>}
        <button className="pd-btn pd-btn-wide" onClick={applyImport}>Load Preset</button>
      </div>
    </div>
  );
};

export default ProfileDesignerPanel;
