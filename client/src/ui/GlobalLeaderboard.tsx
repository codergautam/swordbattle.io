import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { numberWithCommas, secondsToTime, sinceFrom } from '../helpers';
import api from '../api';
import Ad from './Ad';

import 'bootstrap/dist/js/bootstrap.bundle.min';
import './GlobalLeaderboard.scss';
import cosmetics from '../game/cosmetics.json';

function abbrNumber(n: number | string) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) {
    const v = +(num / 1_000_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'm';
  }
  if (num >= 1_000) {
    const v = +(num / 1_000).toFixed(1);
    return (v % 1 === 0 ? v.toFixed(0) : v.toString()) + 'k';
  }
  return num.toString();
}

function timeSinceShort(dateLike?: string | Date | null) {
  if (!dateLike) return 'unknown';
  const d = new Date(dateLike).getTime();
  if (isNaN(d)) return 'unknown';
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '<1min';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

const types: Record<string, string> = {
  'kills': 'Kills',
  'coins': 'Coins',
  'playtime': 'Survived',
  'xp': 'XP',
  'mastery': 'Mastery',
  'total-kills': 'Total Stabs',
  'total-playtime': 'Total Playtime',
};

const ranges: Record<string, string> = {
  'all': 'All-Time',
  'day': 'Past Day',
  'week': 'Past Week',
  'month': 'Past Month',
};

export function GlobalLeaderboard() {
  const navigate = useNavigate();
  const [type, setType] = useState<string>('coins');
  const [range, setRange] = useState<string>('all');
  const [data, setData] = useState<any[]>([]);

  // search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [serverSuggestions, setServerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  const fetchData = () => {
    const isGames = type === 'coins' || type === 'kills' || type === 'playtime';
    const url = `${api.endpoint}/${isGames ? 'games' : 'stats'}/fetch`;
    api.post(url, {
      sortBy: type.startsWith('total') ? type.slice(6) : type,
      timeRange: range,
      limit: 100,
    }, (data: any) => setData(!data.message ? data : []));
  };
  const changeType = (type: string) => {
    setData([]);
    setType(type);
  };
  const changeRange = (range: string) => {
    setData([]);
    setRange(range);
  };

  useEffect(fetchData, [type, range]);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setServerSuggestions([]);
      setIsSearching(false);
      return;
    }
    const q = searchTerm.trim();
    setIsSearching(true);
    const timeout = setTimeout(() => {
      api.post(`${api.endpoint}/profile/search?${Date.now()}`, { q, limit: 25 }, (res: any) => {
        if (!Array.isArray(res)) {
          setServerSuggestions([]);
          setIsSearching(false);
          return;
        }
        setServerSuggestions(res.slice(0, 25));
        setIsSearching(false);
      });
    }, 250);
    return () => {
      clearTimeout(timeout);
      setIsSearching(false);
    };
  }, [searchTerm]);

  useEffect(() => {
    document.body.classList.add('global-leaderboard-body');
    return () => document.body.classList.remove('global-leaderboard-body');
  }, []);

  const navigateToProfile = (username: string) => {
    setShowSuggestions(false);
    setSearchTerm('');
    navigate(`/profile?username=${encodeURIComponent(username)}`);
  };

  // Only show max 5 games per account
  const isGameLeaderboard = type === 'coins' || type === 'kills' || type === 'playtime';
  const isAllTimeGameLeaderboard = isGameLeaderboard && range === 'all';
  
  const filteredData = isAllTimeGameLeaderboard ? (() => {
    const gamesByAccount = new Map<string, any[]>();
    data.forEach((row) => {
      const accountKey = row.username || row.accountId || 'unknown';
      if (!gamesByAccount.has(accountKey)) {
        gamesByAccount.set(accountKey, []);
      }
      gamesByAccount.get(accountKey)!.push(row);
    });
    
    const sortBy = type;
    const sortFunc = (a: any, b: any) => {
      if (sortBy === 'coins') return b.coins - a.coins;
      if (sortBy === 'kills') return b.kills - a.kills;
      if (sortBy === 'playtime') return b.playtime - a.playtime;
      return 0;
    };
    
    const topGames: any[] = [];
    gamesByAccount.forEach((games) => {
      const sortedGames = [...games].sort(sortFunc);
      topGames.push(...sortedGames.slice(0, 5));
    });
    
    topGames.sort(sortFunc);
    
    return topGames;
  })() : data;

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="main-content">
      <div className="container">
        <button className="back-button" onClick={() => { window.location.href = '../index.html'; }}>X</button>
        <div className="leaderboard-search">
          <input
            type="text"
            placeholder="Search usernames..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="form-control"
            aria-label="Search usernames"
          />
          {showSuggestions && (
            <div className="search-suggestions">
              {searchTerm.trim().length === 0 ? (
                <div className="suggestion-hint">Type to search usernames</div>
              ) : isSearching ? (
                <div className="suggestion-hint">Searching...</div>
              ) : serverSuggestions.length === 0 ? (
                <div className="suggestion-hint">No accounts found</div>
              ) : (
                serverSuggestions.map((s: any) => {
                  const u = s.username;
                  const createdAt = s.created_at ?? s.createdAt ?? null;
                  const lastSeen = s.last_seen ?? s.lastSeen ?? null;
                  const xp = s.xp ?? 0;
                  const equippedId = s?.skins?.equipped;
                  const equippedSkin = equippedId ? Object.values((cosmetics as any).skins).find((sk: any) => sk.id === equippedId) : null;
                  return (
                    <div
                      key={u}
                      className="search-suggestion"
                      onMouseDown={(ev) => { ev.preventDefault(); navigateToProfile(u); }}
                    >
                      <div className="suggestion-left">
                        <div className="suggestion-name">{u}</div>
                        <div className="suggestion-meta">
                          <span>Joined {timeSinceShort(createdAt)} ago</span>
                          {(() => {
                            const lastSeenText = timeSinceShort(lastSeen);
                            if (lastSeen && lastSeenText !== 'unknown') {
                              return <span>• Online {lastSeenText} ago</span>;
                            }
                            return null;
                          })()}
                          <span>• {xp >= 1_000_000 ? <strong>{abbrNumber(xp)} XP</strong> : `${abbrNumber(xp)} XP`}</span>
                        </div>
                       </div>
                      <div />
                    </div>
                   );
                 })
               )}
              {!isSearching && serverSuggestions.length >= 25 && (
                <div className="search-more">... more results</div>
              )}
            </div>
          )}
        </div>
        <br />
        <h3>{ranges[range]}</h3>
        <br />

        <div className="dropdown d-inline-block">
          <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            {types[type]}
          </button>
          <ul className="dropdown-menu">
            {Object.entries(types).map(([key, name]) => {
              if (key === type) return false;
              return <li key={key} className="dropdown-item" onClick={() => changeType(key)}>{name}</li>;
            })}
          </ul>
        </div>

        <div className="dropdown d-inline-block">
          <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            {ranges[range]}
          </button>
          <ul className="dropdown-menu">
            {Object.entries(ranges).map(([key, name]) => {
              if (key === range) return false;
              return <li key={key} className="dropdown-item" onClick={() => changeRange(key)}>{name}</li>;
            })}
          </ul>
        </div>

        <br />
        <br />

        {isAllTimeGameLeaderboard && (
          <div className="alert alert-info" role="alert" style={{ 
            marginBottom: '20px', 
            borderRadius: '8px',
            padding: '12px 16px',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            color: '#004085'
          }}>
            <strong>Note:</strong> This leaderboard displays up to only 5 games per player, which can be viewed on the player's profile.
          </div>
        )}

        <div className="row">
          {filteredData.length > 2 ? (<>
            <LeaderboardCard type={type} row={filteredData[0]} index={0} />
            <LeaderboardCard type={type} row={filteredData[1]} index={1} />
            <LeaderboardCard type={type} row={filteredData[2]} index={2} />
          </>) : (
            <>Loading...</>
          )}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              {type !== 'xp' && type !== 'mastery' && !type.startsWith('total') ? (<>
                <th>Coins</th>
                <th>Kills</th>
                <th>Survived</th>
                <th>Time Created</th>
              </>) : (
                <th>{type === 'xp' ? 'XP' : type === 'mastery' ? 'Mastery' : type.slice(6)}</th>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredData.slice(3).map((row, mapIndex) => {
              const index = mapIndex + 3;
              return (
                <tr key={index} className={row.username === "Update Testing Account" ? "updateCard" : ""}>
                  <td><b>#{index + 1}</b></td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div className="user-info__basic">
                        <h5 className="mb-0">
                            <Link
                            to={`/profile?username=${encodeURIComponent(row.username)}`}
                            rel="noreferrer"
                            style={{ color: 'black' }}
                            >
                            {row.clan && row.clan !== 'X79Q' && <span style={{ color: '#b0b000' }} className='clan'>[{row.clan}] </span>}
                            {row.username}
                            </Link>
                        </h5>
                      </div>
                    </div>
                  </td>
                  {type !== 'xp' && type !== 'mastery' && !type.startsWith('total') ? (
                    <>
                      <td>
                        <div className="d-flex align-items-baseline">
                          <h4 className="mr-1">
                            {numberWithCommas(row.coins)}
                          </h4>
                        </div>
                      </td>
                      <td>{row.kills}</td>
                      <td>{secondsToTime(row.playtime)}</td>
                      <td>
                       {(() => {
                  const agoText = sinceFrom(row.date) + ' ago';
                  let style: React.CSSProperties = {};
                  let isBold = false;
                  if (agoText.includes('days')) {
                    const days = parseInt(agoText.split(' ')[0], 10);
                    if (days > 300) style.color = '#ff00bfff'; // pink
                    else if (days > 250) style.color = 'red';
                    else if (days > 200) style.color = '#c77d1bff';
                    else if (days > 150) style.color = '#b0b315ff';
                    else if (days > 100) style.color = '#0c8f0c';
                    else if (days > 50) style.color = '#006400';
                    if (days > 200) isBold = true;
                  } else if (agoText.includes('2 year')) {
                    style.color = '#1900ffff'; // dark purple/blue
                    isBold = true;
                  } else if (agoText.includes('1 year')) {
                    style.color = '#570791ff';
                    isBold = true;
                  }
                  return <span style={style}>{isBold ? <b>{agoText}</b> : agoText}</span>;
                })()}</td>
                    </>
                  ) : (
                    <td>
                      <h4 className="mr-1">
                        {type === 'xp' && numberWithCommas(row.xp)}
                        {type === 'mastery' && numberWithCommas(row.mastery)}
                        {type === 'total-kills' && numberWithCommas(row.kills)}
                        {type === 'total-playtime' && secondsToTime(row.playtime)}
                      </h4>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{
          marginTop: '40px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Ad
            screenW={dimensions.width}
            screenH={dimensions.height}
            types={[[728, 90]]}
            horizThresh={0.15}
          />
        </div>
      </div>

    </section>
  );
}

function LeaderboardCard({ type, row, index }: { type: string, row: any, index: number }) {
  const isFirst = index === 0;
  return (
    <div className="col-sm-4">
      <div className={clsx('leaderboard-card', isFirst && 'leaderboard-card--first', row.username === "Update Testing Account" && 'updateCard')}>
        <div className="leaderboard-card__top">
          <h3 className="text-center">
            #{index + 1} - <Link
                            to={`/profile?username=${encodeURIComponent(row.username)}`}
                            rel="noreferrer"
                            style={{ color: isFirst ? 'white' : 'black' }}
                            >
                            {row.clan && row.clan !== 'X79Q' && (
                              <span style={{ color: isFirst ? '#ffff00' : '#b0b000' }} className='clan'>[{row.clan}] </span>
                            )}
                            {row.username}
                            </Link>
          </h3>
        </div>
        <div className="leaderboard-card__body">
          <div className="text-center">
            <br />
            {type !== 'xp' && type !== 'mastery' && !type.startsWith('total') ? (<>
              <h5 className="mb-0">{numberWithCommas(row.coins)} coins</h5>
              <p className="text-muted mb-0">
                Kills: {row.kills}, Survived: {secondsToTime(row.playtime)}, {(() => {
                  const agoText = sinceFrom(row.date) + ' ago';
                  let style: React.CSSProperties = {};
                  let isBold = false;
                  if (agoText.includes('days')) {
                    const days = parseInt(agoText.split(' ')[0], 10);
                    if (days > 300) style.color = '#ff00bfff'; // pink
                    else if (days > 250) style.color = 'red';
                    else if (days > 200) style.color = '#c77d1bff';
                    else if (days > 150) style.color = '#b0b315ff';
                    else if (days > 100) style.color = '#0c8f0c';
                    else if (days > 50) style.color = '#006400';
                    if (days > 200) isBold = true;
                  } else if (agoText.includes('2 year')) {
                    style.color = '#1900ffff'; // dark purple/blue
                    isBold = true;
                  } else if (agoText.includes('1 year')) {
                    style.color = '#570791ff';
                    isBold = true;
                  }
                  return <span style={style}>{isBold ? <b>{agoText}</b> : agoText}</span>;
                })()}
              </p>
            </>) : (
              <h5 className="mb-0">
                {type === 'xp' && numberWithCommas(row.xp) + ' XP'}
                {type === 'mastery' && numberWithCommas(row.mastery) + '  mastery'}
                {type === 'total-kills' && numberWithCommas(row.kills) + ' stabs'}
                {type === 'total-playtime' && secondsToTime(row.playtime) + ' played'}
              </h5>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
