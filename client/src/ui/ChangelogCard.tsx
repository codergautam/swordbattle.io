import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(255, 255, 0)'}}>PvP Update</h2>
      <ul style={{color: '#33e0ff'}}>- New Blocking System!</ul>
      <ul style={{color: '#ffffff'}}>- Tons of PvP updates!</ul>
      <ul >-<span style={{color: '#ff6565'}}> TEMPORARILY removed</span> upgrades for fixing</ul>

      {/* <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a> */} {/* actual changelog page won't be updated for a while */}
    </span>
  )
}