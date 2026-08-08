import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import './BotsPage.scss';

type BotConfig = {
  support: { notifyStaffReply: boolean; notifyClosed: boolean; notifyStatusChange: boolean };
  leaderboard: { topN: number; singlePush: boolean; dailyEnabled: boolean; dailyXpThreshold: number };
};

type GuildEmoji = { name: string; id: string; animated: boolean; tag: string };

type QueuedMessage = {
  id: number;
  created_at: string;
  bot: string;
  title: string;
  body: string;
  color: string | null;
  ping: boolean;
  reactions: string[];
  status: string;
  sent_at: string | null;
  error: string | null;
};

const topNOptions = [3, 5, 10, 15, 20, 25];

function when(v: any): string {
  const t = new Date(v).getTime();
  if (!t) return '';
  return new Date(v).toLocaleString();
}

export default function BotsPage() {
  useEffect(() => { document.title = 'SB Bots'; }, []);
  const secret = useParams().secret || '';
  const authHeaders = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };

  const [config, setConfig] = useState<BotConfig | null>(null);
  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [messages, setMessages] = useState<QueuedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState('#ffd700');
  const [ping, setPing] = useState(false);
  const [reactions, setReactions] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<'body' | 'reactions'>('body');

  const loadAll = () => {
    setError(null);
    fetch(`${api.endpoint}/bots/config`, { headers: authHeaders })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Unauthorized. Check the secret in the URL.' : `HTTP ${r.status}`);
        return r.json();
      })
      .then(setConfig)
      .catch((e) => setError(String(e.message || e)));
    fetch(`${api.endpoint}/bots/emojis`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEmojis(Array.isArray(d) ? d : []))
      .catch(() => {});
    loadMessages();
  };

  const loadMessages = () => {
    fetch(`${api.endpoint}/bots/messages?limit=15`, { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

  const save = (next: BotConfig) => {
    setConfig(next);
    setBusy(true);
    fetch(`${api.endpoint}/bots/config`, { method: 'POST', headers: authHeaders, body: JSON.stringify(next) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((saved) => { setConfig(saved); setSavedAt(Date.now()); setBusy(false); })
      .catch((e) => { setError(String(e.message || e)); setBusy(false); });
  };

  const setSupport = (key: keyof BotConfig['support'], value: boolean) => {
    if (!config) return;
    save({ ...config, support: { ...config.support, [key]: value } });
  };

  const setLeaderboard = (key: keyof BotConfig['leaderboard'], value: any) => {
    if (!config) return;
    save({ ...config, leaderboard: { ...config.leaderboard, [key]: value } });
  };

  const insertEmoji = (tag: string) => {
    if (emojiTarget === 'reactions') {
      setReactions((r) => (r ? `${r.replace(/\s+$/, '')} ${tag}` : tag));
      return;
    }
    const el = bodyRef.current;
    if (!el) { setBody((b) => b + tag); return; }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + tag + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    });
  };

  const sendMessage = () => {
    if (busy || (!title.trim() && !body.trim())) return;
    setBusy(true);
    const payload = {
      bot: 'leaderboard',
      title: title.trim(),
      body,
      color,
      ping,
      reactions: reactions.split(/\s+/).map((s) => s.trim()).filter(Boolean),
    };
    fetch(`${api.endpoint}/bots/messages`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        setTitle(''); setBody(''); setReactions(''); setPing(false);
        setBusy(false);
        loadMessages();
      })
      .catch((e) => { setError(String(e.message || e)); setBusy(false); });
  };

  const deleteMessage = (id: number) => {
    fetch(`${api.endpoint}/bots/messages/delete`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ id }) })
      .then(() => loadMessages())
      .catch(() => {});
  };

  if (error && !config) return <div className="bots-admin"><h1>Swordbattle bots</h1><p className="bp-error">{error}</p></div>;
  if (!config) return <div className="bots-admin"><h1>Swordbattle bots</h1><p className="bp-muted">Loading…</p></div>;

  return (
    <div className="bots-admin">
      <div className="bp-head">
        <h1>Swordbattle bots</h1>
        <div className="bp-headright">
          {savedAt > 0 && <span className="bp-saved">Saved</span>}
          <button onClick={loadAll} disabled={busy}>Reload</button>
        </div>
      </div>
      {error && <p className="bp-error">{error}</p>}

      <section className="bp-card">
        <h2>Support bot</h2>
        <label className="bp-toggle">
          <input type="checkbox" checked={config.support.notifyStaffReply} onChange={(e) => setSupport('notifyStaffReply', e.target.checked)} />
          <span><b>Staff reply notifications</b>: post when a staff member replies to a ticket, including what they wrote</span>
        </label>
        <label className="bp-toggle">
          <input type="checkbox" checked={config.support.notifyClosed} onChange={(e) => setSupport('notifyClosed', e.target.checked)} />
          <span><b>Ticket closed notifications</b>: post when a ticket is marked closed</span>
        </label>
        <label className="bp-toggle">
          <input type="checkbox" checked={config.support.notifyStatusChange} onChange={(e) => setSupport('notifyStatusChange', e.target.checked)} />
          <span><b>Other status changes</b>: post when a ticket is reopened or marked answered without a reply</span>
        </label>
      </section>

      <section className="bp-card">
        <h2>Leaderboard bot</h2>

        <div className="bp-row">
          <label className="bp-field">
            <span>Tracked positions</span>
            <select value={config.leaderboard.topN} onChange={(e) => setLeaderboard('topN', parseInt(e.target.value, 10))}>
              {topNOptions.map((n) => <option key={n} value={n}>Top {n}</option>)}
            </select>
          </label>
        </div>

        <label className="bp-toggle">
          <input type="checkbox" checked={config.leaderboard.singlePush} onChange={(e) => setLeaderboard('singlePush', e.target.checked)} />
          <span><b>Single push mode</b>: in "Pushed down" and "Fell out", only show the highest-ranked player affected plus a count of the rest.</span>
        </label>

        <label className="bp-toggle">
          <input type="checkbox" checked={config.leaderboard.dailyEnabled} onChange={(e) => setLeaderboard('dailyEnabled', e.target.checked)} />
          <span><b>Daily leaderboard</b>: post the day's top XP earners just before the day ends (23:55 UTC).</span>
        </label>

        <div className="bp-row">
          <label className="bp-field">
            <span>Daily ping threshold (XP)</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={config.leaderboard.dailyXpThreshold}
              onChange={(e) => setLeaderboard('dailyXpThreshold', parseInt(e.target.value, 10) || 0)}
              disabled={!config.leaderboard.dailyEnabled}
            />
          </label>
        </div>
      </section>

      <section className="bp-card">
        <h2>Send a custom message</h2>
        <p className="bp-muted">Posted as an embed by the bot</p>

        <label className="bp-field">
          <span>Title</span>
          <input type="text" maxLength={256} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" />
        </label>

        <label className="bp-field">
          <span>Message</span>
          <textarea
            ref={bodyRef}
            rows={5}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setEmojiTarget('body')}
            placeholder="Supports Discord markdown"
          />
        </label>

        <div className="bp-row">
          <label className="bp-field bp-narrow">
            <span>Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="bp-toggle bp-inlinetoggle">
            <input type="checkbox" checked={ping} onChange={(e) => setPing(e.target.checked)} />
            <span>Ping the leaderboard role</span>
          </label>
        </div>

        <label className="bp-field">
          <span>Reactions to add (space separated)</span>
          <input
            type="text"
            value={reactions}
            onChange={(e) => setReactions(e.target.value)}
            onFocus={() => setEmojiTarget('reactions')}
            placeholder={'<:sb_above:123> <:sb_below:456> 👍'}
          />
        </label>

        {emojis.length > 0 && (
          <div className="bp-emojis">
            <div className="bp-emojis-head">
              Click to insert into {emojiTarget === 'body' ? 'the message' : 'reactions'}
            </div>
            <div className="bp-emojis-list">
              {emojis.map((e) => (
                <button key={e.id} type="button" className="bp-emoji" title={e.tag} onClick={() => insertEmoji(e.tag)}>
                  :{e.name}:
                </button>
              ))}
            </div>
          </div>
        )}
        {emojis.length === 0 && <p className="bp-muted">Server emoji list appears once the leaderboard bot has connected at least once.</p>}

        <div className="bp-actions">
          <button className="bp-send" onClick={sendMessage} disabled={busy || (!title.trim() && !body.trim())}>Send message</button>
        </div>
      </section>

      <section className="bp-card">
        <h2>Recent custom messages</h2>
        {messages.length === 0 && <p className="bp-muted">Nothing sent yet.</p>}
        <div className="bp-msglist">
          {messages.map((m) => (
            <div className={`bp-msg ${m.status}`} key={m.id}>
              <div className="bp-msg-head">
                <span className={`bp-chip ${m.status}`}>{m.status}</span>
                <b>{m.title || '(no title)'}</b>
                {m.ping && <span className="bp-chip ping">pinged</span>}
                <span className="bp-msg-time">{when(m.sent_at || m.created_at)}</span>
                {m.status === 'pending' && <button className="bp-del" onClick={() => deleteMessage(m.id)}>Cancel</button>}
              </div>
              {m.body && <div className="bp-msg-body">{m.body}</div>}
              {m.reactions && m.reactions.length > 0 && <div className="bp-msg-react">Reactions: {m.reactions.join(' ')}</div>}
              {m.error && <div className="bp-msg-error">{m.error}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
