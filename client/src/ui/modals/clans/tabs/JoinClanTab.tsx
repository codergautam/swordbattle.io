import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { RootState } from '../../../../redux/store';
import {
  fetchRecommended, searchClans, fetchClanProfile,
} from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import XpGateOverlay from '../XpGateOverlay';
import { clanXpRequirement } from '../constants';
import ClanProfile from '../ClanProfile';

interface JoinClanTabProps {
  account: AccountState;
  selectedClanId: number | null;
  setSelectedClanId: (id: number | null) => void;
  onOpenUserProfile: (username: string) => void;
  setLoadingLabel: (label: string | null) => void;
}

export default function JoinClanTab({ account, selectedClanId, setSelectedClanId, onOpenUserProfile, setLoadingLabel }: JoinClanTabProps) {
  const dispatch = useDispatch();
  const recommended = useSelector((s: RootState) => s.clans.recommended);
  const searchResults = useSelector((s: RootState) => s.clans.searchResults);
  const loading = useSelector((s: RootState) => s.clans.recommendedLoading);

  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));
  const [showRequest, setShowRequest] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'tag'>('name');

  const eligible = (account.xp ?? 0) >= clanXpRequirement;

  useEffect(() => {
    if (eligible) dispatch(fetchRecommended(seed, showRequest) as any);
  }, [dispatch, eligible, seed, showRequest]);

  const onRefresh = () => setSeed(Math.floor(Math.random() * 1e9));

  const onSearch = () => {
    if (!searchTerm.trim()) return;
    dispatch(searchClans(searchTerm.trim(), searchBy) as any);
  };

  const openProfile = async (clanId: number) => {
    setSelectedClanId(clanId);
    dispatch(fetchClanProfile(clanId) as any);
  };

  if (selectedClanId !== null) {
    return (
      <div>
        <button className="clan-back-button" onClick={() => setSelectedClanId(null)}>← Back to list</button>
        <ClanProfile
          clanId={selectedClanId}
          viewerInClan={false}
          account={account}
          onOpenUserProfile={onOpenUserProfile}
          setLoadingLabel={setLoadingLabel}
        />
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
            account={account}
            onClick={() => openProfile(clan.id)}
          />
        ))}
        {!loading && list.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No clans found.</p>
        )}
      </div>
    </div>
  );
}
