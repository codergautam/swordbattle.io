import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faUser } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard() {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: '#ffffbb'}}>October Bugfixes</h2>
      <ul>- Balanced team-grinding</ul>
      <ul>- Leaderboard Changes</ul>
      <ul>- Balanced Evolutions</ul>
      <ul>- Other Bugfixes</ul>

      <a href="/changelog.html" target="_blank" rel="noopener noreferrer" className="changelogbutton">
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}