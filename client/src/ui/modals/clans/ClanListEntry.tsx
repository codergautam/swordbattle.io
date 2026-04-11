import { ClanSummary } from '../../../redux/account/slice';
import { numberWithCommas } from '../../../helpers';
import { ClanStatus, statusLabels } from './constants';
import ClanEmblem from './ClanEmblem';

interface ClanListEntryProps {
  clan: ClanSummary;
  xpRank?: number;
  masteryRank?: number;
  onClick?: () => void;
  showJoinButton?: boolean;
  joinDisabled?: boolean;
  joinLabel?: string;
  onJoinClick?: () => void;
}

export default function ClanListEntry({
  clan, xpRank, masteryRank, onClick,
  showJoinButton, joinDisabled, joinLabel, onJoinClick,
}: ClanListEntryProps) {
  return (
    <div className="clan-list-entry" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <ClanEmblem frameId={clan.frameId} iconId={clan.iconId} frameColor={clan.frameColor} iconColor={clan.iconColor} size={72} />

      <div className="clan-list-entry__main">
        <div className="clan-list-entry__top">
          <span className="clan-list-entry__name">
            <span className="clan-list-entry__tag">[{clan.tag}]</span> {clan.name}
          </span>
          <span className="clan-list-entry__stats">
            <span title="Clan XP">{numberWithCommas(clan.clanXp)} XP</span>
            {xpRank !== undefined && xpRank <= 25 && (
              <span className="clan-list-entry__rank"> (#{xpRank})</span>
            )}
            {masteryRank !== undefined && masteryRank <= 25 && (
              <span className="clan-list-entry__rank"> · M#{masteryRank}</span>
            )}
          </span>
        </div>

        <div className="clan-list-entry__sub">
          <span>{statusLabels[clan.status as ClanStatus]}</span>
          {clan.xpRequirement > 0 && <span>{numberWithCommas(clan.xpRequirement)} XP req</span>}
          {clan.masteryRequirement > 0 && <span>{numberWithCommas(clan.masteryRequirement)} mastery req</span>}
          <span>{clan.memberCount}/25 members</span>
          {clan.description && <span className="clan-list-entry__desc">{clan.description}</span>}
        </div>
      </div>

      {showJoinButton && (
        <button
          className="clan-list-entry__join"
          disabled={joinDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onJoinClick?.();
          }}
        >
          {joinLabel ?? (clan.status === ClanStatus.Request ? 'Request' : 'Join')}
        </button>
      )}
    </div>
  );
}
