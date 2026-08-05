import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import api from '../../api';
import { announcementLink } from './announcementsClient';
import Markdown from './Markdown';
import { faIconNames, resolveFaIcon, useFaIcons } from './faIcons';
import './AnnouncementsAdminPage.scss';

type AdminAnnouncement = {
  id: number;
  title: string;
  body: string;
  icon: string;
  color: string;
  isUpdate: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type Draft = {
  id: number | null;
  title: string;
  body: string;
  icon: string;
  color: string;
  published: boolean;
};

const emptyDraft: Draft = { id: null, title: '', body: '', icon: 'book', color: '#4444ee', published: true };

function when(v: any): string {
  const t = new Date(v).getTime();
  if (!t) return '';
  return new Date(v).toLocaleString();
}

export default function AnnouncementsAdminPage() {
  useEffect(() => { document.title = 'SB Announcements'; }, []);
  const secret = useParams().secret || '';
  const iconsReady = useFaIcons();
  const [items, setItems] = useState<AdminAnnouncement[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const authHeaders = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true); setError(null);
    fetch(`${api.endpoint}/announcements/admin/list`, { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Unauthorized. Check the secret in the URL.' : `HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setItems(d.announcements || []); setLoading(false); })
      .catch((e) => { setError(String(e.message || e)); setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const iconResults = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    const names = faIconNames();
    const list = q ? names.filter((n) => n.includes(q)) : names;
    return list.slice(0, 168);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconSearch, iconsReady]);

  const startNew = () => { setDraft({ ...emptyDraft }); setSaveMsg(''); setIconPickerOpen(false); };
  const startEdit = (a: AdminAnnouncement) => {
    setDraft({ id: a.id, title: a.title, body: a.body, icon: a.icon, color: a.color, published: a.published });
    setSaveMsg('');
    setIconPickerOpen(false);
  };

  const applySaved = (a: AdminAnnouncement) => {
    setItems((list) => {
      if (!list) return list;
      const exists = list.some((x) => x.id === a.id);
      return exists ? list.map((x) => x.id === a.id ? a : x) : [a, ...list];
    });
  };

  const save = () => {
    if (!draft || busy) return;
    const colorOk = /^#[0-9a-fA-F]{6}$/.test(draft.color);
    if (!draft.title.trim()) { setSaveMsg('Title is required.'); return; }
    if (!colorOk) { setSaveMsg('Color must be a hex value like #4444ee.'); return; }
    setBusy(true); setSaveMsg('');
    const payload: any = {
      title: draft.title.trim(),
      body: draft.body,
      icon: draft.icon,
      color: draft.color,
      published: draft.published,
    };
    if (draft.id !== null) payload.id = draft.id;
    fetch(`${api.endpoint}/announcements/admin/save`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) })
      .then((r) => r.json())
      .then((d) => {
        setBusy(false);
        if (d && d.announcement) {
          applySaved(d.announcement);
          setDraft((cur) => cur ? { ...cur, id: d.announcement.id } : cur);
          setSaveMsg('Saved.');
        } else {
          const m: any = d && d.message;
          setSaveMsg((Array.isArray(m) ? m.join(', ') : m) || 'Save failed.');
        }
      })
      .catch(() => { setBusy(false); setSaveMsg('Save failed. Check your connection.'); });
  };

  const del = (a: AdminAnnouncement) => {
    if (busy) return;
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setBusy(true);
    fetch(`${api.endpoint}/announcements/admin/delete`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ id: a.id }) })
      .then((r) => r.json().catch(() => null).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        setBusy(false);
        if (ok) {
          setError(null);
          setItems((list) => list ? list.filter((x) => x.id !== a.id) : list);
          setDraft((cur) => cur && cur.id === a.id ? null : cur);
        } else {
          setError((d && d.message) || 'Delete failed. Reloading the list.');
          load();
        }
      })
      .catch(() => { setBusy(false); setError('Could not reach the server.'); });
  };

  const setActiveUpdate = (id: number | null) => {
    if (busy) return;
    setBusy(true);
    fetch(`${api.endpoint}/announcements/admin/set-update`, { method: 'POST', headers: authHeaders, body: JSON.stringify(id === null ? {} : { id }) })
      .then((r) => r.json().catch(() => null).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        setBusy(false);
        if (ok && d && d.announcements) {
          setError(null);
          setItems(d.announcements);
        } else {
          setError((d && d.message) || 'Could not set the active update. Reloading the list.');
          load();
        }
      })
      .catch(() => { setBusy(false); setError('Could not reach the server.'); });
  };

  const activeUpdate = items ? items.find((a) => a.isUpdate) : undefined;

  const copyLink = (id: number) => {
    const url = announcementLink(id);
    const done = () => { setCopiedId(id); window.setTimeout(() => setCopiedId((c) => c === id ? null : c), 1500); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copy this link:', url));
      } else {
        window.prompt('Copy this link:', url);
      }
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="announcements-admin">
      <h1>Swordbattle announcements</h1>

      <div className="aa-controls">
        <button className="aa-primary" onClick={startNew} disabled={busy}>New announcement</button>
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Reload'}</button>
        {items && (
          <span className="aa-meta">
            {items.length} total · {items.filter((a) => a.published).length} published ·
            {' '}active update: {activeUpdate ? `"${activeUpdate.title}"` : 'none'}
            {activeUpdate && <button className="aa-link" onClick={() => setActiveUpdate(null)} disabled={busy}>clear</button>}
          </span>
        )}
      </div>

      {error && <p className="aa-error">{error}</p>}
      {items && items.length === 0 && !draft && <p className="aa-empty">No announcements yet. Make one!</p>}

      {draft && (
        <div className="aa-editor">
          <h2>{draft.id === null ? 'New announcement' : `Editing #${draft.id}`}</h2>

          <div className="aa-fields">
            <label className="aa-field aa-grow">
              <span>Title</span>
              <input type="text" maxLength={140} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>

            <label className="aa-field">
              <span>Icon</span>
              <span className="aa-icon-input">
                <span className="aa-icon-preview" style={{ color: draft.color }}>
                  <FontAwesomeIcon icon={resolveFaIcon(draft.icon)} />
                </span>
                <input
                  type="text"
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  onFocus={() => setIconPickerOpen(true)}
                />
                <button type="button" onClick={() => setIconPickerOpen((v) => !v)}>{iconPickerOpen ? 'Close' : 'Browse'}</button>
              </span>
            </label>

            <label className="aa-field">
              <span>Accent color</span>
              <span className="aa-color-input">
                <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#4444ee'} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                <input type="text" maxLength={7} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
              </span>
            </label>

            <label className="aa-field aa-check">
              <input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
              <span>Published (visible in game)</span>
            </label>
          </div>

          {iconPickerOpen && (
            <div className="aa-icon-picker">
              <input
                type="text"
                placeholder="Search all Font Awesome solid icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
              />
              <div className="aa-icon-grid">
                {!iconsReady && <span className="aa-empty">Loading icons...</span>}
                {iconResults.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={n === draft.icon ? 'active' : ''}
                    title={n}
                    onClick={() => { setDraft({ ...draft, icon: n }); setIconPickerOpen(false); }}
                  >
                    <FontAwesomeIcon icon={resolveFaIcon(n)} />
                  </button>
                ))}
                {iconResults.length === 0 && <span className="aa-empty">No icons match that search.</span>}
              </div>
            </div>
          )}

          <p className="aa-hint">
            Body uses Discourse-style markdown: **bold**, # headings, lists, --- dividers, and raw
            {' '}&lt;details&gt;&lt;summary&gt;More info&lt;/summary&gt;...&lt;/details&gt; blocks (leave a blank line after the summary line).
            Single line breaks are kept, just like Discourse.
            To link another announcement, use its Copy link URL (?announcement=id) — in-game those open inside the modal.
          </p>

          <div className="aa-body-row">
            <textarea
              className="aa-body"
              placeholder="Write the announcement body in markdown..."
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="aa-preview">
              <div className="aa-preview-label">Preview</div>
              <Markdown text={draft.body} />
            </div>
          </div>

          {saveMsg && <p className={saveMsg === 'Saved.' ? 'aa-saved' : 'aa-error'}>{saveMsg}</p>}

          <div className="aa-actions">
            <button className="aa-primary" onClick={save} disabled={busy}>{busy ? 'Working...' : draft.id === null ? 'Create' : 'Save changes'}</button>
            <button onClick={() => setDraft(null)} disabled={busy}>Close editor</button>
          </div>
        </div>
      )}

      <div className="aa-list">
        {items && items.map((a) => (
          <div className={`aa-item ${a.published ? '' : 'draft'}`} key={a.id}>
            <span className="aa-item-ico" style={{ color: a.color }}>
              <FontAwesomeIcon icon={resolveFaIcon(a.icon)} />
            </span>
            <span className="aa-item-title">{a.title || '(untitled)'}</span>
            {!a.published && <span className="aa-chip hidden">hidden</span>}
            {a.isUpdate && <span className="aa-chip update">active update</span>}
            <span className="aa-item-time">created {when(a.createdAt)} · edited {when(a.updatedAt)}</span>
            <span className="aa-item-actions">
              <button onClick={() => copyLink(a.id)}>{copiedId === a.id ? 'Copied!' : 'Copy link'}</button>
              <button onClick={() => startEdit(a)} disabled={busy}>Edit</button>
              {a.isUpdate
                ? <button onClick={() => setActiveUpdate(null)} disabled={busy}>Unset update</button>
                : <button onClick={() => setActiveUpdate(a.id)} disabled={busy}>Set as update</button>}
              <button className="aa-danger" onClick={() => del(a)} disabled={busy}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
