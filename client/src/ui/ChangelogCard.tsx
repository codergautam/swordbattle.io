import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(255, 0, 0)'}}>Update Coming Soon</h2>
      <ul style={{color: '#ffffff'}}>Swordbattle's next huge update will be releasing soon, <span style={{color: '#ff7a7a'}}>no later than</span> June 27th. Game may go under maintenance for testing and debugging.</ul>

      {/* <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a> */} {/* actual changelog page won't be updated for a while */}
    </span>
  )
}