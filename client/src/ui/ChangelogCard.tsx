import { useEffect, useState } from 'react';
import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { fetchAnnouncements } from './announcements/announcementsClient';

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: (id: number) => void }) {
  const [updateId, setUpdateId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAnnouncements()
      .then((d) => { if (alive) setUpdateId(d.updateId); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <span className="newsCard">
      <h1 className="news-title">News and Updates</h1>
      <h2 className="news-sub">MAP UPDATE!</h2>
      <ul className="news-list">
        <li className="hot">New revamped map!</li>
        <li>Tons of new biomes!</li>
        <li>Better UI!</li>
        <li>Improved graphics</li>
      </ul>

      {updateId !== null && (
        <a className="changelogbutton" onClick={() => onViewChangelog && onViewChangelog(updateId)} style={{ cursor: 'pointer' }}>
          <FontAwesomeIcon icon={faClipboardList} /> View Changelog
        </a>
      )}
    </span>
  )
}
