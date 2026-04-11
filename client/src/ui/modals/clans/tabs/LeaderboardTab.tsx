import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { fetchLeaderboard, fetchClanProfile } from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import ClanProfile from '../ClanProfile';

type SortKey = 'xp' | 'mastery' | 'rank';

export default function LeaderboardTab() {
  const dispatch = useDispatch();
  const [sort, setSort] = useState<SortKey>('xp');
  const rows = useSelector((s: RootState) => s.clans.leaderboard[sort]);
  const myClan = useSelector((s: RootState) => s.account.clan);
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchLeaderboard(sort) as any);
  }, [dispatch, sort]);

  const openProfile = (clanId: number) => {
    setSelectedClanId(clanId);
    dispatch(fetchClanProfile(clanId) as any);
  };

  if (selectedClanId !== null) {
    return (
      <div>
        <button className="back-link" onClick={() => setSelectedClanId(null)}>← Back to leaderboard</button>
        <ClanProfile clanId={selectedClanId} viewerInClan={!!myClan && myClan.clan.id === selectedClanId} />
      </div>
    );
  }

  return (
    <div>
      <div className="clan-leaderboard-tabs">
        <button className={sort === 'xp' ? 'active' : ''} onClick={() => setSort('xp')}>XP</button>
        <button className={sort === 'mastery' ? 'active' : ''} onClick={() => setSort('mastery')}>Mastery</button>
        <button className={sort === 'rank' ? 'active' : ''} onClick={() => setSort('rank')}>Rank</button>
      </div>

      <div className="clan-list">
        {rows.map((clan, idx) => (
          <ClanListEntry
            key={clan.id}
            clan={clan}
            xpRank={sort === 'xp' ? idx + 1 : undefined}
            masteryRank={sort === 'mastery' ? idx + 1 : undefined}
            onClick={() => openProfile(clan.id)}
          />
        ))}
        {rows.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No clans yet.</p>}
      </div>
    </div>
  );
}
