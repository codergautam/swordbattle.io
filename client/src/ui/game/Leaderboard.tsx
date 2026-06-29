import { memo, useEffect, useRef, useState } from 'react';
import { useScale } from '../Scale';
import './Leaderboard.scss';

function Leaderboard({ game }: any) {
  const [show, setShow] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [selfId, setSelfId] = useState<number>(-1);
  const [hidden, setHidden] = useState(false);
  const [selfVisible, setSelfVisible] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const selfRowRef = useRef<HTMLDivElement>(null);

  const processPlayers = (list: any[]) => {
    const sorted = [...list].sort((a, b) => b.coins - a.coins);
    sorted.forEach((p, i) => (p.place = i + 1));
    return sorted.slice(0, 100);
  };

  useEffect(() => {
    if (!game) return;
    const onPlayersUpdate = (list: any[], sid: number) => {
      setSelfId(sid);
      setPlayers(processPlayers(list));
    };
    const onEvolutionsVisible = (visible: boolean) => setHidden(visible);
    game.events.on('playersUpdate', onPlayersUpdate);
    game.events.on('evolutionsVisible', onEvolutionsVisible);
    return () => {
      game.events.off('playersUpdate', onPlayersUpdate);
      game.events.off('evolutionsVisible', onEvolutionsVisible);
    };
  }, [game]);

  const checkSelfVisible = () => {
    const list = listRef.current, row = selfRowRef.current;
    if (!list || !row) { setSelfVisible(false); return; }
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    setSelfVisible(bottom > list.scrollTop + 2 && top < list.scrollTop + list.clientHeight - 2);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(checkSelfVisible);
    return () => cancelAnimationFrame(raf);
  }, [players, show]); // eslint-disable-line

  const scaleStyles = useScale(false).styles;
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
          <div className="lb-list" ref={listRef} onScroll={checkSelfVisible}>
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

type NameStyle = { fill: string; outline?: string | null; shadow?: string | null };
const specialColors: Record<string, NameStyle> = {
  codergautam: { fill: '#ff0000', shadow: '#ff000077' },
  angel: { fill: '#acfffc', shadow: '#00ccffaa' },
  'cool guy 53': { fill: '#00bbff', shadow: '#0088ff77' },
  'update testing account': { fill: '#00ff00', shadow: '#00ff0077' },
  'amethyst nightveil': { fill: '#b066ff' },
  oy: { fill: '#000000', shadow: '#ffffff' },
  bobz: { fill: '#000000', shadow: '#ffffff' },
};

const LeaderboardLine = memo(function LeaderboardLine({ place, coins, name, account, isSelf, innerRef }: any) {
  const balance = coins >= 1000 ? `${(coins / 1000).toFixed(1)}k` : coins;

  let nameStyle: React.CSSProperties = {};
  if (account) {
    const ns = specialColors[(name || '').toLowerCase()] || { fill: '#0088ff' };
    nameStyle.color = ns.fill;
    if (ns.outline) nameStyle.WebkitTextStroke = `1px ${ns.outline}`;
    if (ns.shadow) nameStyle.textShadow = `0 0 4px ${ns.shadow}, 0 0 4px ${ns.shadow}`;
  }

  const clan = account?.clan;
  const tag = clan && typeof clan === 'object' ? clan.tag : (typeof clan === 'string' ? clan : null);

  const len = (tag ? tag.length + 3 : 0) + (name?.length || 0);
  const nameSize = len > 16 ? 13 : 17;

  return (
    <div className={`lb-row ${isSelf ? 'self' : ''}`} ref={innerRef}>
      <span className="lb-place">{place}</span>
      <span className="lb-name" style={{ fontSize: nameSize }}>
        {tag && <span className="lb-clan">[{tag}] </span>}
        <span style={nameStyle}>{name}</span>
      </span>
      <span className="lb-score">{balance}</span>
    </div>
  );
});

export default Leaderboard;
