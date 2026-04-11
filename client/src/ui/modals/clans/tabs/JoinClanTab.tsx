import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { RootState } from '../../../../redux/store';
import {
  fetchRecommended, searchClans, joinClan, fetchClanProfile,
} from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import XpGateOverlay from '../XpGateOverlay';
import { clanXpRequirement } from '../constants';
import ClanProfile from '../ClanProfile';

interface JoinClanTabProps {
  account: AccountState;
}

export default function JoinClanTab({ account }: JoinClanTabProps) {
  const dispatch = useDispatch();
  const recommended = useSelector((s: RootState) => s.clans.recommended);
  const searchResults = useSelector((s: RootState) => s.clans.searchResults);
  const loading = useSelector((s: RootState) => s.clans.recommendedLoading);

  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));
  const [showRequest, setShowRequest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'tag'>('name');
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);

  const eligible = (account.xp ?? 0) >= clanXpRequirement;

  useEffect(() => {
    if (eligible) dispatch(fetchRecommended(seed, showRequest) as any);
  }, [dispatch, eligible, seed, showRequest]);

  const onRefresh = () => setSeed(Math.floor(Math.random() * 1e9));

  const onSearch = () => {
    if (!searchTerm.trim()) return;
    dispatch(searchClans(searchTerm.trim(), searchBy) as any);
  };

  const handleJoin = async (clanId: number) => {
    if (!eligible) return;
    const res: any = await dispatch(joinClan(clanId) as any);
    if (res?.requested) alert('Join request sent');
    else if (res?.joined) setSelectedClanId(null);
    else if (res?.message || res?.error) alert(res?.message ?? res?.error);
  };

  const openProfile = async (clanId: number) => {
    setSelectedClanId(clanId);
    dispatch(fetchClanProfile(clanId) as any);
  };

  if (selectedClanId !== null) {
    return (
      <div>
        <button className="back-link" onClick={() => setSelectedClanId(null)}>← Back to list</button>
        <ClanProfile clanId={selectedClanId} viewerInClan={false} onJoin={() => handleJoin(selectedClanId)} eligible={eligible} />
      </div>
    );
  }

  const list = searchResults.length > 0 ? searchResults : recommended;

  return (
    <div style={{ position: 'relative' }}>
      {!eligible && <XpGateOverlay currentXp={account.xp ?? 0} />}

      <div className="clans-search-bar">
        <button onClick={() => setShowFilters((v) => !v)} title="Filters">⚙</button>
        <button onClick={onRefresh} title="Refresh">↻</button>
        <input
          type="text"
          placeholder="Search clans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <button className={searchBy === 'tag' ? 'active' : ''} onClick={() => { setSearchBy('tag'); onSearch(); }}>By Tag</button>
        <button className={searchBy === 'name' ? 'active' : ''} onClick={() => { setSearchBy('name'); onSearch(); }}>By Name</button>
      </div>

      {showFilters && (
        <div className="clans-filters" style={{ marginBottom: 12, color: '#ccc', fontSize: 14 }}>
          <label>
            <input type="checkbox" checked={showRequest} onChange={(e) => setShowRequest(e.target.checked)} />{' '}
            Show request-to-join clans
          </label>
        </div>
      )}

      {loading && <p style={{ color: '#aaa' }}>Loading clans...</p>}

      <div className="clan-list">
        {list.map((clan) => (
          <ClanListEntry
            key={clan.id}
            clan={clan}
            showJoinButton
            onClick={() => openProfile(clan.id)}
            onJoinClick={() => handleJoin(clan.id)}
            joinDisabled={!eligible}
          />
        ))}
        {!loading && list.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No clans found.</p>
        )}
      </div>
    </div>
  );
}
