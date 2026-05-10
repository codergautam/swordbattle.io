import { clanXpRequirement } from './constants';
import { numberWithCommas } from '../../../helpers';

export default function XpGateOverlay({ currentXp }: { currentXp: number }) {
  const remaining = Math.max(0, clanXpRequirement - currentXp);
  return (
    <div className="clans-xp-gate">
      <div className="clans-xp-gate__inner">
        <h2>You need at least {numberWithCommas(clanXpRequirement)} XP to be in a clan!</h2>
        <p>{numberWithCommas(remaining)} more XP needed</p>
      </div>
    </div>
  );
}
