import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(43, 255, 0)'}}>Player Skins</h2>
      <ul style={{color: '#f1ff33'}}>- 2 NEW Player Skins</ul>
      <ul style={{color: '#c300ff'}}>- 6 NEW Skins & 3 NEW Ultimate Skins</ul>
      <ul style={{color: '#ff6565'}}>- Removed Parry Mechanic & Rebalanced Evolutions</ul>

      {/* <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a> */} {/* actual changelog page won't be updated for a while */}
    </span>
  )
}