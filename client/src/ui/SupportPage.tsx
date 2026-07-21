import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { categoryTitle } from './support/categories';
import './SupportPage.scss';

type Msg = { from: string; text: string; at: number; images?: string[] };
type AdminTicket = {
  id: number;
  created_at: string;
  updated_at: string;
  category: string;
  subject: string;
  account_id: number | null;
  username: string | null;
  client_id: string | null;
  ip: string | null;
  contact: string | null;
  details: Record<string, any>;
  messages: Msg[];
  status: string;
  unread_for_user: boolean;
  unread_for_admin: boolean;
  screenshotBanned?: boolean;
};

const statuses = ['all', 'open', 'answered', 'closed'];
const categories = ['all', 'password', 'lag', 'bug', 'other'];

function when(v: any): string {
  const t = new Date(v).getTime();
  if (!t) return '';
  return new Date(v).toLocaleString();
}

export default function SupportPage() {
  const secret = useParams().secret || '';
  const [status, setStatus] = useState('open');
  const [category, setCategory] = useState('all');
  const [data, setData] = useState<{ tickets: AdminTicket[]; openCount: number; unreadCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };

  const load = () => {
    setLoading(true); setError(null);
    fetch(`${api.endpoint}/support/admin/list?status=${status}&category=${category}&limit=300`, { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Unauthorized. Check the secret in the URL.' : `HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(String(e.message || e)); setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [status, category]);

  const expand = (t: AdminTicket) => {
    const next = openId === t.id ? null : t.id;
    setOpenId(next);
    if (next !== null && t.unread_for_admin) {
      fetch(`${api.endpoint}/support/admin/read`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ticketId: t.id }) })
        .then(() => setData((d) => d ? { ...d, tickets: d.tickets.map((x) => x.id === t.id ? { ...x, unread_for_admin: false } : x), unreadCount: Math.max(0, d.unreadCount - 1) } : d))
        .catch(() => {});
    }
  };

  const applyTicket = (t: AdminTicket) => {
    setData((d) => d ? { ...d, tickets: d.tickets.map((x) => x.id === t.id ? { ...t } : x) } : d);
  };

  const sendReply = (t: AdminTicket, newStatus?: string) => {
    const message = (drafts[t.id] || '').trim();
    if (!message || busy) return;
    setBusy(true);
    fetch(`${api.endpoint}/support/admin/reply`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ticketId: t.id, message, status: newStatus }) })
      .then((r) => r.json())
      .then((saved) => { applyTicket(saved); setDrafts((d) => ({ ...d, [t.id]: '' })); setBusy(false); })
      .catch(() => setBusy(false));
  };

  const unbanScreenshots = (t: AdminTicket) => {
    if (busy) return;
    setBusy(true);
    fetch(`${api.endpoint}/support/admin/unban-screenshots`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ticketId: t.id }) })
      .then((r) => r.json())
      .then(() => { applyTicket({ ...t, screenshotBanned: false }); setBusy(false); })
      .catch(() => setBusy(false));
  };

  const setStatusOf = (t: AdminTicket, s: string) => {
    if (busy) return;
    setBusy(true);
    fetch(`${api.endpoint}/support/admin/status`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ticketId: t.id, status: s }) })
      .then((r) => r.json())
      .then((saved) => { applyTicket(saved); setBusy(false); })
      .catch(() => setBusy(false));
  };

  return (
    <div className="support-admin">
      <h1>Swordbattle support</h1>

      <div className="sa-controls">
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'all' : categoryTitle(c)}</option>)}
          </select>
        </label>
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Reload'}</button>
        {data && <span className="sa-meta">{data.openCount} open · {data.unreadCount} unread</span>}
      </div>

      {error && <p className="sa-error">{error}</p>}
      {data && data.tickets.length === 0 && <p className="sa-empty">No tickets here.</p>}

      <div className="sa-list">
        {data && data.tickets.map((t) => (
          <div className={`sa-ticket ${t.unread_for_admin ? 'unread' : ''}`} key={t.id}>
            <button className="sa-ticket-head" onClick={() => expand(t)}>
              {t.unread_for_admin && <span className="sa-dot" />}
              <span className="sa-cat">{categoryTitle(t.category)}</span>
              <span className="sa-subject">{t.subject || '(no subject)'}</span>
              <span className={`sa-chip ${t.status}`}>{t.status}</span>
              <span className="sa-who">{t.username ? `@${t.username}` : 'anonymous'}</span>
              <span className="sa-time">{when(t.updated_at)}</span>
            </button>

            {openId === t.id && (
              <div className="sa-body">
                <div className="sa-idbar">
                  <span><b>Ticket</b> #{t.id}</span>
                  <span><b>Account</b> {t.account_id ? `#${t.account_id} @${t.username}` : 'not linked'}</span>
                  <span><b>Client id</b> {t.client_id || '-'}</span>
                  <span><b>IP</b> {t.ip || '-'}</span>
                  <span><b>Contact</b> {t.contact || '-'}</span>
                  <span><b>Created</b> {when(t.created_at)}</span>
                  {t.screenshotBanned && (
                    <span className="sa-ss-ban">
                      <b>Screenshots</b> banned
                      <button type="button" onClick={() => unbanScreenshots(t)} disabled={busy}>Unban</button>
                    </span>
                  )}
                </div>

                {t.details && Object.keys(t.details).length > 0 && (
                  <div className="sa-details">
                    {Object.entries(t.details).map(([k, v]) => (
                      <div className="sa-detail" key={k}><span className="sa-dk">{k}</span><span className="sa-dv">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
                    ))}
                  </div>
                )}

                <div className="sa-thread">
                  {t.messages.map((m, i) => (
                    <div className={`sa-msg ${m.from}`} key={i}>
                      <div className="sa-msg-from">{m.from === 'staff' ? 'Staff' : (t.username ? `@${t.username}` : 'User')}</div>
                      {m.text && <div className="sa-msg-text">{m.text}</div>}
                      {m.images && m.images.length > 0 && (
                        <div className="sa-msg-imgs">
                          {m.images.map((src, j) => <img key={j} src={src} alt="attachment" onClick={() => setLightbox(src)} />)}
                        </div>
                      )}
                      <div className="sa-msg-time">{when(m.at)}</div>
                    </div>
                  ))}
                </div>

                <textarea
                  className="sa-reply"
                  placeholder="Write a reply..."
                  value={drafts[t.id] || ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                />
                <div className="sa-actions">
                  <button className="sa-send" onClick={() => sendReply(t, 'answered')} disabled={busy || !(drafts[t.id] || '').trim()}>Send reply</button>
                  <button className="sa-send close" onClick={() => sendReply(t, 'closed')} disabled={busy || !(drafts[t.id] || '').trim()}>Reply and close</button>
                  <span className="sa-sep" />
                  <button onClick={() => setStatusOf(t, 'open')} disabled={busy}>Mark open</button>
                  <button onClick={() => setStatusOf(t, 'closed')} disabled={busy}>Close</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="sa-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" />
        </div>
      )}
    </div>
  );
}
