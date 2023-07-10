import { useEffect, useState } from 'react';
import './Leaderboard.scss';
import { useScale } from '../Scale';

function Leaderboard({ game }: any) {
  const [players, setPlayers] = useState<any>([]);
  const [selfPlayer, setSelfPlayer] = useState<any>(null);

  const processPlayers = (players: any[], selfId: number) => {
    const sortedPlayers = players.sort((a, b) => b.coinBalance - a.coinBalance);
    sortedPlayers.forEach((player, i) => player.place = i + 1);
    const selfPlayer = sortedPlayers.find(player => player.id === selfId);
    sortedPlayers.splice(10, sortedPlayers.length - 10);

    setSelfPlayer(sortedPlayers.includes(selfPlayer) ? null : selfPlayer);
    return sortedPlayers;
  };

  useEffect(() => {
    if (game !== null) {
      game.events.on('playersUpdate', (players: any, selfId: number) => {
        setPlayers(processPlayers(players, selfId));
      });
    }
  }, [game]);

  return (
    <div className="leaderboard" style={useScale(false)}>
      {players.map((player: any) => <LeaderboardLine key={player.id} player={player} />)}
      {selfPlayer && (<div>...</div>)}
      {selfPlayer && <LeaderboardLine player={selfPlayer} />}
    </div>
  );
}

function LeaderboardLine({ player }: any) {
  const balance = player.coinBalance >= 1000 ? `${(player.coinBalance / 1000).toFixed(1)}k` : player.coinBalance;
  return (
    <div className="leaderboard-line">
      <span className="leaderboard-place">#{player.place}: </span>
      <span className="leaderboard-name">{player.name} - </span>
      <span className="leaderboard-score">{balance}</span>
    </div>
  );
}

export default Leaderboard;
