import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccountState } from '../../../redux/account/slice';
import { RootState } from '../../../redux/store';
import {
  changeRole, kickMember, transferLeadership, leaveClan, disbandClan, respondRequest, joinClan,
} from '../../../redux/clans/slice';
import { numberWithCommas, sinceFrom } from '../../../helpers';
import ClanEmblem from './ClanEmblem';
import { ClanRole, roleLabels, statusLabels, ClanStatus, clanXpRequirement, clanMemberCap } from './constants';
import { confirmDialog, promptDialog, showDialog } from '../../PromptDialog';

interface ClanProfileProps {
  clanId: number;
  viewerInClan: boolean;
  account: AccountState;
  onOpenUserProfile?: (username: string) => void;
  setLoadingLabel?: (label: string | null) => void;
}

type SortKey = 'xp' | 'mastery' | 'role' | 'joined';

const sortLabels: Record<SortKey, string> = {
  role: 'Role', xp: 'XP', mastery: 'Mastery', joined: 'Joined',
};

export default function ClanProfile({ clanId, viewerInClan, account, onOpenUserProfile, setLoadingLabel }: ClanProfileProps) {
  const dispatch = useDispatch();
  const profile = useSelector((s: RootState) => s.clans.profileCache[clanId]);
  const myMembership = useSelector((s: RootState) => s.account.clan);
  const [sort, setSort] = useState<SortKey>('xp');
  const [actionError, setActionError] = useState<string | null>(null);

  if (!profile) {
    return <p style={{ color: '#aaa' }}>Loading clan...</p>;
  }

  const myRole: ClanRole | null = viewerInClan && myMembership?.clan.id === clanId ? (myMembership!.role as ClanRole) : null;
  const isMyClan = myRole !== null;
  const canManage = myRole !== null && myRole <= ClanRole.CoLeader;
  const isLeader = myRole === ClanRole.Leader;
  const eligibleForClans = (account.xp ?? 0) >= clanXpRequirement;
  const xpUnmet = (account.xp ?? 0) < profile.xpRequirement;
  const masteryUnmet = (account.mastery ?? 0) < profile.masteryRequirement;
  const isFull = profile.memberCount >= clanMemberCap;
  const userInAnyClan = !!account.clan;
  const canShowJoin = !userInAnyClan && eligibleForClans;
  const canActuallyJoin = canShowJoin && !xpUnmet && !masteryUnmet && !isFull && profile.status !== ClanStatus.Private;

  const sorted = [...(profile.members || [])].sort((a, b) => {
    switch (sort) {
      case 'xp': return b.xp - a.xp;
      case 'mastery': return b.mastery - a.mastery;
      case 'role': return a.role - b.role;
      case 'joined': return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
    }
  });

  const wrapAction = async (label: string | null, fn: () => Promise<any>) => {
    try {
      setActionError(null);
      if (label) setLoadingLabel?.(label);
      const res = await fn();
      if (res?.message || res?.error) setActionError(res.message ?? res.error);
      return res;
    } catch (e: any) {
      setActionError(e?.message ?? 'Action failed');
    } finally {
      if (label) setLoadingLabel?.(null);
    }
  };

  const onPromote = async (m: typeof sorted[number]) => {
    const newRole = (m.role - 1) as ClanRole;
    if (newRole < ClanRole.Leader) return;
    if (newRole === ClanRole.Leader) return;
    if (newRole === ClanRole.CoLeader && !isLeader) {
      setActionError('Only the leader can promote to co-leader');
      return;
    }
    if (!await confirmDialog(`Promote ${m.username} to ${roleLabels[newRole]}?`, 'Confirm promotion', 'Promote')) return;
    await wrapAction(null, () => dispatch(changeRole(clanId, m.accountId, newRole as 0 | 1 | 2 | 3) as any));
  };

  const onDemote = async (m: typeof sorted[number]) => {
    const newRole = (m.role + 1) as ClanRole;
    if (newRole > ClanRole.Member) return;
    if (m.role === ClanRole.CoLeader && !isLeader) {
      setActionError('Only the leader can demote a co-leader');
      return;
    }
    if (!await confirmDialog(`Demote ${m.username} to ${roleLabels[newRole]}?`, 'Confirm demotion', 'Demote')) return;
    await wrapAction(null, () => dispatch(changeRole(clanId, m.accountId, newRole as 0 | 1 | 2 | 3) as any));
  };

  const onKick = async (m: typeof sorted[number]) => {
    if (!await confirmDialog(`Kick ${m.username} from the clan?`, 'Confirm kick', 'Kick')) return;
    await wrapAction(`Kicking ${m.username}...`, () => dispatch(kickMember(clanId, m.accountId) as any));
  };

  const onTransfer = async (m: typeof sorted[number]) => {
    if (!await confirmDialog(`Transfer leadership to ${m.username}? You will become co-leader.`, 'Transfer leadership', 'Transfer')) return;
    await wrapAction('Transferring leadership...', () => dispatch(transferLeadership(clanId, m.accountId) as any));
  };

  const onLeave = async () => {
    if (!await confirmDialog('You will not be able to join another clan for 24 hours.', 'Leave clan', 'Leave')) return;
    await wrapAction('Leaving clan...', () => dispatch(leaveClan(clanId) as any));
  };

  const onDisband = async () => {
    if (!await confirmDialog('This cannot be undone. You will not receive any refunds.', 'Disband clan', 'Disband')) return;
    await wrapAction('Disbanding clan...', () => dispatch(disbandClan(clanId) as any));
  };

  const onJoin = async () => {
    if (!canActuallyJoin) return;
    let reason: string | undefined;
    if (profile.status === ClanStatus.Request) {
      const result = await promptDialog({
        title: 'Request to Join',
        message: `Request to join ${profile.name}. You can include a reason.`,
        placeholder: 'Reason (optional)',
        maxLength: 300,
        multiline: true,
        confirmLabel: 'Send Request',
      });
      if (result === null) return;
      reason = result;
    } else if (!await confirmDialog(`Join ${profile.name}?`, 'Join clan', 'Join')) {
      return;
    }
    const res: any = await wrapAction(profile.status === ClanStatus.Request ? 'Sending request...' : 'Joining clan...', () => dispatch(joinClan(clanId, reason) as any));
    if (res?.requested) await showDialog('Join request sent.');
    else if (res?.message || res?.error) await showDialog(res?.message ?? res?.error, 'Clan');
  };

  const acceptReq = (reqId: number) => wrapAction(null, () => dispatch(respondRequest(clanId, reqId, true) as any));
  const rejectReq = (reqId: number) => wrapAction(null, () => dispatch(respondRequest(clanId, reqId, false) as any));

  const canPromoteRow = (m: typeof sorted[number]) => {
    if (!canManage) return false;
    if (m.accountId === account.id) return false;
    if (m.role === ClanRole.Leader) return false;
    if (m.role === ClanRole.CoLeader) return false;
    if (m.role - 1 === ClanRole.CoLeader && !isLeader) return false;
    return true;
  };
  const canDemoteRow = (m: typeof sorted[number]) => {
    if (!canManage) return false;
    if (m.accountId === account.id) return false;
    if (m.role === ClanRole.Leader) return false;
    if (m.role === ClanRole.Member) return false;
    if (m.role === ClanRole.CoLeader && !isLeader) return false;
    return true;
  };
  const canKickRow = (m: typeof sorted[number]) => {
    if (!canManage) return false;
    if (m.accountId === account.id) return false;
    if (m.role === ClanRole.Leader) return false;
    if (m.role === ClanRole.CoLeader && !isLeader) return false;
    return true;
  };
  const canTransferRow = (m: typeof sorted[number]) => {
    return isLeader && m.accountId !== account.id;
  };

  return (
    <div className="clan-profile">
      <div className="clan-profile__header">
        <ClanEmblem frameId={profile.frameId} iconId={profile.iconId} frameColor={profile.frameColor} iconColor={profile.iconColor} size={120} />
        <div className="clan-profile__heading">
          <h2><span className="tag">[{profile.tag}]</span> {profile.name}</h2>
          {profile.description && <div className="description">"{profile.description}"</div>}
          <div className="meta">
            {profile.status === ClanStatus.Private ? (
              <span className="status-label">{statusLabels[ClanStatus.Private]}</span>
            ) : (
              <span>{statusLabels[profile.status as ClanStatus]}</span>
            )}
            <span className={isFull ? 'unmet' : ''}>{profile.memberCount}/{clanMemberCap} members</span>
            <span>
              {numberWithCommas(profile.clanXp)} clan XP
              {profile.xpRank !== undefined && profile.xpRank <= 25 && (
                <span className="rank-badge"> #{profile.xpRank}</span>
              )}
            </span>
            <span>
              {numberWithCommas(profile.clanMastery)} clan mastery
              {profile.masteryRank !== undefined && profile.masteryRank <= 25 && (
                <span className="rank-badge"> #{profile.masteryRank}</span>
              )}
            </span>
            {profile.xpRequirement > 0 && (
              <span className={xpUnmet ? 'unmet' : ''}>{numberWithCommas(profile.xpRequirement)} XP required</span>
            )}
            {profile.masteryRequirement > 0 && (
              <span className={masteryUnmet ? 'unmet' : ''}>{numberWithCommas(profile.masteryRequirement)} mastery required</span>
            )}
            {profile.leaderUsername && (
              <span>
                Leader:{' '}
                <a className="user-link" onClick={(e) => { e.stopPropagation(); onOpenUserProfile?.(profile.leaderUsername!); }}>
                  {profile.leaderUsername}
                </a>
              </span>
            )}
          </div>
        </div>
        <div className="clan-profile__actions">
          {canShowJoin && (
            <button
              className="primary"
              disabled={!canActuallyJoin}
              onClick={onJoin}
            >
              {profile.status === ClanStatus.Request ? 'Request to Join' : 'Join Clan'}
            </button>
          )}
          {isMyClan && !isLeader && <button onClick={onLeave}>Leave Clan</button>}
          {isLeader && profile.memberCount === 1 && (
            <>
              <button onClick={onLeave}>Leave Clan</button>
              <button onClick={onDisband} className="danger">Disband</button>
            </>
          )}
          {isLeader && profile.memberCount > 1 && <button onClick={onLeave}>Leave Clan</button>}
        </div>
      </div>

      {actionError && <div className="clan-profile__error">{actionError}</div>}

      <div className="clan-profile__members-header">
        <div className="clan-profile__columns">
          <span className="col col-name">Name</span>
          <span className="col col-role">
            <button className={sort === 'role' ? 'active' : ''} onClick={() => setSort('role')}>{sortLabels.role}</button>
          </span>
          <span className="col col-stat">
            <button className={sort === 'xp' ? 'active' : ''} onClick={() => setSort('xp')}>{sortLabels.xp}</button>
          </span>
          <span className="col col-stat">
            <button className={sort === 'mastery' ? 'active' : ''} onClick={() => setSort('mastery')}>{sortLabels.mastery}</button>
          </span>
          <span className="col col-stat">
            <button className={sort === 'joined' ? 'active' : ''} onClick={() => setSort('joined')}>{sortLabels.joined}</button>
          </span>
          <span className="col col-actions" />
        </div>
      </div>

      <div className="clan-profile__members">
        {sorted.map((m) => (
          <div className="clan-profile__member" key={m.accountId}>
            <span className="col col-name">
              <a className="user-link" onClick={() => onOpenUserProfile?.(m.username)}>{m.username}</a>
            </span>
            <span className="col col-role">{roleLabels[m.role as ClanRole]}</span>
            <span className="col col-stat">{numberWithCommas(m.xp)}</span>
            <span className="col col-stat">{numberWithCommas(m.mastery)}</span>
            <span className="col col-stat">{sinceFrom(m.joined_at as any)} ago</span>
            <span className="col col-actions">
              {canPromoteRow(m) && <button onClick={() => onPromote(m)} title="Promote">▲</button>}
              {canDemoteRow(m) && <button onClick={() => onDemote(m)} title="Demote">▼</button>}
              {canKickRow(m) && <button className="danger" onClick={() => onKick(m)}>Kick</button>}
              {canTransferRow(m) && <button onClick={() => onTransfer(m)}>Transfer</button>}
            </span>
          </div>
        ))}
      </div>

      {canManage && profile.pendingRequests && profile.pendingRequests.length > 0 && (
        <div className="clan-profile__requests">
          <h3>Pending Requests</h3>
          {profile.pendingRequests.map((r) => (
            <div className="request-row" key={r.id}>
              <div className="request-main">
                <a className="user-link" onClick={() => onOpenUserProfile?.(r.username)}>{r.username}</a>
                <span className={r.reason ? 'request-reason' : 'request-reason muted'}>{r.reason || 'No reason given.'}</span>
              </div>
              <div className="request-actions">
                <button onClick={() => acceptReq(r.id)}>Accept</button>
                <button className="reject" onClick={() => rejectReq(r.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
