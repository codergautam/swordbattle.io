
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { secondsToTime, sinceFrom, numberWithCommas, lastSeen } from '../helpers';
import api from '../api';

import './Profile.scss';

interface Stats {
  date: string;
  xp: number;
  kills: number;
  games: number;
  coins: number
  playtime: number;
}
interface AccountData {
  username: string;
  created_at: string;
  profile_views: number;
}
interface ProfileData {
  account: AccountData;
  totalStats?: Stats;
  latestDayStats?: Stats;
  rank?: number;
}

export default function Profile() {
  const [query] = useSearchParams();
  const username = query.get('username');
  const [data, setAccountData] = useState<ProfileData | null>(null);
  const [isLoading, setLoading] = useState(true);

  const fetchAccount = () => {
    api.post(`${api.endpoint}/profile/getPublicUserInfo/${username}`, {}, (data) => {
      if (!data.message) {
        setAccountData(data);
      }
      setLoading(false);
    })
  }
  useEffect(() => fetchAccount(), []);

  useEffect(() => {
    document.body.classList.add('profile-body');
    return () => document.body.classList.remove('profile-body');
  }, []);

  if (isLoading) {
    return <h3>Loading...</h3>
  }
  if (!data?.account) {
    return <h3 className="text-center">Account not found</h3>
  }
  return (
    <section className="main-content">
      <div className="container">
        <h1>{data.account.username}</h1>
        <br />
        <h4>Joined {sinceFrom(data.account.created_at)} ago</h4>
        <h4>Last seen {data.latestDayStats ? lastSeen(data.latestDayStats.date) : 'never'}</h4>
        <br />

        {data.rank && <h4>#{data.rank} all time</h4>}
        <br />
        <br />
        <h4>{numberWithCommas(data.account.profile_views)} profile views</h4>
        <br />

        <div className="row">
          <Card title="Games Played" text={data.totalStats ? numberWithCommas(data.totalStats.games) : 0} />
          <Card title="XP" text={data.totalStats ? numberWithCommas(data.totalStats.xp) : 0} />
          <Card title="Total Playtime" text={data.totalStats ? secondsToTime(data.totalStats.playtime) : 0} />
          <Card title="Stabs" text={data.totalStats ? numberWithCommas(data.totalStats.kills) : 0} />
        </div>
      </div>
    </section>
  );
};

function Card({ title, text }: any) {
  return (
    <div className="col-sm-4">
      <div className="leaderboard-card">
        <div className="leaderboard-card__top">
          <h3 className="text-center">{text}</h3>
        </div>
        <div className="leaderboard-card__body">
          <div className="text-center">
            <br />
            <br />
            <h5 className="mb-0">{title}</h5>
          </div>
        </div>
      </div>
    </div>
  );
}
