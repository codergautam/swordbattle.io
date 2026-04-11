import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../../redux/account/slice';
import { RootState } from '../../../../redux/store';
import { searchClans, fetchClanProfile } from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import ClanProfile from '../ClanProfile';

interface SearchTabProps {
  account: AccountState;
  selectedClanId: number | null;
  setSelectedClanId: (id: number | null) => void;
  onOpenUserProfile: (username: string) => void;
}

export default function SearchTab({ account, selectedClanId, setSelectedClanId, onOpenUserProfile }: SearchTabProps) {
  const dispatch = useDispatch();
  const results = useSelector((s: RootState) => s.clans.searchResults);
  const myClan = useSelector((s: RootState) => s.account.clan);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'tag'>('name');

  const onSearch = () => {
    if (!searchTerm.trim()) return;
    dispatch(searchClans(searchTerm.trim(), searchBy) as any);
  };

  const openProfile = (clanId: number) => {
    setSelectedClanId(clanId);
    dispatch(fetchClanProfile(clanId) as any);
  };

  if (selectedClanId !== null) {
    return (
      <div>
        <button className="clan-back-button" onClick={() => setSelectedClanId(null)}>← Back to results</button>
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
      <div className="clans-search-bar">
        <input
          type="text"
          placeholder="Search for a clan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <button className={searchBy === 'tag' ? 'active' : ''} onClick={() => { setSearchBy('tag'); onSearch(); }}>By Tag</button>
        <button className={searchBy === 'name' ? 'active' : ''} onClick={() => { setSearchBy('name'); onSearch(); }}>By Name</button>
      </div>

      <div className="clan-list">
        {results.map((clan) => (
          <ClanListEntry key={clan.id} clan={clan} account={account} onClick={() => openProfile(clan.id)} />
        ))}
        {results.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>Type a clan name or tag to search.</p>
        )}
      </div>
    </div>
  );
}
