import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import api from '../../api';
import { numberWithCommas, secondsToTime, sinceFrom } from '../../helpers';
import cosmetics from '../../game/cosmetics.json';
import { getSkinScale } from '../../game/skinScales';
import ModalAd from '../ModalAd';
import './RankingsTab.scss';

const types: Record<string, string> = {
  coins: 'Coins',
  kills: 'Kills',
  playtime: 'Survived',
  xp: 'XP',
  mastery: 'Mastery',
  'total-kills': 'Total Stabs',
  'total-playtime': 'Total Playtime',
};

const ranges: Record<string, string> = {
  all: 'All-Time',
  day: 'Past Day',
  week: 'Past Week',
  month: 'Past Month',
};

const skinBody: Record<number, string> = {};
Object.values((cosmetics as any).skins).forEach((s: any) => { skinBody[s.id] = s.bodyFileName; });
function skinSrc(skinId?: number) {
  return `assets/game/player/${skinBody[skinId ?? 1] || 'player.png'}`;
}

function gameAge(dateLike: any): { text: string; color?: string; bold: boolean } {
  const text = sinceFrom(dateLike) + ' ago';
  let color: string | undefined;
  let bold = false;
  if (text.includes('days')) {
    const days = parseInt(text.split(' ')[0], 10);
    if (days > 300) color = '#ff00bfff';
    else if (days > 250) color = 'red';
    else if (days > 200) color = '#c77d1bff';
    else if (days > 150) color = '#b0b315ff';
    else if (days > 100) color = '#0c8f0c';
    else if (days > 50) color = '#006400';
    if (days > 200) bold = true;
  } else if (text.includes('2 year')) { color = '#1900ffff'; bold = true; }
  else if (text.includes('1 year')) { color = '#570791ff'; bold = true; }
  return { text, color, bold };
}

function singleStat(type: string, row: any) {
  switch (type) {
    case 'xp': return `${numberWithCommas(row.xp || 0)} XP`;
    case 'mastery': return `${numberWithCommas(row.mastery || 0)} mastery`;
    case 'total-kills': return `${numberWithCommas(row.kills || 0)} stabs`;
    case 'total-playtime': return secondsToTime(row.playtime || 0) + ' played';
    default: return '';
  }
}

function StyledSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div className="rk-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
      <FontAwesomeIcon icon={faChevronDown} className="rk-chev" />
    </div>
  );
}

export default function RankingsTab({ onViewProfile }: { onViewProfile?: (username: string) => void }) {
  const [type, setType] = useState('coins');
  const [range, setRange] = useState('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const isGame = type === 'coins' || type === 'kills' || type === 'playtime';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const isGames = type === 'coins' || type === 'kills' || type === 'playtime';
    const isAllTimeGames = isGames && range === 'all';
    const url = `${api.endpoint}/${isGames ? 'games' : 'stats'}/fetch?${Date.now()}`;
    const limit = isAllTimeGames ? 2000 : 100;

    api.post(url, {
      sortBy: type.startsWith('total') ? type.slice(6) : type,
      timeRange: range,
      limit,
    }, (res: any) => {
      if (cancelled) return;
      if (res?.message || !Array.isArray(res) || res.length === 0) {
        setData([]);
      } else if (isAllTimeGames) {
        const byAccount = new Map<string, any[]>();
        res.forEach((row: any) => {
          const k = row.username || row.accountId || 'unknown';
          if (!byAccount.has(k)) byAccount.set(k, []);
          byAccount.get(k)!.push(row);
        });
        const sortFunc = (a: any, b: any) => (b[type] || 0) - (a[type] || 0);
        const top: any[] = [];
        byAccount.forEach((games) => top.push([...games].sort(sortFunc)[0]));
        top.sort(sortFunc);
        setData(top.slice(0, 100));
      } else {
        setData(res);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [type, range]);

  useEffect(() => {
    const q = search.trim();
    if (!q) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.post(`${api.endpoint}/profile/search?${Date.now()}`, { q, limit: 20 }, (res: any) => {
        setSuggestions(Array.isArray(res) ? res.slice(0, 20) : []);
        setSearching(false);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const renderRow = (row: any, i: number) => {
    const topClass = i < 3 ? ` top top-${i + 1}` : '';
    const age = isGame && row.date ? gameAge(row.date) : null;
    return (
      <div
        key={`${row.username || 'p'}-${i}`}
        className={`rk-row${topClass}`}
        onClick={() => row.username && onViewProfile?.(row.username)}
      >
        <span className="rk-rank">{i + 1}</span>
        <div className="rk-skin">
          <img src={skinSrc(row.skinId)} alt="" draggable={false} style={{ transform: `scale(${getSkinScale(row.skinId ?? 1)})` }} />
        </div>
        <div className="rk-main">
          <div className="rk-name">
            {row.clan_tag && <span className="rk-clan">[{row.clan_tag}]</span>}
            {row.username || 'Unknown'}
          </div>
          {isGame ? (
            <div className="rk-stats">
              <span className={`st${type === 'coins' ? ' hl' : ''}`}><b>{numberWithCommas(row.coins || 0)}</b> coins</span>
              <span className={`st${type === 'kills' ? ' hl' : ''}`}><b>{numberWithCommas(row.kills || 0)}</b> kills</span>
              <span className={`st${type === 'playtime' ? ' hl' : ''}`}>{secondsToTime(row.playtime || 0)}</span>
              {age && (
                <span className="st age" style={age.color ? { color: age.color } : undefined}>
                  {age.bold ? <b>{age.text}</b> : age.text}
                </span>
              )}
            </div>
          ) : (
            <div className="rk-stats"><span className="st hl">{singleStat(type, row)}</span></div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rankings">
      <div className="rk-controls">
        <StyledSelect value={type} onChange={setType} options={types} />
        <StyledSelect value={range} onChange={setRange} options={ranges} />
        <div className="rk-search">
          <input
            type="text"
            placeholder="Search players…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          />
          {showSuggest && search.trim() && (
            <div className="rk-suggest">
              {searching ? (
                <div className="rk-suggest-hint">Searching…</div>
              ) : suggestions.length === 0 ? (
                <div className="rk-suggest-hint">No players found</div>
              ) : (
                suggestions.map((s: any) => (
                  <div
                    key={s.username}
                    className="rk-suggest-row"
                    onMouseDown={(e) => { e.preventDefault(); onViewProfile?.(s.username); setShowSuggest(false); setSearch(''); }}
                  >
                    <span className="rk-suggest-name">{s.username}</span>
                    <span className="rk-suggest-xp">{numberWithCommas(s.xp ?? 0)} XP</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <ModalAd placement="rankings" />

      <div className="rk-title">{types[type]} Leaderboard</div>

      <div className="rk-list">
        {loading ? (
          <div className="rk-empty">Loading…</div>
        ) : data.length === 0 ? (
          <div className="rk-empty">No data yet.</div>
        ) : (
          data.map((row, i) => renderRow(row, i))
        )}
      </div>
    </div>
  );
}
