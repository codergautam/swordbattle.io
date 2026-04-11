import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { searchClans, fetchClanProfile } from '../../../../redux/clans/slice';
import ClanListEntry from '../ClanListEntry';
import ClanProfile from '../ClanProfile';

export default function SearchTab() {
  const dispatch = useDispatch();
  const results = useSelector((s: RootState) => s.clans.searchResults);
  const myClan = useSelector((s: RootState) => s.account.clan);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'tag'>('name');
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);

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
        <button className="back-link" onClick={() => setSelectedClanId(null)}>← Back to results</button>
        <ClanProfile clanId={selectedClanId} viewerInClan={!!myClan && myClan.clan.id === selectedClanId} />
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
          <ClanListEntry key={clan.id} clan={clan} onClick={() => openProfile(clan.id)} />
        ))}
        {results.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>Type a clan name or tag to search.</p>
        )}
      </div>
    </div>
  );
}
