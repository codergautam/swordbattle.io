import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import { numberWithCommas } from '../helpers';
import api from '../api';
import './LeaderboardCard.scss';

export default function LeaderboardCard({ onViewLeaderboard }: { onViewLeaderboard: () => void }) {
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `${api.endpoint}/stats/fetch?${Date.now()}`;
    api.post(url, {
      sortBy: 'xp',
      timeRange: 'day',
      limit: 3,
    }, (data: any) => {
      if (data.message || !Array.isArray(data)) {
        setTopPlayers([]);
      } else {
        setTopPlayers(data.slice(0, 3));
      }
      setLoading(false);
    });
  }, []);

  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <span id="leaderboard-card">
      <h2 className="leaderboard-card-title">Top Players Today</h2>
      <div className="leaderboard-card-list">
        {loading ? (
          <div className="leaderboard-card-loading">Loading...</div>
        ) : topPlayers.length === 0 ? (
          <div className="leaderboard-card-loading">No data yet</div>
        ) : (
          topPlayers.map((player, i) => (
            <div key={i} className="leaderboard-card-row">
              <span className="leaderboard-card-rank" style={{ color: rankColors[i] }}>#{i + 1}</span>
              <span className="leaderboard-card-name">{player.username}</span>
              <span className="leaderboard-card-xp">{numberWithCommas(player.xp)} XP</span>
            </div>
          ))
        )}
      </div>
      <div className="leaderboard-card-tip">Make a CrazyGames account to earn XP!</div>
      <a className="leaderboard-card-button" onClick={onViewLeaderboard} style={{ cursor: 'pointer' }}>
        <FontAwesomeIcon icon={faTrophy} /> View Leaderboards
      </a>
    </span>
  );
}
