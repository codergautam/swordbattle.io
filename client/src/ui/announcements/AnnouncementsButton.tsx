import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { loadFaIcons } from './faIcons';
import { fetchUnreadAnnouncementCount, announcementsRefreshEvent } from './announcementsClient';

import './AnnouncementsButton.scss';

function AnnouncementsButton({ onOpen }: { onOpen: () => void }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => fetchUnreadAnnouncementCount()
      .then((n) => { if (alive) setUnread(n); })
      .catch(() => {});

    load();
    const onRefresh = () => load();
    window.addEventListener(announcementsRefreshEvent, onRefresh);
    window.addEventListener('focus', onRefresh);
    const iv = window.setInterval(load, 60000);

    return () => {
      alive = false;
      window.clearInterval(iv);
      window.removeEventListener(announcementsRefreshEvent, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, []);

  return (
    <div id="announcementsButton" className="altLink imgPanel" style={{ pointerEvents: 'auto' }} onClick={onOpen} onMouseEnter={() => loadFaIcons()} title="Announcements & Updates">
      <FontAwesomeIcon icon={faBookOpen} className="ui-icon" />
      {unread > 0 && <span className="announcements-badge">{unread > 9 ? '9+' : unread}</span>}
    </div>
  );
}

export default AnnouncementsButton;
