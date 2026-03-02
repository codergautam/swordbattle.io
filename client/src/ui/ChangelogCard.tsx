import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(255, 252, 59)'}}>OVERHAUL Update</h2>
      <ul>- Daily Rewards!</ul>
      <ul>- Respawn with coins!</ul>
      <ul>- HUGE graphics update!</ul>
      <ul>- Teaming is less powerful</ul>

      <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}