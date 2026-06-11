import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
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

      {/* <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a> */} {/* actual changelog page won't be updated for a while */}
    </span>
  )
}