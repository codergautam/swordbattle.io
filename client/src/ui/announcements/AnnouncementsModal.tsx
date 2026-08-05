import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faArrowLeft, faChevronRight, faLink, faCheck } from '@fortawesome/free-solid-svg-icons';
import Markdown from './Markdown';
import { resolveFaIcon, useFaIcons } from './faIcons';
import {
  AnnouncementFull, AnnouncementSummary, fetchAnnouncement, fetchAnnouncements, formatAnnouncementDate,
  markAnnouncementRead, announcementLink,
} from './announcementsClient';

import './AnnouncementsModal.scss';

function AnnouncementsModal({ initialId = null }: { initialId?: number | null }) {
  useFaIcons();
  const [items, setItems] = useState<AnnouncementSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stack, setStack] = useState<number[]>(() => initialId !== null && initialId !== undefined ? [initialId] : []);
  const [article, setArticle] = useState<AnnouncementFull | null>(null);
  const [articleFailed, setArticleFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copiedTimer = useRef<any>(null);

  const readingId = stack.length ? stack[stack.length - 1] : null;

  useEffect(() => {
    let alive = true;
    fetchAnnouncements()
      .then((d) => { if (alive) { setItems(d.announcements); setLoaded(true); } })
      .catch(() => { if (alive) { setFailed(true); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (readingId === null) { setArticle(null); setArticleFailed(false); return; }
    let alive = true;
    setArticle(null);
    setArticleFailed(false);
    setCopied(false);
    markAnnouncementRead(readingId);
    fetchAnnouncement(readingId)
      .then((a) => { if (alive) { if (a) setArticle(a); else setArticleFailed(true); } })
      .catch(() => { if (alive) setArticleFailed(true); });
    return () => { alive = false; };
  }, [readingId]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const openArticle = (id: number) => {
    setStack((s) => s.length && s[s.length - 1] === id ? s : [...s, id]);
  };

  const goBack = () => setStack((s) => s.slice(0, -1));

  const copyLink = (id: number) => {
    const url = announcementLink(id);
    const done = () => {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    };
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

  const summary = readingId !== null ? items.find((i) => i.id === readingId) : undefined;
  const shown = article || (summary ? { ...summary, body: '' } : null);

  return (
    <div className="announcements-modal">
      <div className="an-head">
        {readingId !== null ? (
          <button className="an-back" onClick={goBack} aria-label="Back">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        ) : (
          <span className="an-head-ico"><FontAwesomeIcon icon={faBookOpen} /></span>
        )}
        <h2>Announcements & Updates</h2>
      </div>

      <div className="an-scroll" ref={scrollRef}>
        {readingId === null ? (
          <div className="an-list">
            {!loaded && <p className="an-muted">Loading announcements...</p>}
            {loaded && failed && <p className="an-muted">Could not load announcements. Try again in a moment.</p>}
            {loaded && !failed && items.length === 0 && <p className="an-muted">Nothing here yet. Check back later!</p>}
            {items.map((a) => (
              <button key={a.id} className="an-row" onClick={() => openArticle(a.id)}>
                <span className="an-row-ico" style={{ color: a.color, backgroundColor: `${a.color}22` }}>
                  <FontAwesomeIcon icon={resolveFaIcon(a.icon)} />
                </span>
                <span className="an-row-main">
                  <span className="an-row-title">
                    <span className="an-row-title-text">{a.title}</span>
                    {a.isUpdate && <span className="an-chip">Update</span>}
                  </span>
                  <span className="an-row-date">{formatAnnouncementDate(a.createdAt)}</span>
                </span>
                <FontAwesomeIcon icon={faChevronRight} className="an-chev" />
              </button>
            ))}
          </div>
        ) : (
          <div className="an-article">
            {shown && (
              <div className="an-article-head" style={{ borderColor: shown.color }}>
                <span className="an-article-ico" style={{ color: shown.color, backgroundColor: `${shown.color}22` }}>
                  <FontAwesomeIcon icon={resolveFaIcon(shown.icon)} />
                </span>
                <div className="an-article-meta">
                  <h1>
                    <span className="an-article-title">{shown.title}</span>
                    {shown.isUpdate && <span className="an-chip">Update</span>}
                  </h1>
                  <span className="an-row-date">{formatAnnouncementDate(shown.createdAt)}</span>
                </div>
                <button className="an-copy" onClick={() => copyLink(shown.id)} title="Copy link to this announcement">
                  <FontAwesomeIcon icon={copied ? faCheck : faLink} /> {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            )}
            {article
              ? <Markdown text={article.body} className="an-md" onAnnouncementLink={openArticle} />
              : articleFailed
                ? <p className="an-muted">Could not load this announcement. Try again in a moment.</p>
                : <p className="an-muted">Loading...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

AnnouncementsModal.displayName = 'AnnouncementsModal';

export default AnnouncementsModal;
