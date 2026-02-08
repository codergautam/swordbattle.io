import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faUser } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard() {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(255, 173, 173)'}}>February Skin Update</h2>
      <ul style={{color: 'rgb(255, 252, 59)'}}>- Note: Snowtokens will be converted to other tokens for later events</ul>
      <ul>- 22 new skins!</ul>
      <ul>- New trees!</ul>
      <ul>- Bigger updates coming soon!</ul>

      <a href="/changelog.html" target="_blank" rel="noopener noreferrer" className="changelogbutton">
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}