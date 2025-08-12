
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { secondsToTime, sinceFrom, numberWithCommas, lastSeen, fixDate } from '../helpers';
import api from '../api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Profile.scss';
import cosmetics from '../game/cosmetics.json';
interface Stats {
  date: string;
  xp: number;
  mastery: number;
  kills: number;
  games: number;
  coins: number
  playtime: number;
}
interface AccountData {
  username: string;
  clan: string;
  created_at: string;
  profile_views: number;
  skins: { equipped: number, owned: number[] };
  profiles: { equipped: number, owned: number[] };
  recovered: boolean;
  bio: string;
  tags: { tags: string[], colors: string[] };
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
  const id = query.get('id');
  const clan = query.get('clan');
  const [data, setAccountData] = useState<ProfileData | null>(null);
  const [isLoading, setLoading] = useState(true);

  const fetchAccount = () => {
    let endpoint = '';
    // Default to name if username and id are provided at once (just to be safe)
    if (username) {
      endpoint = `${api.endpoint}/profile/getPublicUserInfo/${username}`;
    } else if (id) {
      endpoint = `${api.endpoint}/profile/getPublicUserInfoById/${id}`;
    }
    if (!endpoint) {
      setLoading(false);
      return;
    }
    api.post(endpoint, {}, (data) => {
      if (!data.message) {
        setAccountData(data);
      }
      setLoading(false);
    })
  }
  useEffect(() => fetchAccount(), []);

  useEffect(() => {
  const currentProfileId = data?.account?.profiles?.equipped ?? 1;
  const className = `profile-body-${currentProfileId}`;

  document.body.classList.add(className);

  return () => {
    // Clean up all profile-body-* classes
    document.body.classList.forEach((cls) => {
      if (cls.startsWith('profile-body-')) {
        document.body.classList.remove(cls);
      }
    });
  };
}, [data?.account?.profiles?.equipped]);



  const prepareGraphData = (dailyStats: Stats[]) => {
  // Sort and fill dates
  dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const allDates = [];
  let d = new Date(dailyStats[0].date);
  d.setDate(d.getDate() - 1);
  const endDate = new Date(dailyStats[dailyStats.length - 1].date);
  for (; d <= endDate; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d));
  }

  const labels = allDates.map(date => fixDate(date).toLocaleDateString());
  let runningTotal = 0;
  const dataPoints = allDates.map(date => {
    const stat = dailyStats.find(stat =>
      fixDate(new Date(stat.date)).toLocaleDateString() === fixDate(date).toLocaleDateString()
    );
    return stat ? runningTotal += stat.xp : runningTotal;
  });

  const isProfile3 = data?.account?.profiles?.equipped === 3;

  return {
    labels,
    datasets: [
      {
        label: 'Total XP',
        data: dataPoints,
        backgroundColor: isProfile3 ? '#ff6384' : 'white',        // Point fill
        borderColor: isProfile3 ? '#ff6384' : 'white',           // Line color
        pointBackgroundColor: isProfile3 ? '#ff6384' : 'white',  // Dot fill
        pointBorderColor: isProfile3 ? '#ff6384' : 'white',      // Dot border
        tension: 0.4,
      },
    ],
  };
};


  console.log('Username: ', data?.account.username)
  console.log('Clan: ', data?.account.clan)
  console.log('Profile Views: ', data?.account.profile_views)
  console.log('Created at: ', data?.account.created_at)

  if (isLoading) {
    return <h3>Loading...</h3>
  }
  if (!data?.account || (!username && !id)) {
    return <h3 className="text-center">Account not found</h3>
  }
  return (
    <section className="main-content">
      <div className="container">
        <div className='statsContent'>
      <button className="back-button" onClick={() =>{
        // ../index.html
        window.location.href = '../index.html';
      }}>X</button>
          <center>
        {data.account.clan ? (
          <h1>
            <img
              src={
                'assets/game/player/' +
                Object.values(cosmetics.skins).find(
                  (skin: any) => skin.id === data.account.skins.equipped
                )?.bodyFileName
              }
              alt="Equipped skin"
              className="equipped-skin"
            />
            {data.account.clan !== '7Z9XQ' && (
              <span style={{ color: 'yellow' }}>[{data.account.clan}]</span>
            )} {data.account.username}
          </h1>
        ) : (
          <h1>
            <img
              src={
                'assets/game/player/' +
                Object.values(cosmetics.skins).find(
                  (skin: any) => skin.id === data.account.skins.equipped
                )?.bodyFileName
              }
              alt="Equipped skin"
              className="equipped-skin"
            />
            {data.account.username}
          </h1>
        )}</center>
        <br />
        {/* Hopefully this works */}
        {data.account.tags.tags.length > 0 && (
          <div className="profile-tags" style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {data.account.tags.tags.map((tag: string, idx: number) => (
              <span
                key={idx}
                style={{
                  color: data.account.tags.colors[idx] || '#fff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.15)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <br />
        <div className='smallcluster'>
          <center>
            <br />
            {data.account.bio === ".ban" ? (
              <h4 className="graystat">Bio has been removed for violating rules.</h4>
            ) : data.account.bio ? (
              <h4 className="stat">"{data.account.bio}"</h4>
            ) : (
              <h4 className="graystat">No bio set.</h4>
            )}
            <br />
          </center>
        </div>
        <br />
        <div className='cluster'>
          <center>
        <h4 className="stat">Joined {sinceFrom(data.account.created_at)} ago</h4>
        <h4 className="stat">{data.dailyStats && data.dailyStats.length ? `Last seen ${lastSeen(data.dailyStats[0].date)}` : ''}</h4>
        <br />
        {data.rank && (
          <h4
            className="stat"
            style={data.rank === 1 ? { color: 'yellow' } : undefined}
          >
            #{data.rank} all time
          </h4>
        )}
        <br />
        <h4 className="stat">{numberWithCommas(data.account.profile_views)} profile views</h4>
        </center>
        </div>

        <br />
        <div className="row">
          <Card title="Games Played" text={data.totalStats ? numberWithCommas(data.totalStats.games) : 0} />
          <Card title="XP" text={data.totalStats ? numberWithCommas(data.totalStats.xp) : 0} />
          <Card title="Total Playtime" text={data.totalStats ? secondsToTime(data.totalStats.playtime) : 0} />
          <Card title="Skins Owned" text={data.account.skins.owned.length} />
          <Card title="Stabs" text={data.totalStats ? numberWithCommas(data.totalStats.kills) : 0} />
          <Card title="Mastery" text={data.totalStats ? numberWithCommas(data.totalStats.mastery) : 0} />
        </div>

        {!data.account.recovered && data.dailyStats && data.dailyStats.length &&
          <div className="xp-graph">
            <Line data={prepareGraphData(data.dailyStats)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: data.account.profiles.equipped === 3 ? '#666666' : 'white',
                    },
                    grid: {
                      color: data.account.profiles.equipped === 3 ? '#c9c9c9' : 'rgba(255,255,255,0.1)',
                    },
                  },
                  x: {
                    ticks: {
                      color: data.account.profiles.equipped === 3 ? '#666666' : 'white',
                    },
                    grid: {
                      color: data.account.profiles.equipped === 3 ? '#c9c9c9' : 'rgba(255,255,255,0.1)',
                    },
                  },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: data.account.profiles.equipped === 3 ? '#797979' : 'white',
                    },
                  },
                },
              }}
            />
  
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
