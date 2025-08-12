import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { numberWithCommas, secondsToTime, sinceFrom } from '../helpers';
import api from '../api';

import 'bootstrap/dist/js/bootstrap.bundle.min';
import './GlobalLeaderboard.scss';
import cosmetics from '../game/cosmetics.json';

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
};

export function GlobalLeaderboard() {
  const [type, setType] = useState<string>('coins');
  const [range, setRange] = useState<string>('all');
  const [data, setData] = useState<any[]>([]);

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
    document.body.classList.add('global-leaderboard-body');
    return () => document.body.classList.remove('global-leaderboard-body');
  }, []);

  return (
    <section className="main-content">
      <div className="container">
        <h1>{types[type]} Leaderboard</h1>
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

        <div className="row">
          {data.length > 2 ? (<>
            <LeaderboardCard type={type} row={data[0]} index={0} />
            <LeaderboardCard type={type} row={data[1]} index={1} />
            <LeaderboardCard type={type} row={data[2]} index={2} />
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
            {data.slice(3).map((row) => {
              const index = data.indexOf(row);
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
                            {row.clan && row.clan !== '7Z9XQ' && <span style={{ color: '#b0b000' }} className='clan'>[{row.clan}] </span>}
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
                    if (days > 300) style.color = '#ff006aff'; // pink
                    else if (days > 250) style.color = 'red';
                    else if (days > 200) style.color = '#eb9423ff';
                    else if (days > 150) style.color = '#ebdd23';
                    else if (days > 100) style.color = '#0c8f0c';
                    else if (days > 50) style.color = '#006400';
                    if (days > 200) isBold = true;
                  } else if (agoText.includes('2 year')) {
                    style.color = '#00ffd5ff'; // dark purple/blue
                    isBold = true;
                  } else if (agoText.includes('1 year')) {
                    style.color = '#4b0082';
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
                            {row.clan && row.clan !== '7Z9XQ' && (
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
                {(() => {
                  const agoText = sinceFrom(row.date) + ' ago';
                  let style: React.CSSProperties = {};
                  let isBold = false;
                  if (agoText.includes('days')) {
                    const days = parseInt(agoText.split(' ')[0], 10);
                    if (days > 300) style.color = '#ff006aff'; // pink
                    else if (days > 250) style.color = 'red';
                    else if (days > 200) style.color = '#eb9423ff';
                    else if (days > 150) style.color = '#ebdd23';
                    else if (days > 100) style.color = '#0c8f0c';
                    else if (days > 50) style.color = '#006400';
                    if (days > 200) isBold = true;
                  } else if (agoText.includes('2 year')) {
                    style.color = '#00ffd5ff'; // dark purple/blue
                    isBold = true;
                  } else if (agoText.includes('1 year')) {
                    style.color = '#4b0082';
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
