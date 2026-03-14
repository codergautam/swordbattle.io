import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
    <span>
      <h1>News and Updates</h1>
      <h2 style={{color: 'rgb(59, 252, 255)'}}>Pi Day Sale!</h2>
      <ul>- 8 exclusive Pi Day event skins!</ul>
      <ul>- Pi Guy and Pi Man skins for 50% off!</ul>
      <ul>- Sale lasts until 3/17!</ul>

      <a className="changelogbutton" onClick={onViewChangelog} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faClipboardList} /> View Changelog
      </a>
    </span>
  )
}