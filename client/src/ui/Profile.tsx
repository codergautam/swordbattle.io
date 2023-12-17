
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { secondsToTime, sinceFrom, numberWithCommas, lastSeen } from '../helpers';
import api from '../api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Profile.scss';
import cosmetics from '../game/cosmetics.json';
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
  skins: { equipped: number, owned: number[] };
}
interface ProfileData {
  account: AccountData;
  totalStats?: Stats;
  dailyStats?: Stats[];
  rank?: number;
}

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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

  const prepareGraphData = (dailyStats: Stats[]) => {
    const labels = dailyStats.map(stat => new Date(stat.date).toLocaleDateString());
    const data = dailyStats.map(stat => stat.xp);
    return {
      labels,
      datasets: [
        {
          label: 'Total XP',
          data,
          fill: false,
          backgroundColor: 'rgb(75, 192, 192)',
          borderColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
        },
      ],
    };
  };

  if (isLoading) {
    return <h3>Loading...</h3>
  }
  if (!data?.account) {
    return <h3 className="text-center">Account not found</h3>
  }
  return (
    <section className="main-content">
      <div className="container">
        <div className='statsContent'>
      <button className="back-button" onClick={() => window.location.href = '/'}>X</button>
          <center>
        <h1>
        <img src={'/assets/game/player/'+Object.values(cosmetics.skins).find((skin: any) => skin.id === data.account.skins.equipped)?.bodyFileName} alt="Equipped skin" className="equipped-skin" />

          {data.account.username}</h1></center>
        <br />
        <div className='cluster'>
          <center>
        <h4 className="stat">Joined {sinceFrom(data.account.created_at)} ago</h4>
        <h4 className="stat">{data.dailyStats && data.dailyStats.length ? `Last seen ${lastSeen(data.dailyStats[data.dailyStats.length - 1].date)}` : ''}</h4>
        <br />

        {data.rank && <h4 className="stat">#{data.rank} all time</h4>}
        <h4 className="stat">{numberWithCommas(data.account.profile_views)} profile views</h4>
        </center>
        </div>

        <br />
        <div className="row">
          <Card title="Games Played" text={data.totalStats ? numberWithCommas(data.totalStats.games) : 0} />
          <Card title="XP" text={data.totalStats ? numberWithCommas(data.totalStats.xp) : 0} />
          <Card title="Total Playtime" text={data.totalStats ? secondsToTime(data.totalStats.playtime) : 0} />
          <Card title="Stabs" text={data.totalStats ? numberWithCommas(data.totalStats.kills) : 0} />
          <Card title="Skins Owned" text={data.account.skins.owned.length} />
        </div>

        {data.dailyStats &&
          <div className="xp-graph">
            <Line data={prepareGraphData(data.dailyStats)} options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }} />
          </div>
        }
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
