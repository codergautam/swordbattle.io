import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faUser } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard() {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(255, 252, 59)'}}>OVERHAUL Update</h2>
      <ul>- Daily Rewards!</ul>
      <ul>- Respawn with coins!</ul>
      <ul>- HUGE graphics update!</ul>
      <ul>- Teaming is less powerful</ul>

      <a href="/changelog.html" target="_blank" rel="noopener noreferrer" className="changelogbutton">
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}