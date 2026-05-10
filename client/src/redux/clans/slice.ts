import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api';
import { ClanSummary, AccountClan, setClan, clearClan, updateAccountAsync } from '../account/slice';

export type ClanRoleId = 0 | 1 | 2 | 3;

export type ClanMemberRow = {
  accountId: number;
  username: string;
  role: ClanRoleId;
  joined_at: string;
  contributedXp: number;
  xp: number;
  mastery: number;
  skinId: number;
};

export type ClanProfile = ClanSummary & {
  members: ClanMemberRow[];
  pendingRequests: { id: number; accountId: number; username: string; created_at: string }[];
};

export type ClanChatRow = {
  id: number;
  clanId: number;
  accountId: number | null;
  username: string | null;
  skinId: number | null;
  content: string;
  type: number;
  metadata: Record<string, any> | null;
  created_at: string;
};

export type ClanConfig = {
  clanCreationCost: number;
  clanXpRequirement: number;
  clanMemberCap: number;
};

type ClansState = {
  recommended: ClanSummary[];
  recommendedLoading: boolean;
  searchResults: ClanSummary[];
  searchLoading: boolean;
  leaderboard: { xp: ClanSummary[]; mastery: ClanSummary[] };
  leaderboardLoading: boolean;
  profileCache: Record<number, ClanProfile>;
  profileLoading: boolean;
  chat: ClanChatRow[];
  chatLoading: boolean;
  lastSeenChatId: number;
  config: ClanConfig | null;
  error: string | null;
};

function readLastSeenChatId(clanId: number | null | undefined): number {
  if (!clanId) return 0;
  try {
    const v = window.localStorage.getItem(`clanChatLastSeen:${clanId}`);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

function writeLastSeenChatId(clanId: number, id: number) {
  try {
    window.localStorage.setItem(`clanChatLastSeen:${clanId}`, String(id));
  } catch {}
}

const initialState: ClansState = {
  recommended: [],
  recommendedLoading: false,
  searchResults: [],
  searchLoading: false,
  leaderboard: { xp: [], mastery: [] },
  leaderboardLoading: false,
  profileCache: {},
  profileLoading: false,
  chat: [],
  chatLoading: false,
  lastSeenChatId: 0,
  config: null,
  error: null,
};

const slice = createSlice({
  name: 'clans',
  initialState,
  reducers: {
    setRecommended(state, action: PayloadAction<ClanSummary[]>) {
      state.recommended = action.payload;
    },
    setRecommendedLoading(state, action: PayloadAction<boolean>) {
      state.recommendedLoading = action.payload;
    },
    setSearchResults(state, action: PayloadAction<ClanSummary[]>) {
      state.searchResults = action.payload;
    },
    setSearchLoading(state, action: PayloadAction<boolean>) {
      state.searchLoading = action.payload;
    },
    setLeaderboard(state, action: PayloadAction<{ key: 'xp' | 'mastery'; rows: ClanSummary[] }>) {
      state.leaderboard[action.payload.key] = action.payload.rows;
    },
    setLeaderboardLoading(state, action: PayloadAction<boolean>) {
      state.leaderboardLoading = action.payload;
    },
    putProfile(state, action: PayloadAction<ClanProfile>) {
      state.profileCache[action.payload.id] = action.payload;
    },
    setProfileLoading(state, action: PayloadAction<boolean>) {
      state.profileLoading = action.payload;
    },
    setChat(state, action: PayloadAction<ClanChatRow[]>) {
      state.chat = action.payload;
    },
    appendChat(state, action: PayloadAction<ClanChatRow[]>) {
      const existingIds = new Set(state.chat.map((m) => m.id));
      for (const m of action.payload) {
        if (!existingIds.has(m.id)) state.chat.push(m);
      }
      state.chat.sort((a, b) => a.id - b.id);
    },
    clearChat(state) {
      state.chat = [];
      state.lastSeenChatId = 0;
    },
    setChatLoading(state, action: PayloadAction<boolean>) {
      state.chatLoading = action.payload;
    },
    setLastSeenChatId(state, action: PayloadAction<{ clanId: number; id: number }>) {
      const { clanId, id } = action.payload;
      if (id > state.lastSeenChatId) {
        state.lastSeenChatId = id;
        writeLastSeenChatId(clanId, id);
      }
    },
    hydrateLastSeenChatId(state, action: PayloadAction<number>) {
      state.lastSeenChatId = readLastSeenChatId(action.payload);
    },
    markChatRead(state, action: PayloadAction<number | undefined>) {
      const newest = state.chat[state.chat.length - 1]?.id ?? 0;
      if (newest > state.lastSeenChatId) {
        state.lastSeenChatId = newest;
        if (action.payload) writeLastSeenChatId(action.payload, newest);
      }
    },
    setConfig(state, action: PayloadAction<ClanConfig | null>) {
      state.config = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setRecommended, setRecommendedLoading,
  setSearchResults, setSearchLoading,
  setLeaderboard, setLeaderboardLoading,
  putProfile, setProfileLoading,
  setChat, appendChat, clearChat, setChatLoading, markChatRead,
  setLastSeenChatId, hydrateLastSeenChatId, setConfig,
  setError,
} = slice.actions;

export default slice.reducer;

const post = (path: string, body: any = {}): Promise<any> => api.postAsync(`${api.endpoint}${path}?now=${Date.now()}`, body);

// NestJS error responses (4xx/5xx) come back as { statusCode, message, ... }.
// Polled endpoints must NOT mutate redux state on these — otherwise a transient
// 429 from the throttler wipes the user's clan from local state.
function isErrorResponse(res: any): boolean {
  if (!res || typeof res !== 'object') return true;
  if (typeof res.statusCode === 'number' && res.statusCode >= 400) return true;
  return false;
}

export const fetchMyClan = () => async (dispatch: any, getState: any) => {
  const res = await post('/clans/me');
  if (isErrorResponse(res)) return res;
  if (res?.config) dispatch(setConfig(res.config));
  if (res?.clan) {
    const previousClanId = getState().account.clan?.clan?.id ?? null;
    const accountClan: AccountClan = {
      clan: {
        id: res.clan.id,
        tag: res.clan.tag,
        name: res.clan.name,
        frameId: res.clan.frameId,
        iconId: res.clan.iconId,
        frameColor: res.clan.frameColor,
        iconColor: res.clan.iconColor,
        description: res.clan.description,
        status: res.clan.status,
        xpRequirement: res.clan.xpRequirement,
        masteryRequirement: res.clan.masteryRequirement,
        clanXp: res.clan.clanXp,
        clanMastery: res.clan.clanMastery,
        memberCount: res.clan.memberCount,
        leaderId: res.clan.leaderId,
        leaderUsername: res.clan.leaderUsername,
        xpRank: res.clan.xpRank,
        masteryRank: res.clan.masteryRank,
      },
      role: res.role,
      contributedXp: res.contributedXp,
    };
    dispatch(setClan(accountClan));
    dispatch(putProfile(res.clan));
    if (previousClanId !== res.clan.id) {
      dispatch(hydrateLastSeenChatId(res.clan.id));
    }
  } else {
    dispatch(clearClan());
  }
  return res;
};

export const fetchRecommended = (seed?: number, showRequest?: boolean, showIneligible?: boolean) => async (dispatch: any) => {
  dispatch(setRecommendedLoading(true));
  try {
    const res = await post('/clans/recommended', { seed, showRequest, showIneligible });
    if (isErrorResponse(res)) return res;
    if (Array.isArray(res)) dispatch(setRecommended(res));
  } finally {
    dispatch(setRecommendedLoading(false));
  }
};

export const fetchLeaderboard = (sort: 'xp' | 'mastery') => async (dispatch: any) => {
  dispatch(setLeaderboardLoading(true));
  try {
    const res = await post('/clans/leaderboard', { sort });
    if (isErrorResponse(res)) return res;
    if (Array.isArray(res)) dispatch(setLeaderboard({ key: sort, rows: res }));
  } finally {
    dispatch(setLeaderboardLoading(false));
  }
};

export const fetchClanProfile = (clanId: number, sort: 'role' | 'xp' | 'mastery' | 'joined' = 'xp') => async (dispatch: any) => {
  dispatch(setProfileLoading(true));
  try {
    const res = await post(`/clans/view/${clanId}`, { sort });
    if (isErrorResponse(res)) return res;
    if (res?.id) dispatch(putProfile(res));
    return res;
  } finally {
    dispatch(setProfileLoading(false));
  }
};

export const searchClans = (q: string, by: 'tag' | 'name') => async (dispatch: any) => {
  dispatch(setSearchLoading(true));
  try {
    const res = await post('/clans/search', { q, by });
    if (isErrorResponse(res)) return res;
    if (Array.isArray(res)) dispatch(setSearchResults(res));
  } finally {
    dispatch(setSearchLoading(false));
  }
};

export const createClan = (body: any) => async (dispatch: any) => {
  const res = await post('/clans/create', body);
  if (res?.id) {
    await dispatch(fetchMyClan());
    dispatch(updateAccountAsync() as any);
  }
  return res;
};

export const joinClan = (clanId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/join`);
  if (res?.joined) {
    dispatch(setRecommended([]));
    await dispatch(fetchMyClan());
  }
  return res;
};

export const leaveClan = (clanId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/leave`);
  dispatch(clearClan());
  dispatch(clearChat());
  dispatch(setRecommended([]));
  try { window.localStorage.removeItem(`clanChatLastSeen:${clanId}`); } catch {}
  return res;
};

export const editClan = (clanId: number, body: any) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/edit`, body);
  if (res?.id) {
    await dispatch(fetchMyClan());
  }
  return res;
};

export const fetchChatHistory = (clanId: number, before?: number) => async (dispatch: any, getState: any) => {
  if (!before) dispatch(setChatLoading(true));
  try {
    const res = await post(`/clans/${clanId}/chat/history`, before ? { before } : {});
    if (isErrorResponse(res)) return res;
    if (Array.isArray(res)) {
      if (before) {
        dispatch(appendChat(res));
      } else {
        dispatch(setChat(res));
      }
    }
    return res;
  } finally {
    if (!before) dispatch(setChatLoading(false));
  }
};

export const postChat = (clanId: number, content: string) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/chat`, { content });
  if (res?.id) dispatch(appendChat([res]));
  return res;
};

export const respondRequest = (clanId: number, reqId: number, accept: boolean) => async (dispatch: any) => {
  const path = accept ? `/clans/${clanId}/requests/${reqId}/accept` : `/clans/${clanId}/requests/${reqId}/reject`;
  const res = await post(path);
  await dispatch(fetchClanProfile(clanId));
  return res;
};

export const kickMember = (clanId: number, targetId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/kick/${targetId}`);
  await dispatch(fetchClanProfile(clanId));
  return res;
};

export const changeRole = (clanId: number, targetId: number, role: ClanRoleId) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/role/${targetId}`, { role });
  await dispatch(fetchClanProfile(clanId));
  return res;
};

export const transferLeadership = (clanId: number, targetId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/transfer/${targetId}`);
  await dispatch(fetchClanProfile(clanId));
  await dispatch(fetchMyClan());
  return res;
};

export const disbandClan = (clanId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/disband`);
  dispatch(clearClan());
  dispatch(clearChat());
  dispatch(setRecommended([]));
  try { window.localStorage.removeItem(`clanChatLastSeen:${clanId}`); } catch {}
  return res;
};
