import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { fetchUnreadCount, SUPPORT_REFRESH_EVENT } from './supportClient';

import './SupportButton.scss';

function SupportButton({ account, onOpen }: { account: any; onOpen: () => void }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => fetchUnreadCount()
      .then((n) => { if (alive) setUnread(n); })
      .catch(() => {});

    load();
    const onRefresh = () => load();
    window.addEventListener(SUPPORT_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);
    const iv = window.setInterval(load, 60000);

    return () => {
      alive = false;
      window.clearInterval(iv);
      window.removeEventListener(SUPPORT_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [account?.secret]);

  return (
    <div id="supportButton" className="altLink imgPanel" style={{ pointerEvents: 'auto' }} onClick={onOpen} title="Support">
      <FontAwesomeIcon icon={faHeadset} className="ui-icon" />
      {unread > 0 && <span className="support-badge">{unread > 9 ? '9+' : unread}</span>}
    </div>
  );
}

export default SupportButton;
