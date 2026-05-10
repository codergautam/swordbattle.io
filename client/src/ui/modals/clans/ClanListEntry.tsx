import { ClanSummary, AccountState } from '../../../redux/account/slice';
import { numberWithCommas } from '../../../helpers';
import { ClanStatus, statusLabels, clanMemberCap } from './constants';
import ClanEmblem from './ClanEmblem';

interface ClanListEntryProps {
  clan: ClanSummary;
  account?: AccountState;
  statSort?: 'xp' | 'mastery';
  onClick?: () => void;
}

export default function ClanListEntry({
  clan, account, statSort, onClick,
}: ClanListEntryProps) {
  const xpUnmet = !!account && (account.xp ?? 0) < clan.xpRequirement;
  const masteryUnmet = !!account && (account.mastery ?? 0) < clan.masteryRequirement;
  const isFull = clan.memberCount >= clanMemberCap;

  const primaryStat = statSort === 'mastery'
    ? { label: 'Mastery', value: clan.clanMastery, rank: clan.masteryRank }
    : { label: 'XP', value: clan.clanXp, rank: clan.xpRank };

  return (
    <div className="clan-list-entry" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <ClanEmblem frameId={clan.frameId} iconId={clan.iconId} frameColor={clan.frameColor} iconColor={clan.iconColor} size={72} />

      <div className="clan-list-entry__main">
        <div className="clan-list-entry__top">
          <span className="clan-list-entry__name">
            <span className="clan-list-entry__tag">[{clan.tag}]</span> {clan.name}
          </span>
          <span className="clan-list-entry__stats">
            <span title={`Clan ${primaryStat.label}`}>{numberWithCommas(primaryStat.value)} {primaryStat.label}</span>
            {primaryStat.rank !== undefined && primaryStat.rank <= 25 && (
              <span className="clan-list-entry__rank"> (#{primaryStat.rank})</span>
            )}
          </span>
        </div>

        <div className="clan-list-entry__sub">
          <span>{statusLabels[clan.status as ClanStatus]}</span>
          {clan.xpRequirement > 0 && (
            <span className={xpUnmet ? 'unmet' : ''}>{numberWithCommas(clan.xpRequirement)} XP required</span>
          )}
          {clan.masteryRequirement > 0 && (
            <span className={masteryUnmet ? 'unmet' : ''}>{numberWithCommas(clan.masteryRequirement)} mastery required</span>
          )}
          <span className={isFull ? 'unmet' : ''}>{clan.memberCount}/{clanMemberCap} members</span>
        </div>
      </div>

      {onClick && (
        <button
          className="clan-list-entry__view"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          View
        </button>
      )}
    </div>
  );
}
