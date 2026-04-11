import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import {
  changeRole, kickMember, transferLeadership, leaveClan, disbandClan, respondRequest, fetchClanProfile,
} from '../../../redux/clans/slice';
import { numberWithCommas, sinceFrom } from '../../../helpers';
import ClanEmblem from './ClanEmblem';
import { ClanRole, roleLabels, statusLabels, ClanStatus } from './constants';

interface ClanProfileProps {
  clanId: number;
  viewerInClan: boolean;
  onJoin?: () => void;
  eligible?: boolean;
}

type SortKey = 'xp' | 'mastery' | 'username' | 'role' | 'joined';

const sortLabels: Record<SortKey, string> = {
  xp: 'XP', mastery: 'Mastery', username: 'Name', role: 'Role', joined: 'Joined',
};

export default function ClanProfile({ clanId, viewerInClan, onJoin, eligible }: ClanProfileProps) {
  const dispatch = useDispatch();
  const profile = useSelector((s: RootState) => s.clans.profileCache[clanId]);
  const myMembership = useSelector((s: RootState) => s.account.clan);
  const [sort, setSort] = useState<SortKey>('xp');

  if (!profile) {
    return <p style={{ color: '#aaa' }}>Loading clan...</p>;
  }

  const myRole: ClanRole | null = viewerInClan && myMembership?.clan.id === clanId ? (myMembership!.role as ClanRole) : null;
  const isMyClan = myRole !== null;
  const canManage = myRole !== null && myRole <= ClanRole.CoLeader;
  const isLeader = myRole === ClanRole.Leader;

  const sorted = [...(profile.members || [])].sort((a, b) => {
    switch (sort) {
      case 'xp': return b.xp - a.xp;
      case 'mastery': return b.mastery - a.mastery;
      case 'username': return a.username.localeCompare(b.username);
      case 'role': return a.role - b.role;
      case 'joined': return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    }
  });

  const onChangeRole = async (targetId: number, newRole: ClanRole) => {
    await dispatch(changeRole(clanId, targetId, newRole as 0 | 1 | 2 | 3) as any);
  };

  const onKick = async (targetId: number, name: string) => {
    if (!window.confirm(`Kick ${name} from the clan?`)) return;
    await dispatch(kickMember(clanId, targetId) as any);
  };

  const onTransfer = async (targetId: number, name: string) => {
    if (!window.confirm(`Transfer leadership to ${name}? You will become co-leader.`)) return;
    await dispatch(transferLeadership(clanId, targetId) as any);
  };

  const onLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this clan?')) return;
    await dispatch(leaveClan(clanId) as any);
  };

  const onDisband = async () => {
    if (!window.confirm('Disband the clan? This cannot be undone.')) return;
    await dispatch(disbandClan(clanId) as any);
  };

  const acceptReq = async (reqId: number) => {
    await dispatch(respondRequest(clanId, reqId, true) as any);
    dispatch(fetchClanProfile(clanId) as any);
  };
  const rejectReq = async (reqId: number) => {
    await dispatch(respondRequest(clanId, reqId, false) as any);
    dispatch(fetchClanProfile(clanId) as any);
  };

  return (
    <div className="clan-profile">
      <div className="clan-profile__header">
        <ClanEmblem frameId={profile.frameId} iconId={profile.iconId} frameColor={profile.frameColor} iconColor={profile.iconColor} size={120} />
        <div className="clan-profile__heading">
          <h2><span className="tag">[{profile.tag}]</span> {profile.name}</h2>
          {profile.description && <div className="description">"{profile.description}"</div>}
          <div className="meta">
            <span>{statusLabels[profile.status as ClanStatus]}</span>
            <span>{profile.memberCount}/25 members</span>
            <span>{numberWithCommas(profile.clanXp)} clan XP</span>
            {profile.xpRequirement > 0 && <span>{numberWithCommas(profile.xpRequirement)} XP required</span>}
            {profile.masteryRequirement > 0 && <span>{numberWithCommas(profile.masteryRequirement)} mastery required</span>}
          </div>
        </div>
        <div className="clan-profile__actions">
          {!viewerInClan && (
            <button
              disabled={!eligible}
              onClick={onJoin}
              style={{ background: '#33cc33' }}
            >
              {profile.status === ClanStatus.Request ? 'Request to Join' : profile.status === ClanStatus.Private ? 'Private' : 'Join Clan'}
            </button>
          )}
          {isMyClan && !isLeader && <button onClick={onLeave}>Leave Clan</button>}
          {isLeader && (
            <>
              <button onClick={onLeave}>Leave Clan</button>
              <button onClick={onDisband} style={{ background: '#aa1122' }}>Disband</button>
            </>
          )}
        </div>
      </div>

      <div className="clan-profile__members-header">
        <h3>Members ({sorted.length})</h3>
        <div className="sort-buttons">
          {(Object.keys(sortLabels) as SortKey[]).map((k) => (
            <button key={k} className={sort === k ? 'active' : ''} onClick={() => setSort(k)}>{sortLabels[k]}</button>
          ))}
        </div>
      </div>

      <div>
        {sorted.map((m) => (
          <div className="clan-profile__member" key={m.accountId}>
            <span className="member-name">{m.username}</span>
            <span className="member-role">{roleLabels[m.role as ClanRole]}</span>
            <span className="member-stat">{numberWithCommas(m.xp)} XP</span>
            <span className="member-stat">{numberWithCommas(m.mastery)} mastery</span>
            <span className="member-stat">{sinceFrom(m.joined_at as any)} ago</span>
            {canManage && m.role !== ClanRole.Leader && m.accountId !== myMembership?.clan?.id && myRole !== null && (
              <div className="member-actions">
                {m.role > ClanRole.CoLeader && isLeader && (
                  <button onClick={() => onChangeRole(m.accountId, ClanRole.CoLeader)}>→ Co-Leader</button>
                )}
                {m.role > ClanRole.Elite && (
                  <button onClick={() => onChangeRole(m.accountId, ClanRole.Elite)}>→ Elite</button>
                )}
                {m.role < ClanRole.Member && (m.role > ClanRole.CoLeader || isLeader) && (
                  <button onClick={() => onChangeRole(m.accountId, ClanRole.Member)}>→ Member</button>
                )}
                {(m.role > ClanRole.CoLeader || isLeader) && (
                  <button onClick={() => onKick(m.accountId, m.username)}>Kick</button>
                )}
                {isLeader && (
                  <button onClick={() => onTransfer(m.accountId, m.username)}>Transfer</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {canManage && profile.pendingRequests && profile.pendingRequests.length > 0 && (
        <div className="clan-profile__requests">
          <h3>Pending Requests</h3>
          {profile.pendingRequests.map((r) => (
            <div className="request-row" key={r.id}>
              <span className="username">{r.username}</span>
              <button onClick={() => acceptReq(r.id)}>Accept</button>
              <button className="reject" onClick={() => rejectReq(r.id)}>Reject</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
