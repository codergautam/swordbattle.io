import { useEffect, useState } from 'react';
import { useScale } from '../Scale';
import './Leaderboard.scss';

function Leaderboard({ game }: any) {
  const [show, setShow] = useState(true);
  const [players, setPlayers] = useState<any>([]);
  const [selfPlayer, setSelfPlayer] = useState<any>(null);

  const processPlayers = (players: any[], selfId: number) => {
    const sortedPlayers = players.sort((a, b) => b.coins - a.coins);
    sortedPlayers.forEach((player, i) => player.place = i + 1);
    const selfPlayer = sortedPlayers.find(player => player.id === selfId);
    sortedPlayers.splice(10, sortedPlayers.length - 10);

    setSelfPlayer(sortedPlayers.includes(selfPlayer) ? null : selfPlayer);
    return sortedPlayers;
  };

  useEffect(() => {
    if (game) {
      game.events.on('playersUpdate', (players: any, selfId: number) => {
        setPlayers(processPlayers(players, selfId));
      });
    }
  }, [game]);

  const toggleVisibility = () => setShow(!show);

  return (
    <div className="leaderboard" style={useScale(false).styles}>
      <div className="leaderboard-title" role="button" onClick={toggleVisibility}>
        Leaderboard
      </div>

      <div className={`leaderboard-content ${show ? '' : 'hidden'}`}>
        {players.map((player: any) => <LeaderboardLine key={player.id} player={player} />)}
        {selfPlayer && (<div>...</div>)}
        {selfPlayer && <LeaderboardLine player={selfPlayer} />}
      </div>
    </div>
  );
}

function getRankColor(rank: number) {
  // #1 gold, #2 silver, #3 bronze, #4-10 green, #11-50 purple, #51-100 gray
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#000000';
  if (rank === 3) return '#cd7f32';
  if (rank >= 4 && rank <= 10) return '#00ff00';
  if (rank >= 11 && rank <= 50) return '#800080';
  if (rank >= 51 && rank <= 100) return '#808080';
  return 'white';
}

function LeaderboardLine({ player }: any) {
  const balance = player.coins >= 1000 ? `${(player.coins / 1000).toFixed(1)}k` : player.coins;
  const specialColors: { [key: string]: string } = {
    codergautam: '#ff0000',
    angel: '#acfffc'
  }
  return (
    <div className="leaderboard-line">
      <span className="leaderboard-place">#{player.place}: </span>
      <span className="leaderboard-name" style={player.account ? { color: specialColors[player.name.toLowerCase() as any] ? specialColors[player.name.toLowerCase() as any] : '#3333ff' } : {}}>{player.name}
      {player.account?.rank && <span style={{color: getRankColor(player.account.rank)}}> (#{player.account.rank})</span>}
       <span style={{color: 'white'}}>- </span></span>
      <span className="leaderboard-score">{balance}</span>
    </div>
  );
}

export default Leaderboard;
