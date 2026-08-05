import { memo, useEffect, useRef, useState } from 'react';
import { useScale } from '../Scale';
import StyledName from '../StyledName';
import { resolveNameStyle, CLAN_COLOR } from '../../game/nameStyles';
import './Leaderboard.scss';

function Leaderboard({ game }: any) {
  const [show, setShow] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [selfId, setSelfId] = useState<number>(-1);
  const [hidden, setHidden] = useState(false);
  const [selfVisible, setSelfVisible] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const selfRowRef = useRef<HTMLDivElement>(null);
  const lastSigRef = useRef('');

  const processPlayers = (list: any[]) => {
    const sorted = [...list].sort((a, b) => b.coins - a.coins);
    sorted.forEach((p, i) => (p.place = i + 1));
    return sorted.slice(0, 100);
  };

  useEffect(() => {
    if (!game) return;
    const onPlayersUpdate = (list: any[], sid: number) => {
      const sorted = processPlayers(list);
      let sig = sid + '|';
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i];
        sig += p.id + ':' + p.coins + ':' + p.place + ':' + p.name + ';';
      }
      if (sig === lastSigRef.current) return;
      lastSigRef.current = sig;
      setSelfId(sid);
      setPlayers(sorted);
    };
    const onEvolutionsVisible = (visible: boolean) => setHidden(visible);
    game.events.on('playersUpdate', onPlayersUpdate);
    game.events.on('evolutionsVisible', onEvolutionsVisible);
    return () => {
      game.events.off('playersUpdate', onPlayersUpdate);
      game.events.off('evolutionsVisible', onEvolutionsVisible);
    };
  }, [game]);

  useEffect(() => {
    const list = listRef.current, row = selfRowRef.current;
    if (!list || !row) { setSelfVisible(false); return; }
    const io = new IntersectionObserver(
      (entries) => setSelfVisible(entries[0].isIntersecting),
      { root: list, rootMargin: '-2px 0px -2px 0px', threshold: 0 },
    );
    io.observe(row);
    return () => io.disconnect();
  }, [players, show, selfId]); // eslint-disable-line

  const scaleStyles = { transform: `scale(${useScale(false).factor * 0.9})`, transformOrigin: 'top right' };
  if (hidden) return null;

  const selfPlayer = players.find((p) => p.id === selfId);

  return (
    <div className="leaderboard" style={scaleStyles}>
      <div className={`lb-header ${show ? 'open' : 'closed'}`} role="button" onClick={() => setShow(!show)}>
        <span className="lb-arrow">{show ? '▼' : '▲'}</span>
        <span className="lb-title">Leaderboard</span>
        <span className="lb-arrow">{show ? '▼' : '▲'}</span>
      </div>

      {show && (
        <>
          <div className="lb-list" ref={listRef}>
            {players.map((p) => (
              <LeaderboardLine
                key={p.id}
                place={p.place}
                coins={p.coins}
                name={p.name}
                account={p.account}
                isSelf={p.id === selfId}
                innerRef={p.id === selfId ? selfRowRef : undefined}
              />
            ))}
          </div>
          {selfPlayer && !selfVisible && (
            <div className="lb-pinned">
              <div className="lb-sep">···</div>
              <LeaderboardLine
                place={selfPlayer.place}
                coins={selfPlayer.coins}
                name={selfPlayer.name}
                account={selfPlayer.account}
                isSelf
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getRankColor(rank: number) {
  if (rank === 1) return '#ffff00';
  if (rank === 2) return '#ccccdc';
  if (rank === 3) return '#222222';
  if (rank >= 4 && rank <= 5) return '#00ffff';
  if (rank >= 6 && rank <= 10) return '#00ff00';
  if (rank >= 11 && rank <= 25) return '#ff0000';
  if (rank >= 26 && rank <= 50) return '#ee00ff';
  if (rank >= 51 && rank <= 75) return '#800080';
  if (rank >= 76 && rank <= 100) return '#707070';
  if (rank >= 101 && rank <= 200) return '#575454ff';
  return 'white';
}

const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const nameAreaPx = 218;
function fitFontSize(text: string) {
  if (!measureCtx) return 17;
  for (const size of [17, 15, 13]) {
    measureCtx.font = `700 ${size}px Saira, sans-serif`;
    if (measureCtx.measureText(text).width <= nameAreaPx) return size;
  }
  return 12;
}

const LeaderboardLine = memo(function LeaderboardLine({ place, coins, name, account, isSelf, innerRef }: any) {
  const balance = coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins;

  const nameStyle = resolveNameStyle(name, !!account, 'leaderboard');

  const clan = account?.clan;
  const tag = clan && typeof clan === 'object' ? clan.tag : (typeof clan === 'string' ? clan : null);
  const rank = account?.rank;

  const fullText = (tag ? `[${tag}] ` : '') + (name || '') + (rank ? ` (#${rank})` : '');
  const nameSize = fitFontSize(fullText);

  return (
    <div className={`lb-row ${isSelf ? 'self' : ''}`} ref={innerRef}>
      <span className="lb-place">{place}</span>
      <span className="lb-name" style={{ fontSize: nameSize }}>
        {tag && <span className="lb-clan" style={{ color: CLAN_COLOR }}>[{tag}] </span>}
        <StyledName name={name} style={nameStyle} fontSize={nameSize} />
        {rank && <span className="lb-rank" style={{ color: getRankColor(rank) }}> (#{rank})</span>}
      </span>
      <span className="lb-score">{balance}</span>
    </div>
  );
});

export default Leaderboard;
