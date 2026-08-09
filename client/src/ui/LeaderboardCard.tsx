import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { numberWithCommas } from '../helpers';
import api from '../api';
import cosmetics from '../game/cosmetics.json';
import { getSkinScale } from '../game/skinScales';
import { withAssetVersion } from '../assetVersion';
import './LeaderboardCard.scss';

const skinBody: Record<number, string> = {};
Object.values((cosmetics as any).skins).forEach((s: any) => { skinBody[s.id] = s.bodyFileName; });
function skinSrc(skinId?: number) {
  return withAssetVersion(`assets/game/player/${skinBody[skinId ?? 1] || 'player.png'}`);
}

const rankColors = ['#f5c542', '#c8c8d2', '#cd7f32', '#9a9aa2', '#9a9aa2'];

export default function LeaderboardCard() {
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTime, setAllTime] = useState(false);

  useEffect(() => {
    const fetchTop = (timeRange: string, onEmpty?: () => void) => {
      api.post(`${api.endpoint}/stats/fetch?${Date.now()}`, {
        sortBy: 'xp',
        timeRange,
        limit: 3,
      }, (data: any) => {
        const rows = !data || data.message || !Array.isArray(data) ? [] : data.slice(0, 3);
        if (rows.length === 0 && onEmpty) {
          onEmpty();
          return;
        }
        setTopPlayers(rows);
        setLoading(false);
      });
    };
    fetchTop('day', () => {
      setAllTime(true);
      fetchTop('all');
    });
  }, []);

  return (
    <div className="menu-lb">
      <div className="menu-lb-title">
        <FontAwesomeIcon icon={faTrophy} className="menu-lb-title-icon" />
        <span>{allTime ? 'Top Players' : 'Top Players Today'}</span>
      </div>
      <div className="menu-lb-list">
        {loading ? (
          <div className="menu-lb-empty">Loading…</div>
        ) : topPlayers.length === 0 ? (
          <div className="menu-lb-empty">No data yet.</div>
        ) : (
          topPlayers.map((player, i) => (
            <div key={i} className="menu-lb-row">
              <span className="menu-lb-rank" style={{ color: rankColors[i] }}>#{i + 1}</span>
              <div className="menu-lb-skin">
                <img src={skinSrc(player.skinId)} alt="" draggable={false} style={{ transform: `scale(${getSkinScale(player.skinId ?? 1)})` }} />
              </div>
              <span className="menu-lb-name">
                {player.clan_tag && <span className="menu-lb-clan">[{player.clan_tag}]</span>}
                {player.username || 'Unknown'}
              </span>
              <span className="menu-lb-xp">{numberWithCommas(player.xp || 0)} XP</span>
            </div>
          ))
        )}
      </div>
      {/* <div className="menu-lb-tip">
        Make a CrazyGames account to earn XP!
      </div> */}
    </div>
  );
}
