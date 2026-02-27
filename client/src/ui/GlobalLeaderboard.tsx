import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { numberWithCommas, secondsToTime, sinceFrom } from '../helpers';
import api from '../api';
import Ad from './Ad';

import 'bootstrap/dist/js/bootstrap.bundle.min';
import './GlobalLeaderboard.scss';

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
  const [type, setType] = useState<string>('coins');
  const [range, setRange] = useState<string>('all');
  const [data, setData] = useState<any[]>([]);

  const fetchData = () => {
    const isGames = type === 'coins' || type === 'kills' || type === 'playtime';
    const isAllTimeGames = isGames && range === 'all';
    const url = `${api.endpoint}/${isGames ? 'games' : 'stats'}/fetch?${Date.now()}`;

    const limit = isAllTimeGames ? 2000 : 100;

    api.post(url, {
      sortBy: type.startsWith('total') ? type.slice(6) : type,
      timeRange: range,
      limit: limit,
    }, (data: any) => {
      if (data.message || !Array.isArray(data)) {
        setData([]);
        return;
      }

      if (isAllTimeGames) {
        const gamesByAccount = new Map<string, any[]>();
        data.forEach((row: any) => {
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
          topGames.push(sortedGames[0]);
        });

        topGames.sort(sortFunc);
        setData(topGames.slice(0, 100));
      } else {
        setData(data);
      }
    });
  };

  const changeType = (type: string) => {
    setData([]);
    setType(type);
  };
  const changeRange = (range: string) => {
    setData([]);
    setRange(range);
  };

  useEffect(() => {
    fetchData();
  }, [type, range]);

  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'leaderboard-type', title: `${types[type]} Leaderboard` }, '*');
    }
  }, [type]);

  useEffect(() => {
    document.body.classList.add('global-leaderboard-body');
    const isStandalone = window.self === window.top;
    if (isStandalone) document.body.classList.add('global-leaderboard-standalone');
    return () => {
      document.body.classList.remove('global-leaderboard-body');
      document.body.classList.remove('global-leaderboard-standalone');
    };
  }, []);

  const isGameLeaderboard = type === 'coins' || type === 'kills' || type === 'playtime';
  const isAllTimeGameLeaderboard = isGameLeaderboard && range === 'all';

  const filteredData = data;

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
            backgroundColor: '#1a2a3a',
            border: '1px solid #2a4a6a',
            color: '#b0c4de'
          }}>
            <strong>Note:</strong> This leaderboard displays only the best game for each player. Top 10 games can be viewed on the player's profile.
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
                            style={{ color: '#e0e0e0' }}
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
                            style={{ color: isFirst ? 'white' : '#e0e0e0' }}
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
