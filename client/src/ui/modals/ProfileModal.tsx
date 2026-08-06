import { memo, useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../../api';
import { numberWithCommas, secondsToTime, sinceFrom, fixDate, lastSeen } from '../../helpers';
import cosmetics from '../../game/cosmetics.json';
import SkinView from '../SkinView';
import { getSkinScale } from '../../game/skinScales';
import { withAssetVersion } from '../../assetVersion';
import './ProfileModal.scss';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ProfileModalProps {
  username?: string;
  isOwnProfile?: boolean;
  onOpenClan?: (clanId: number) => void;
}

const sorts: { key: 'coins' | 'kills' | 'playtime'; label: string }[] = [
  { key: 'coins', label: 'Coins' },
  { key: 'kills', label: 'Kills' },
  { key: 'playtime', label: 'Playtime' },
];

function skinFiles(id?: number) {
  const s = Object.values((cosmetics as any).skins).find((x: any) => x.id === id) as any;
  return s
    ? { body: s.bodyFileName, sword: s.swordFileName, scale: getSkinScale(s.id) }
    : { body: 'player.png', sword: 'sword.png', scale: 1 };
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
  return undefined;
}

function gameAge(dateLike: any) {
  const text = sinceFrom(dateLike) + ' ago';
  let color: string | undefined;
  let bold = false;
  if (text.includes('days')) {
    const days = parseInt(text.split(' ')[0], 10);
    if (days > 300) color = '#ff00bf';
    else if (days > 250) color = 'red';
    else if (days > 200) color = '#df7e00';
    else if (days > 150) color = '#ffd000';
    else if (days > 100) color = '#00ff00';
    else if (days > 50) color = '#18ca68';
    if (days > 200) bold = true;
  } else if (text.includes('2 year')) { color = '#0077ff'; bold = true; }
  else if (text.includes('1 year')) { color = '#a323ff'; bold = true; }
  return { text, color, bold };
}

const dayMs = 86400000;
const maxGraphPoints = 400;

function buildGraph(dailyStats: any[]) {
  const xpByDay = new Map<number, number>();
  let minDay = Infinity;
  let maxDay = -Infinity;
  for (const s of dailyStats) {
    const t = new Date(s.date).getTime();
    if (Number.isNaN(t)) continue;
    const day = Math.floor(t / dayMs);
    xpByDay.set(day, (xpByDay.get(day) || 0) + (s.xp || 0));
    if (day < minDay) minDay = day;
    if (day > maxDay) maxDay = day;
  }
  if (!Number.isFinite(minDay)) return null;
  const totalDays = maxDay - minDay + 2;
  const step = Math.max(1, Math.ceil(totalDays / maxGraphPoints));
  const labels: string[] = [];
  const points: number[] = [];
  let running = 0;
  for (let day = minDay - 1, i = 0; day <= maxDay; day++, i++) {
    running += xpByDay.get(day) || 0;
    if (i % step === 0 || day === maxDay) {
      labels.push(fixDate(new Date(day * dayMs)).toLocaleDateString());
      points.push(running);
    }
  }
  return {
    labels,
    datasets: [{
      label: 'Total XP',
      data: points,
      borderColor: '#5bb8ff',
      backgroundColor: 'rgba(91, 184, 255, 0.18)',
      pointRadius: 0,
      borderWidth: 3,
      fill: true,
      tension: 0.4,
    }],
  };
}

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  scales: {
    y: { beginAtZero: true, ticks: { color: '#9a9aa2' }, grid: { color: 'rgba(255,255,255,0.08)' } },
    x: { ticks: { color: '#9a9aa2', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.06)' } },
  },
  plugins: { legend: { labels: { color: '#e7e7ec' } } },
};

const ProfileModal: React.FC<ProfileModalProps> = ({ username, onOpenClan }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<any[]>([]);
  const [gameSort, setGameSort] = useState<'coins' | 'kills' | 'playtime'>('coins');

  useEffect(() => {
    if (!username) { setData(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.post(`${api.endpoint}/profile/getPublicUserInfo/${encodeURIComponent(username)}`, {}, (res: any) => {
      if (cancelled) return;
      if (res?.account) setData(res);
      else setData(null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [username]);

  useEffect(() => {
    if (!data?.account) return;
    api.post(`${api.endpoint}/games/fetch?${Date.now()}`, { sortBy: gameSort, timeRange: 'all', limit: 30, accountId: data.account.id }, (res: any) => {
      setGames(Array.isArray(res) ? res : []);
    });
  }, [data, gameSort, username]);

  const acc = data?.account;
  const ts = data?.totalStats;
  const skin = skinFiles(acc?.skins?.equipped);
  const sortedGames = useMemo(
    () => [...(games || [])].sort((a, b) => b[gameSort] - a[gameSort]).slice(0, 10),
    [games, gameSort],
  );
  const dailyStats = data?.dailyStats;
  const graphData = useMemo(
    () => (dailyStats && dailyStats.length > 1 ? buildGraph(dailyStats) : null),
    [dailyStats],
  );
  const lastOnlineText = useMemo(() => {
    if (!dailyStats || !dailyStats.length) return null;
    const latest = dailyStats.reduce(
      (l: any, s2: any) => (new Date(s2.date).getTime() > new Date(l).getTime() ? s2.date : l),
      dailyStats[0].date,
    );
    return `last online ${lastSeen(latest)}`;
  }, [dailyStats]);

  return (
    <div className="profile-modal">
      {loading ? (
        <div className="profile-empty">Loading…</div>
      ) : !acc ? (
        <div className="profile-empty">Account not found.</div>
      ) : (
        <div className="profile-scroll">
          <div
            className="profile-banner"
            style={{ backgroundImage: "linear-gradient(180deg, rgba(20,26,38,0.22), rgba(20,26,38,0.45)), url('" + withAssetVersion('assets/game/tiles/ice-new.png') + "')" }}
          >
            <div className="profile-skin"><SkinView body={skin.body} sword={skin.sword} scale={skin.scale} shadow /></div>
            <div className="profile-id">
              <div className="profile-name">
                {data.clan?.clan && (
                  <span
                    className={`profile-clan${data.clan.clan.id && onOpenClan ? ' clickable' : ''}`}
                    onClick={() => { if (data.clan.clan.id && onOpenClan) onOpenClan(data.clan.clan.id); }}
                  >[{data.clan.clan.tag}]</span>
                )}
                {acc.username}
              </div>
              {(acc.tags?.tags?.length > 0 || acc.adSupporter) && (
                <div className="profile-tags">
                  {[
                    ...(acc.tags?.tags || []).map((tag: string, i: number) => ({ tag, color: acc.tags.colors?.[i] || '#fff' })),
                    ...(acc.adSupporter ? [{ tag: 'Ad Supporter', color: '#ffe000' }] : []),
                  ].map((t, i) => (
                    <span key={i} className="profile-tag" style={{ color: t.color }}>{t.tag}</span>
                  ))}
                </div>
              )}
              <div className="profile-meta">
                <span>Joined {sinceFrom(acc.created_at)} ago</span>
                <span>{numberWithCommas(acc.profile_views || 0)} profile views</span>
                {data.rank && <span style={getRankColor(data.rank) ? { color: getRankColor(data.rank) } : undefined}>#{data.rank} all-time</span>}
              </div>
            </div>
          </div>

          <div className="profile-body">
            <div className="profile-bio">
              {lastOnlineText && <span className="profile-lastseen">{lastOnlineText}</span>}
              {acc.bio === '.ban' ? 'Bio removed for violating rules.' : acc.bio ? `"${acc.bio}"` : 'No bio set'}
            </div>

            <div className="profile-stats">
              <div className="pstat"><div className="pstat-v c-games">{ts ? numberWithCommas(ts.games) : 0}</div><div className="pstat-l">Games Played</div></div>
              <div className="pstat"><div className="pstat-v c-xp">{ts ? numberWithCommas(ts.xp) : 0}</div><div className="pstat-l">XP</div></div>
              <div className="pstat"><div className="pstat-v c-mastery">{ts ? numberWithCommas(ts.mastery) : 0}</div><div className="pstat-l">Mastery</div></div>
              <div className="pstat"><div className="pstat-v c-kills">{ts ? numberWithCommas(ts.kills) : 0}</div><div className="pstat-l">Stabs</div></div>
              <div className="pstat"><div className="pstat-v c-time">{ts ? secondsToTime(ts.playtime) : 0}</div><div className="pstat-l">Total Playtime</div></div>
              <div className="pstat"><div className="pstat-v c-skins">{acc.skins?.owned?.length ?? 0}</div><div className="pstat-l">Skins Owned</div></div>
            </div>

            <div className="profile-section">
              <div className="profile-section-head">
                <h3>Top 10 Games</h3>
                <div className="profile-gsort">
                  {sorts.map(({ key, label }) => (
                    <button key={key} className={gameSort === key ? 'active' : ''} onClick={() => setGameSort(key)}>{label}</button>
                  ))}
                </div>
              </div>
              <table className="profile-games">
                <thead>
                  <tr><th>#</th><th>Coins</th><th>Kills</th><th>Playtime</th><th>Time Created</th></tr>
                </thead>
                <tbody>
                  {sortedGames.length === 0 ? (
                    <tr><td colSpan={5} className="profile-games-empty">No games found.</td></tr>
                  ) : sortedGames.map((g, i) => {
                    const age = gameAge(g.date);
                    return (
                      <tr key={i}>
                        <td><b>{i + 1}</b></td>
                        <td>{numberWithCommas(g.coins)}</td>
                        <td>{numberWithCommas(g.kills)}</td>
                        <td>{secondsToTime(g.playtime)}</td>
                        <td style={age.color ? { color: age.color } : undefined}>{age.bold ? <b>{age.text}</b> : age.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {graphData && (
              <div className="profile-section">
                <div className="profile-section-head"><h3>Total XP</h3></div>
                <div className="profile-chart">
                  <Line data={graphData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MemoProfileModal = memo(ProfileModal);
MemoProfileModal.displayName = 'ProfileModal';
export default MemoProfileModal;
