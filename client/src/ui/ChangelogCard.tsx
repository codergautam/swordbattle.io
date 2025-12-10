import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList, faUser } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard() {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: '#75bcffff'}}>Winter Update</h2>
      <ul>- 10 new winter evolutions!</ul>
      <ul>- Winter Event Skins & Skin Sale</ul>
      <ul>- 2 new monthly evolutions</ul>
      <ul>- Winter graphics & improvements</ul>
      <ul>- New Currency: Snowtokens</ul>

      <a href="/changelog.html" target="_blank" rel="noopener noreferrer" className="changelogbutton">
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}