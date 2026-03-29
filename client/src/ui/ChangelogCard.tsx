import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(9, 255, 0)'}}>March Update</h2>
      <ul style={{color: 'rgb(255, 230, 0)'}}>- REVAMPED upgrades system!</ul>
      <ul>- New healthbars!</ul>
      <ul>- Other bugfixes and improvements</ul>

      {/* <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a> */} {/* actual changelog page won't be updated for a while */}
    </span>
  )
}