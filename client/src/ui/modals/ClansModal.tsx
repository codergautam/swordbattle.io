import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState, setAccount, updateAccountAsync } from '../../redux/account/slice';
import { RootState } from '../../redux/store';
import {
  fetchMyClan, fetchClanProfile, fetchChatHistory, setLastSeenChatId,
} from '../../redux/clans/slice';
import api from '../../api';
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

function formatCooldown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  if (total >= 3600) {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (total >= 60) {
    const m = Math.floor(total / 60);
    return `${m}m`;
  }
  return `${total}s`;
}

function ClansModal({ account }: ClansModalProps) {
  const dispatch = useDispatch();
  const clan = useSelector((s: RootState) => s.account.clan);
  const clanCooldownUntil = useSelector((s: RootState) => s.account.clanCooldownUntil);
  const chat = useSelector((s: RootState) => s.clans.chat);
  const lastSeenChatId = useSelector((s: RootState) => s.clans.lastSeenChatId);
  const inClan = !!clan;
  const clanId = clan?.clan?.id ?? null;

  const [outsideTab, setOutsideTab] = useState<OutsideTab>('join');
  const [insideTab, setInsideTab] = useState<InsideTab>('your');
  const [selectedClanId, setSelectedClanId] = useState<number | null>(null);
  const [userProfileOverlay, setUserProfileOverlay] = useState<string | null>(null);
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
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
      api.postAsync(`${api.endpoint}/profile/getPrivateUserInfo?now=${Date.now()}`, {})
        .then((res: any) => {
          if (res?.account && !res?.error && typeof res?.statusCode !== 'number') {
            res.account.secret = account.secret;
            dispatch(setAccount(res.account));
          }
        })
        .catch(() => {});
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
  }, [dispatch, account.isLoggedIn, account.secret, clanId, selectedClanId]);

  useEffect(() => {
    if (!clanCooldownUntil) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clanCooldownUntil]);

  useEffect(() => {
    const prev = prevInClanRef.current;
    if (!prev && inClan) {
      setInsideTab('your');
      setSelectedClanId(null);
      setLoadingLabel(null);
    } else if (prev && !inClan) {
      setOutsideTab('join');
      setSelectedClanId(null);
      setLoadingLabel(null);
    }
    prevInClanRef.current = inClan;
  }, [inClan]);

  useEffect(() => {
    if (inClan && insideTab === 'chat' && clanId) {
      const newest = chat[chat.length - 1]?.id ?? 0;
      if (newest > lastSeenChatId) {
        dispatch(setLastSeenChatId({ clanId, id: newest }));
      }
    }
  }, [dispatch, inClan, insideTab, clanId, chat, lastSeenChatId]);

  const newestChatId = chat[chat.length - 1]?.id ?? 0;
  const unreadChatCount = chat.filter((m) => m.id > lastSeenChatId).length;
  const hasUnread = inClan && insideTab !== 'chat' && newestChatId > lastSeenChatId && unreadChatCount > 0;

  const openUserProfile = (username: string) => setUserProfileOverlay(username);
  const closeUserProfile = () => setUserProfileOverlay(null);

  const switchOutsideTab = (tab: OutsideTab) => {
    setOutsideTab(tab);
    setSelectedClanId(null);
  };
  const switchInsideTab = (tab: InsideTab) => {
    setInsideTab(tab);
    setSelectedClanId(null);
  };

  const cooldownRemaining = clanCooldownUntil
    ? new Date(clanCooldownUntil).getTime() - nowTick
    : 0;
  const showCooldownBanner = !inClan && cooldownRemaining > 0;

  return (
    <div className="clans-modal">
      <div className="clans-header">
        <h1 className="clans-title">Clans</h1>
        <div className="clans-tabs">
          {inClan ? (
            <>
              <button className={insideTab === 'your' ? 'active' : ''} onClick={() => switchInsideTab('your')}>Your Clan</button>
              <button className={insideTab === 'chat' ? 'active' : ''} onClick={() => switchInsideTab('chat')}>
                Clan Chat
                {hasUnread && <span className="tab-badge">{unreadChatCount > 9 ? '9+' : unreadChatCount}</span>}
              </button>
              <button className={insideTab === 'edit' ? 'active' : ''} onClick={() => switchInsideTab('edit')}>Edit Clan</button>
              <button className={insideTab === 'leaderboard' ? 'active' : ''} onClick={() => switchInsideTab('leaderboard')}>Leaderboard</button>
              <button className={insideTab === 'search' ? 'active' : ''} onClick={() => switchInsideTab('search')}>Clan Search</button>
            </>
          ) : (
            <>
              <button className={outsideTab === 'join' ? 'active' : ''} onClick={() => switchOutsideTab('join')}>Join a Clan</button>
              <button className={outsideTab === 'create' ? 'active' : ''} onClick={() => switchOutsideTab('create')}>Create a Clan</button>
              <button className={outsideTab === 'leaderboard' ? 'active' : ''} onClick={() => switchOutsideTab('leaderboard')}>Leaderboard</button>
            </>
          )}
        </div>
      </div>

      {showCooldownBanner && (
        <div className="clans-cooldown-banner">
          You can't join or create another clan for <strong>{formatCooldown(cooldownRemaining)}</strong> — you recently left one.
        </div>
      )}

      <div className="clans-body">
        {!inClan && outsideTab === 'join' && (
          <JoinClanTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
            onOpenUserProfile={openUserProfile}
            setLoadingLabel={setLoadingLabel}
          />
        )}
        {!inClan && outsideTab === 'create' && <CreateClanTab account={account} setLoadingLabel={setLoadingLabel} />}
        {!inClan && outsideTab === 'leaderboard' && (
          <LeaderboardTab
            account={account}
            selectedClanId={selectedClanId}
            setSelectedClanId={setSelectedClanId}
            onOpenUserProfile={openUserProfile}
          />
        )}
        {inClan && insideTab === 'your' && (
          <YourClanTab account={account} onOpenUserProfile={openUserProfile} setLoadingLabel={setLoadingLabel} />
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
            onOpenUserProfile={openUserProfile}
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

      {loadingLabel && (
        <div className="clans-loading-overlay">
          <div className="clans-loading-overlay__inner">
            <div className="spinner" />
            <div className="label">{loadingLabel}</div>
          </div>
        </div>
      )}

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
