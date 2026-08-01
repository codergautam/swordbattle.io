import './ChangelogCard.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";

export default function ChangelogCard({ onViewChangelog }: { onViewChangelog?: () => void }) {
  return (
   <span><h1>News and Updates</h1><h2 style="color: rgb(255, 255, 0);">Update Coming Soon</h2><ul style="color: rgb(255, 255, 200);">The v3.0 update will be releasing on <span style="color: rgb(255, 200, 100);">August 4th. </span>We understand the annoyance of so many delays, but this date is the definite release date as the update only needs testing to be finished. Expect the game to undergo maintenance beforehand.</ul> </span>
  )
}
