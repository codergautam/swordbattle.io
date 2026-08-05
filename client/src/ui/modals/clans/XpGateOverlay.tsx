import { useRef } from 'react';
import { clanXpRequirement } from './constants';
import { numberWithCommas } from '../../../helpers';

export default function XpGateOverlay({ currentXp }: { currentXp: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const remaining = Math.max(0, clanXpRequirement - currentXp);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const body = ref.current?.parentElement?.querySelector('.clans-body');
    if (body) body.scrollTop += e.deltaY;
  };

  return (
    <div className="clans-xp-gate" ref={ref} onWheel={onWheel}>
      <div className="clans-xp-gate__inner">
        <h2>You need at least {numberWithCommas(clanXpRequirement)} XP to be in a clan!</h2>
        <p>{numberWithCommas(remaining)} more XP needed</p>
      </div>
    </div>
  );
}
