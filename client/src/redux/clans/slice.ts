import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api';
import { ClanSummary, AccountClan, setClan, clearClan } from '../account/slice';

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
  leaderId: number;
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

type ClansState = {
  recommended: ClanSummary[];
  recommendedLoading: boolean;
  searchResults: ClanSummary[];
  searchLoading: boolean;
  leaderboard: { xp: ClanSummary[]; mastery: ClanSummary[]; rank: ClanSummary[] };
  leaderboardLoading: boolean;
  profileCache: Record<number, ClanProfile>;
  profileLoading: boolean;
  chat: ClanChatRow[];
  chatLoading: boolean;
  error: string | null;
};

const initialState: ClansState = {
  recommended: [],
  recommendedLoading: false,
  searchResults: [],
  searchLoading: false,
  leaderboard: { xp: [], mastery: [], rank: [] },
  leaderboardLoading: false,
  profileCache: {},
  profileLoading: false,
  chat: [],
  chatLoading: false,
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
    setLeaderboard(state, action: PayloadAction<{ key: 'xp' | 'mastery' | 'rank'; rows: ClanSummary[] }>) {
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
    },
    setChatLoading(state, action: PayloadAction<boolean>) {
      state.chatLoading = action.payload;
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
  setChat, appendChat, clearChat, setChatLoading,
  setError,
} = slice.actions;

export default slice.reducer;

// Thunk-style helpers. Plain async functions instead of createAsyncThunk because the
// component flows here are simple "fire and update redux".

const post = (path: string, body: any = {}): Promise<any> => api.postAsync(`${api.endpoint}${path}?now=${Date.now()}`, body);

export const fetchMyClan = () => async (dispatch: any) => {
  const res = await post('/clans/me');
  if (res?.clan) {
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
        clanRank: res.clan.clanRank,
        memberCount: res.clan.memberCount,
      },
      role: res.role,
      contributedXp: res.contributedXp,
    };
    dispatch(setClan(accountClan));
    dispatch(putProfile(res.clan));
  } else {
    dispatch(clearClan());
  }
  return res;
};

export const fetchRecommended = (seed?: number, showRequest?: boolean) => async (dispatch: any) => {
  dispatch(setRecommendedLoading(true));
  try {
    const res = await post('/clans/recommended', { seed, showRequest });
    if (Array.isArray(res)) dispatch(setRecommended(res));
  } finally {
    dispatch(setRecommendedLoading(false));
  }
};

export const fetchLeaderboard = (sort: 'xp' | 'mastery' | 'rank') => async (dispatch: any) => {
  dispatch(setLeaderboardLoading(true));
  try {
    const res = await post('/clans/leaderboard', { sort });
    if (Array.isArray(res)) dispatch(setLeaderboard({ key: sort, rows: res }));
  } finally {
    dispatch(setLeaderboardLoading(false));
  }
};

export const fetchClanProfile = (clanId: number, sort: 'username' | 'role' | 'xp' | 'mastery' | 'joined' = 'xp') => async (dispatch: any) => {
  dispatch(setProfileLoading(true));
  try {
    const res = await post(`/clans/view/${clanId}`, { sort });
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
    if (Array.isArray(res)) dispatch(setSearchResults(res));
  } finally {
    dispatch(setSearchLoading(false));
  }
};

export const createClan = (body: any) => async (dispatch: any) => {
  const res = await post('/clans/create', body);
  if (res?.id) {
    await dispatch(fetchMyClan());
  }
  return res;
};

export const joinClan = (clanId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/join`);
  if (res?.joined) {
    await dispatch(fetchMyClan());
  }
  return res;
};

export const leaveClan = (clanId: number) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}/leave`);
  dispatch(clearClan());
  dispatch(clearChat());
  return res;
};

export const editClan = (clanId: number, body: any) => async (dispatch: any) => {
  const res = await post(`/clans/${clanId}`, body);
  if (res?.id) {
    await dispatch(fetchMyClan());
  }
  return res;
};

export const fetchChatHistory = (clanId: number, before?: number) => async (dispatch: any, getState: any) => {
  if (!before) dispatch(setChatLoading(true));
  try {
    const res = await post(`/clans/${clanId}/chat/history`, before ? { before } : {});
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
  return res;
};
