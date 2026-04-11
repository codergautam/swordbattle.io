import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../redux/account/slice';
import { RootState } from '../../redux/store';
import { fetchMyClan } from '../../redux/clans/slice';
import './ClansModal.scss';

import JoinClanTab from './clans/tabs/JoinClanTab';
import CreateClanTab from './clans/tabs/CreateClanTab';
import LeaderboardTab from './clans/tabs/LeaderboardTab';
import YourClanTab from './clans/tabs/YourClanTab';
import ChatTab from './clans/tabs/ChatTab';
import EditClanTab from './clans/tabs/EditClanTab';
import SearchTab from './clans/tabs/SearchTab';

interface ClansModalProps {
  account: AccountState;
}

type OutsideTab = 'join' | 'create' | 'leaderboard';
type InsideTab = 'your' | 'chat' | 'edit' | 'leaderboard' | 'search';

function ClansModal({ account }: ClansModalProps) {
  const dispatch = useDispatch();
  const clan = useSelector((s: RootState) => s.account.clan);
  const inClan = !!clan;
  const [outsideTab, setOutsideTab] = useState<OutsideTab>('join');
  const [insideTab, setInsideTab] = useState<InsideTab>('your');

  useEffect(() => {
    if (account.isLoggedIn) {
      dispatch(fetchMyClan() as any);
    }
  }, [dispatch, account.isLoggedIn]);

  return (
    <div className="clans-modal">
      <div className="clans-header">
        <h1 className="clans-title">Clans</h1>
        <div className="clans-tabs">
          {inClan ? (
            <>
              <button className={insideTab === 'your' ? 'active' : ''} onClick={() => setInsideTab('your')}>Your Clan</button>
              <button className={insideTab === 'chat' ? 'active' : ''} onClick={() => setInsideTab('chat')}>Clan Chat</button>
              <button className={insideTab === 'edit' ? 'active' : ''} onClick={() => setInsideTab('edit')}>Edit Clan</button>
              <button className={insideTab === 'leaderboard' ? 'active' : ''} onClick={() => setInsideTab('leaderboard')}>Leaderboard</button>
              <button className={insideTab === 'search' ? 'active' : ''} onClick={() => setInsideTab('search')}>Clan Search</button>
            </>
          ) : (
            <>
              <button className={outsideTab === 'join' ? 'active' : ''} onClick={() => setOutsideTab('join')}>Join a Clan</button>
              <button className={outsideTab === 'create' ? 'active' : ''} onClick={() => setOutsideTab('create')}>Create a Clan</button>
              <button className={outsideTab === 'leaderboard' ? 'active' : ''} onClick={() => setOutsideTab('leaderboard')}>Leaderboard</button>
            </>
          )}
        </div>
      </div>

      <div className="clans-body">
        {!inClan && outsideTab === 'join' && <JoinClanTab account={account} />}
        {!inClan && outsideTab === 'create' && <CreateClanTab account={account} />}
        {!inClan && outsideTab === 'leaderboard' && <LeaderboardTab />}
        {inClan && insideTab === 'your' && <YourClanTab />}
        {inClan && insideTab === 'chat' && <ChatTab />}
        {inClan && insideTab === 'edit' && <EditClanTab />}
        {inClan && insideTab === 'leaderboard' && <LeaderboardTab />}
        {inClan && insideTab === 'search' && <SearchTab />}
      </div>
    </div>
  );
}

ClansModal.displayName = 'ClansModal';
export default ClansModal;
