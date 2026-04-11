import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { RootState } from '../../../../redux/store';
import { fetchLeaderboard, fetchClanProfile } from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import ClanProfile from '../ClanProfile';

type SortKey = 'xp' | 'mastery';

interface LeaderboardTabProps {
  account: AccountState;
  selectedClanId: number | null;
  setSelectedClanId: (id: number | null) => void;
  onOpenUserProfile?: (username: string) => void;
}

export default function LeaderboardTab({ account, selectedClanId, setSelectedClanId, onOpenUserProfile }: LeaderboardTabProps) {
  const dispatch = useDispatch();
  const [sort, setSort] = useState<SortKey>('xp');
  const rows = useSelector((s: RootState) => s.clans.leaderboard[sort]);
  const myClan = useSelector((s: RootState) => s.account.clan);

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
        <button className="clan-back-button" onClick={() => setSelectedClanId(null)}>← Back to leaderboard</button>
        <ClanProfile
          clanId={selectedClanId}
          viewerInClan={!!myClan && myClan.clan.id === selectedClanId}
          account={account}
          onOpenUserProfile={onOpenUserProfile}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="clan-leaderboard-tabs">
        <button className={sort === 'xp' ? 'active' : ''} onClick={() => setSort('xp')}>XP</button>
        <button className={sort === 'mastery' ? 'active' : ''} onClick={() => setSort('mastery')}>Mastery</button>
      </div>

      <div className="clan-list">
        {rows.map((clan) => (
          <ClanListEntry
            key={clan.id}
            clan={clan}
            account={account}
            statSort={sort}
            onClick={() => openProfile(clan.id)}
          />
        ))}
        {rows.length === 0 && <p style={{ color: '#888', textAlign: 'center' }}>No clans yet.</p>}
      </div>
    </div>
  );
}
