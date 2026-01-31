import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  clan: string;
  isLoggedIn: boolean;
  secret: string;
  gems: number;
  mastery: number;
  tokens: number;
  skins: { equipped: number; owned: number[] };
  is_v1: boolean;
  xp: number;
  recovered: boolean;
  profiles: { equipped: number; owned: number[] };
  bio: string;
  tags: { tags: string[]; colors: string[] };
  isCrazygames: boolean;
  crazygamesUserId?: string;
  dailyLogin: { 
    lastLogin: number; 
    loginStreak: number; 
    claimedToday: boolean;
  }
}

const initialState: AccountState = {
  email: '',
  username: '',
  clan: '',
  secret: '',
  isLoggedIn: false,
  gems: 0,
  mastery: 0,
  tokens: 0,
  skins: { equipped: 1, owned: [1] },
  is_v1: false,
  xp: 0,
  recovered: false,
  profiles: { equipped: 1, owned: [1] },
  bio: '',
  tags: { tags: [], colors: [] },
  isCrazygames: false,
  crazygamesUserId: undefined,
  dailyLogin: { 
    lastLogin: 0, 
    loginStreak: 0, 
    claimedToday: false, },
};

// Async Thunks
export const logoutAsync = createAsyncThunk(
  'account/logout',
  async (_, { dispatch }) => {

    try {
      console.log('Clearing secret');
      window.localStorage.removeItem('secret');
    } catch (e) {
      console.log('Failed to clear secret', e);
    }

    dispatch(clearAccount());
  }
);

export const updateAccountAsync = createAsyncThunk(
  'account/updateAccount',
  (_, { getState, dispatch }) => {
    return new Promise((resolve, reject) => {
    const state: any = getState();
    api.post(`${api.endpoint}/profile/getPrivateUserInfo`, {}, (response: any) => {
    if (response.error) {
      alert(response.error);
      reject(response.error);
    } else if (response.account) {
      response.account.secret = state.account.secret;
      dispatch(setAccount(response.account));
      window.phaser_game?.events.emit('tokenUpdate', state.account.secret);
      resolve(response.account);
    }
  }, state.account.secret);
  });
  }
);

export const changeNameAsync = createAsyncThunk(
  'account/changeName',
  async (newUsername: string, { getState, dispatch }) => {
    // const state: any = getState();
    try {
      const response = await api.postAsync(`${api.endpoint}/auth/change-username?now=${Date.now()}`, {
        newUsername
      });

      if (response.error) {
        alert(response.error);
      } else if (response.success) {
        alert('Username changed successfully');
        // Dispatching actions to update name and token in the state
        dispatch(setName(newUsername));
        dispatch(setSecret(response.secret));
      }
    } catch (error) {
      // Handle any other errors, such as network issues
      console.error(error);
      alert('An error occurred while changing the name.');
    }
  }
);

export const changeClanAsync = createAsyncThunk(
  'account/changeClan',
  async (newClantag: string, { getState, dispatch }) => {
    // const state: any = getState();
    try {
      const response = await api.postAsync(`${api.endpoint}/auth/change-clantag?now=${Date.now()}`, {
        newClantag
      });

      if (response.error) {
        alert(response.error);
      } else if (response.success) {
        alert('Clan tag changed successfully');
        // Dispatching actions to update clan and token in the state
        dispatch(setClan(newClantag));
        dispatch(setSecret(response.secret));
      }
    } catch (error) {
      // Handle any other errors, such as network issues
      console.error(error);
      alert('An error occurred while changing the clan tag.');
    }
  }
);

export const changeBioAsync = createAsyncThunk(
  'account/changeBio',
  async (newUserbio: string, { getState, dispatch }) => {
    // const state: any = getState();
    try {
      const response = await api.postAsync(`${api.endpoint}/auth/change-userbio?now=${Date.now()}`, {
        newUserbio
      });

      if (response.error) {
        alert(response.error);
      } else if (response.success) {
        alert('Bio changed successfully');
        // Dispatching actions to update bio and token in the state
        dispatch(setBio(newUserbio));
        dispatch(setSecret(response.secret));
      }
    } catch (error) {
      // Handle any other errors, such as network issues
      console.error(error);
      alert('An error occurred while changing your bio.');
    }
  }
);

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearAccount: (state) => {
      state.email = '';
      state.username = '';
      state.clan = '';
      state.secret = '';
      state.gems = 0;
      state.mastery = 0;
      state.tokens = 0;
      state.isLoggedIn = false;
      state.skins = { equipped: 1, owned: [1] };
      window.phaser_game?.events.emit('tokenUpdate', '');
      state.is_v1 = false;
      state.xp = 0;
      state.recovered = false;
      state.profiles = { equipped: 1, owned: [1] };
      state.bio = '';
      state.tags = { tags: [], colors: [] };
      state.isCrazygames = false;
      state.crazygamesUserId = undefined;
      state.dailyLogin = { 
        lastLogin: 0, 
        loginStreak: 0, 
        claimedToday: false, };
    },
    setAccount: (state, action) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.clan = action.payload.clan;
      state.isLoggedIn = true;
      const previousToken = state.secret;
      state.secret = action.payload.secret;
      state.gems = action.payload.gems;
      state.mastery = action.payload.mastery;
      state.tokens = action.payload.tokens;
      state.skins = action.payload.skins;
      state.is_v1 = action.payload.is_v1;
      state.xp = action.payload.xp;
      state.recovered = action.payload.recovered;
      state.profiles = action.payload.profiles;
      state.bio = action.payload.bio;
      state.tags = action.payload.tags;
      state.isCrazygames = action.payload.isCrazygames;
      state.crazygamesUserId = action.payload.crazygamesUserId;
      if (previousToken !== state.secret) {
        console.log('Token updated');
        window.phaser_game?.events.emit('tokenUpdate', state.secret);

        try {
          window.localStorage.setItem('secret', state.secret);
        } catch (e) {
          console.log('Error setting secret', e);
        }
      }
    },
    setName: (state, action) => {
      state.username = action.payload;
    },
    setClan: (state, action) => {
      state.clan = action.payload;
    },
    setBio: (state, action) => {
      state.bio = action.payload;
    },
    setSecret: (state, action) => {
      state.secret = action.payload;
      console.log('Token updated');

      if (state.secret) {
        window.phaser_game?.events.emit('tokenUpdate', state.secret);
      }

      try {
        window.localStorage.setItem('secret', state.secret);
      } catch (e) {
        console.log('Error setting secret', e);
      }
    },
    setDailyLogin: (state, action) => {
      state.dailyLogin = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Handle async thunks here if needed
  },
});

export const { setAccount, clearAccount, setName, setClan, setBio, setSecret, setDailyLogin } = accountSlice.actions;
export default accountSlice.reducer;
