import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState, updateAccountAsync } from '../../redux/account/slice';
import { RootState } from '../../redux/store';
import { fetchMyClan, fetchClanProfile, fetchChatHistory, markChatRead } from '../../redux/clans/slice';
import './ClansModal.scss';

import JoinClanTab from './clans/tabs/JoinClanTab';
import CreateClanTab from './clans/tabs/CreateClanTab';
import LeaderboardTab from './clans/tabs/LeaderboardTab';
import YourClanTab from './clans/tabs/YourClanTab';
import ChatTab from './clans/tabs/ChatTab';
import EditClanTab from './clans/tabs/EditClanTab';
import SearchTab from './clans/tabs/SearchTab';
import ProfileModal from './ProfileModal';
import Modal from './Modal';

interface ClansModalProps {
  account: AccountState;
}

type OutsideTab = 'join' | 'create' | 'leaderboard';
type InsideTab = 'your' | 'chat' | 'edit' | 'leaderboard' | 'search';

const pollIntervalMs = 3000;

function ClansModal({ account }: ClansModalProps) {
  const dispatch = useDispatch();
  const clan = useSelector((s: RootState) => s.account.clan);
  const chat = useSelector((s: RootState) => s.clans.chat);
  const lastSeenChatId = useSelector((s: RootState) => s.clans.lastSeenChatId);
  const inClan = !!clan;
  const clanId = clan?.clan?.id ?? null;

  const [outsideTab, setOutsideTab] = useState<OutsideTab>('join');
  const [insideTab, setInsideTab] = useState<InsideTab>('your');
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);
  const [userProfileOverlay, setUserProfileOverlay] = useState<string | null>(null);
  const prevInClanRef = useRef<boolean>(inClan);

  useEffect(() => {
    if (account.isLoggedIn) {
      dispatch(updateAccountAsync() as any);
      dispatch(fetchMyClan() as any);
    }
  }, [dispatch, account.isLoggedIn]);

  useEffect(() => {
    if (!account.isLoggedIn) return;
    const interval = setInterval(() => {
      dispatch(fetchMyClan() as any);
      if (clanId) {
        dispatch(fetchClanProfile(clanId) as any);
        dispatch(fetchChatHistory(clanId) as any);
      }
      if (selectedClanId && selectedClanId !== clanId) {
        dispatch(fetchClanProfile(selectedClanId) as any);
      }
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [dispatch, account.isLoggedIn, clanId, selectedClanId]);

  useEffect(() => {
    const prev = prevInClanRef.current;
    if (!prev && inClan) {
      setInsideTab('your');
      setSelectedClanId(null);
    } else if (prev && !inClan) {
      setOutsideTab('join');
      setSelectedClanId(null);
    }
    prevInClanRef.current = inClan;
  }, [inClan]);

  useEffect(() => {
    if (inClan && insideTab === 'chat') {
      dispatch(markChatRead());
    }
  }, [dispatch, inClan, insideTab, chat.length]);

  const newestChatId = chat[chat.length - 1]?.id ?? 0;
  const unreadChatCount = chat.filter((m) => m.id > lastSeenChatId).length;
  const hasUnread = inClan && insideTab !== 'chat' && newestChatId > lastSeenChatId;

  const openUserProfile = (username: string) => setUserProfileOverlay(username);
  const closeUserProfile = () => setUserProfileOverlay(null);

  return (
    <div className="clans-modal">
      <div className="clans-header">
        <h1 className="clans-title">Clans</h1>
        <div className="clans-tabs">
          {inClan ? (
            <>
              <button className={insideTab === 'your' ? 'active' : ''} onClick={() => setInsideTab('your')}>Your Clan</button>
              <button className={insideTab === 'chat' ? 'active' : ''} onClick={() => setInsideTab('chat')}>
                Clan Chat
                {hasUnread && <span className="tab-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>}
              </button>
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
        {!inClan && outsideTab === 'join' && (
          <JoinClanTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
            onOpenUserProfile={openUserProfile}
          />
        )}
        {!inClan && outsideTab === 'create' && <CreateClanTab account={account} />}
        {!inClan && outsideTab === 'leaderboard' && (
          <LeaderboardTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
          />
        )}
        {inClan && insideTab === 'your' && (
          <YourClanTab account={account} onOpenUserProfile={openUserProfile} />
        )}
        {inClan && insideTab === 'chat' && (
          <ChatTab onOpenUserProfile={openUserProfile} />
        )}
        {inClan && insideTab === 'edit' && <EditClanTab />}
        {inClan && insideTab === 'leaderboard' && (
          <LeaderboardTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
          />
        )}
        {inClan && insideTab === 'search' && (
          <SearchTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
            onOpenUserProfile={openUserProfile}
          />
        )}
      </div>

      {userProfileOverlay && (
        <Modal
          child={<ProfileModal username={userProfileOverlay} isOwnProfile={userProfileOverlay === account.username} />}
          close={closeUserProfile}
          scaleDisabled
          className="modal-fullscreen"
        />
      )}
    </div>
  );
}

ClansModal.displayName = 'ClansModal';
export default ClansModal;
