import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeadset, faPaperPlane, faArrowLeft, faInbox, faCircleCheck, faChevronRight, faUserCheck, faImage, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { SUPPORT_CATEGORIES, SupportCategory, categoryTitle } from './categories';
import {
  Ticket, submitTicket, fetchMyTickets, replyToTicket, markTicketSeen, deviceSnapshot, pingSupportRefresh,
  compressImage, MAX_TICKET_IMAGES,
} from './supportClient';

import './SupportModal.scss';

type View = 'home' | 'form' | 'list' | 'thread';

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function statusLabel(s: string): string {
  if (s === 'answered') return 'Replied';
  if (s === 'closed') return 'Closed';
  return 'Open';
}

function lastMessage(t: Ticket): string {
  const m = t.messages && t.messages.length ? t.messages[t.messages.length - 1] : null;
  if (!m) return '';
  const who = m.from === 'staff' ? 'Staff: ' : 'You: ';
  if (m.text) return who + m.text;
  if (m.images && m.images.length) return who + 'sent a screenshot';
  return who;
}

function SupportModal({ account }: any) {
  const loggedIn = !!(account && account.isLoggedIn);

  const [view, setView] = useState<View>('home');
  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [formError, setFormError] = useState('');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [screenshotsBlocked, setScreenshotsBlocked] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const formFileRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  const unreadCount = useMemo(() => tickets.filter((t) => t.unread).length, [tickets]);

  const refreshTickets = () => {
    fetchMyTickets().then((d) => {
      setTickets(d.tickets);
      setScreenshotsBlocked(d.screenshotsBlocked);
      setTicketsLoaded(true);
    }).catch(() => setTicketsLoaded(true));
  };

  useEffect(() => { refreshTickets(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (view === 'thread' && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [view, activeTicket]);

  const openCategory = (cat: SupportCategory) => {
    const init: Record<string, string> = {};
    cat.fields.forEach((f) => { init[f.key] = ''; });
    if (loggedIn) {
      if (cat.fields.some((f) => f.key === 'username')) init.username = account.username || '';
      if (cat.fields.some((f) => f.key === 'email')) init.email = account.email || '';
    }
    setValues(init);
    setImages([]);
    setCategory(cat);
    setSentOk(false);
    setFormError('');
    setView('form');
  };

  const addFiles = async (files: FileList | null, existing: string[], setter: (v: string[]) => void) => {
    if (!files || !files.length) return;
    const room = MAX_TICKET_IMAGES - existing.length;
    if (room <= 0) return;
    setUploading(true);
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      const c = await compressImage(f);
      if (c) out.push(c);
    }
    setter([...existing, ...out]);
    setUploading(false);
  };

  const requiredMissing = (): boolean => {
    if (!category) return true;
    return category.fields.some((f) => f.required && !(values[f.key] || '').trim());
  };

  const buildPayload = () => {
    if (!category) return null;
    const bodyField = category.fields.find((f) => f.body);
    const bodyText = (bodyField ? values[bodyField.key] : '').trim();

    const details: Record<string, string> = {};
    category.fields.forEach((f) => {
      if (f.body) return;
      const v = (values[f.key] || '').trim();
      if (v) details[f.label] = v;
    });

    if (category.attachDevice) {
      const d = deviceSnapshot();
      if (d.userAgent) details['Browser'] = d.userAgent;
      if (d.platform) details['Platform'] = d.platform;
      details['Screen'] = `${d.screen} (view ${d.viewport}, dpr ${d.dpr})`;
      if (d.connection) details['Connection'] = d.connection;
      if (d.cores) details['CPU cores'] = String(d.cores);
      if (d.deviceMemory) details['Memory (GB)'] = String(d.deviceMemory);
    }

    let message = bodyText;
    if (!message) {
      message = category.fields
        .filter((f) => !f.body)
        .map((f) => { const v = (values[f.key] || '').trim(); return v ? `${f.label}: ${v}` : null; })
        .filter(Boolean)
        .join('\n') || (images.length ? 'Screenshot attached.' : 'No extra details provided.');
    }

    let subject = category.title;
    if (category.id === 'other' && (values.subject || '').trim()) subject = values.subject.trim();
    else if ((values.username || '').trim()) subject = `${category.title}: ${values.username.trim()}`;

    return { category: category.id, subject, message, details, images: screenshotsBlocked ? [] : images };
  };

  const onSubmit = () => {
    if (submitting) return;
    if (requiredMissing()) { setFormError('Please fill in the fields marked required.'); return; }
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    setFormError('');
    submitTicket(payload).then((res) => {
      setSubmitting(false);
      if (res && res.ticket) {
        setSentOk(true);
        setTickets((prev) => [res.ticket as Ticket, ...prev]);
        pingSupportRefresh();
      } else {
        const m: any = res && res.message;
        setFormError((Array.isArray(m) ? m.join('\n') : m) || 'Something went wrong sending that. Try again in a moment.');
        refreshTickets();
      }
    }).catch(() => {
      setSubmitting(false);
      setFormError('Could not reach the server. Check your connection and try again.');
    });
  };

  const openTicket = (t: Ticket) => {
    setReplyText('');
    setReplyImages([]);
    setActiveTicket(t.unread ? { ...t, unread: false } : t);
    setView('thread');
    if (t.unread) {
      setTickets((prev) => prev.map((x) => x.id === t.id ? { ...x, unread: false } : x));
      markTicketSeen(t.id).then(() => pingSupportRefresh()).catch(() => {});
    }
  };

  const onReply = () => {
    if (!activeTicket || replySending) return;
    const text = replyText.trim();
    const outImages = screenshotsBlocked ? [] : replyImages;
    if (!text && outImages.length === 0) return;
    setReplySending(true);
    setReplyError('');
    replyToTicket(activeTicket.id, text || '(screenshot)', outImages).then((res) => {
      setReplySending(false);
      if (res && res.ticket) {
        setActiveTicket(res.ticket);
        setTickets((prev) => prev.map((x) => x.id === res.ticket!.id ? res.ticket! : x));
        setReplyText('');
        setReplyImages([]);
        pingSupportRefresh();
      } else {
        const m: any = res && res.message;
        setReplyError((Array.isArray(m) ? m.join('\n') : m) || 'Could not send that. Try again in a moment.');
        refreshTickets();
      }
    }).catch(() => { setReplySending(false); setReplyError('Could not reach the server. Try again in a moment.'); });
  };

  const back = () => {
    if (view === 'thread') { setView('list'); setActiveTicket(null); }
    else setView('home');
  };

  const title = view === 'form' && category ? category.title
    : view === 'list' ? 'My messages'
    : view === 'thread' && activeTicket ? categoryTitle(activeTicket.category)
    : 'Support';

  const accountLine = loggedIn ? (
    <div className="sp-linkline sp-linked">
      <FontAwesomeIcon icon={faUserCheck} />
      <span>Sending as <b>{account.username}</b>. This is tied to your account, so you will see replies anywhere you log in.</span>
    </div>
  ) : (
    <div className="sp-linkline">
      <span>You are not logged in, so we will keep replies here under <b>My messages</b> on this device. Log in first if you want this tied to your account.</span>
    </div>
  );

  const thumbs = (list: string[], setter: (v: string[]) => void) => (
    list.length > 0 && (
      <div className="sp-thumbs">
        {list.map((src, i) => (
          <div className="sp-thumb" key={i}>
            <img src={src} alt="attachment" onClick={() => setLightbox(src)} />
            <button type="button" className="sp-thumb-x" onClick={() => setter(list.filter((_, j) => j !== i))} aria-label="Remove">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        ))}
      </div>
    )
  );

  const homeView = (
    <div className="sp-home">
      <p className="sp-lead">What do you need a hand with?</p>
      <div className="sp-cat-grid">
        {SUPPORT_CATEGORIES.map((c) => (
          <button key={c.id} className="sp-cat" onClick={() => openCategory(c)}>
            <span className="sp-cat-ico"><FontAwesomeIcon icon={c.icon} /></span>
            <span className="sp-cat-title">{c.title}</span>
          </button>
        ))}
      </div>

      <button className="sp-inbox-row" onClick={() => { setView('list'); refreshTickets(); }}>
        <FontAwesomeIcon icon={faInbox} />
        <span className="sp-inbox-label">My messages</span>
        {unreadCount > 0 && <span className="sp-badge">{unreadCount}</span>}
        <FontAwesomeIcon icon={faChevronRight} className="sp-chev" />
      </button>
    </div>
  );

  const formView = category && (sentOk ? (
    <div className="sp-sent">
      <div className="sp-sent-ico"><FontAwesomeIcon icon={faCircleCheck} /></div>
      <h3>Got it, thank you</h3>
      <p>Your message is in and we read every one. When we reply it shows up under My messages.</p>
      <div className="sp-sent-btns">
        <button className="sp-btn ghost" onClick={() => { setView('list'); refreshTickets(); }}>Go to My messages</button>
        <button className="sp-btn" onClick={() => setView('home')}>Done</button>
      </div>
    </div>
  ) : (
    <div className="sp-form">
      <p className="sp-blurb">{category.blurb}</p>
      <p className="sp-tip">Include as much as you possibly can, even small details can go a long way when trying to fix the issue.</p>

      {category.fields.map((f) => (
        <div className="sp-field" key={f.key}>
          <label>{f.label}{f.required && <span className="sp-req"> *</span>}</label>
          {f.type === 'textarea' ? (
            <textarea
              placeholder={f.placeholder || ''}
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ) : f.type === 'select' ? (
            <select
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            >
              <option value="">Pick one</option>
              {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type="text"
              placeholder={f.placeholder || ''}
              value={values[f.key] || ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <div className="sp-field">
        <label>Screenshots (optional)</label>
        {screenshotsBlocked ? (
          <p className="sp-muted">Screenshots are turned off for your account, but you can still send your message as text.</p>
        ) : (
          <>
            <input
              ref={formFileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { addFiles(e.target.files, images, setImages); e.target.value = ''; }}
            />
            <button
              type="button"
              className="sp-attach"
              onClick={() => formFileRef.current?.click()}
              disabled={uploading || images.length >= MAX_TICKET_IMAGES}
            >
              <FontAwesomeIcon icon={faImage} /> {uploading ? 'Adding...' : images.length ? `Add another (${images.length}/${MAX_TICKET_IMAGES})` : 'Attach a screenshot'}
            </button>
            {thumbs(images, setImages)}
          </>
        )}
      </div>

      {accountLine}

      {formError && <div className="sp-error">{formError}</div>}

      <button className="sp-btn sp-send" onClick={onSubmit} disabled={submitting || requiredMissing()}>
        <FontAwesomeIcon icon={faPaperPlane} /> {submitting ? 'Sending...' : 'Send'}
      </button>
    </div>
  ));

  const listView = (
    <div className="sp-list">
      {!ticketsLoaded && <p className="sp-muted">Loading your messages...</p>}
      {ticketsLoaded && tickets.length === 0 && (
        <div className="sp-empty">
          <FontAwesomeIcon icon={faInbox} />
          <p>Nothing here yet. When you send us something it will be here, along with our replies</p>
          <button className="sp-btn" onClick={() => setView('home')}>Send a message</button>
        </div>
      )}
      {tickets.map((t) => (
        <button key={t.id} className={`sp-ticket ${t.unread ? 'unread' : ''}`} onClick={() => openTicket(t)}>
          <div className="sp-ticket-top">
            <span className="sp-ticket-cat">{categoryTitle(t.category)}</span>
            <span className={`sp-chip ${t.status}`}>{statusLabel(t.status)}</span>
            {t.unread && <span className="sp-dot" />}
          </div>
          <div className="sp-ticket-preview">{lastMessage(t)}</div>
          <div className="sp-ticket-time">{timeAgo(t.updatedAt)}</div>
        </button>
      ))}
    </div>
  );

  const threadView = activeTicket && (
    <div className="sp-thread-wrap">
      <div className="sp-thread-head">
        <span className="sp-ticket-cat">{categoryTitle(activeTicket.category)}</span>
        <span className={`sp-chip ${activeTicket.status}`}>{statusLabel(activeTicket.status)}</span>
      </div>

      {Object.keys(activeTicket.details || {}).length > 0 && (
        <div className="sp-details">
          {Object.entries(activeTicket.details).map(([k, v]) => (
            <div className="sp-detail" key={k}><span className="sp-detail-k">{k}</span><span className="sp-detail-v">{String(v)}</span></div>
          ))}
        </div>
      )}

      <div className="sp-thread" ref={threadRef}>
        {activeTicket.messages.map((m, i) => (
          <div key={i} className={`sp-msg ${m.from === 'staff' ? 'staff' : 'user'}`}>
            <div className="sp-msg-from">{m.from === 'staff' ? 'Staff' : 'You'}</div>
            {m.text && <div className="sp-msg-text">{m.text}</div>}
            {m.images && m.images.length > 0 && (
              <div className="sp-msg-imgs">
                {m.images.map((src, j) => <img key={j} src={src} alt="attachment" onClick={() => setLightbox(src)} />)}
              </div>
            )}
            <div className="sp-msg-time">{timeAgo(new Date(m.at).toISOString())}</div>
          </div>
        ))}
      </div>

      {activeTicket.status === 'closed' ? (
        <p className="sp-muted sp-closed">This one is marked closed. Start a new message if something else comes up.</p>
      ) : (
        <div className="sp-reply">
          <textarea
            placeholder="Add more or reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          {!screenshotsBlocked && thumbs(replyImages, setReplyImages)}
          {replyError && <div className="sp-error">{replyError}</div>}
          <div className="sp-reply-actions">
            {screenshotsBlocked ? (
              <span className="sp-muted">Screenshots off</span>
            ) : (
              <>
                <input
                  ref={replyFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { addFiles(e.target.files, replyImages, setReplyImages); e.target.value = ''; }}
                />
                <button
                  type="button"
                  className="sp-attach small"
                  onClick={() => replyFileRef.current?.click()}
                  disabled={uploading || replyImages.length >= MAX_TICKET_IMAGES}
                >
                  <FontAwesomeIcon icon={faImage} /> {uploading ? 'Adding...' : 'Screenshot'}
                </button>
              </>
            )}
            <button className="sp-btn sp-send" onClick={onReply} disabled={replySending || (!replyText.trim() && (screenshotsBlocked || replyImages.length === 0))}>
              <FontAwesomeIcon icon={faPaperPlane} /> {replySending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="support-modal">
      <div className="sp-head">
        {view !== 'home'
          ? <button className="sp-back" onClick={back} aria-label="Back"><FontAwesomeIcon icon={faArrowLeft} /></button>
          : <span className="sp-head-ico"><FontAwesomeIcon icon={faHeadset} /></span>}
        <h2>{title}</h2>
        {view === 'home' && unreadCount > 0 && (
          <button className="sp-head-badge" onClick={() => { setView('list'); refreshTickets(); }}>{unreadCount} new</button>
        )}
      </div>

      {view === 'home' && homeView}
      {view === 'form' && formView}
      {view === 'list' && listView}
      {view === 'thread' && threadView}

      {lightbox && createPortal(
        <div className="sp-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="attachment" />
        </div>,
        document.body,
      )}
    </div>
  );
}

export default SupportModal;
