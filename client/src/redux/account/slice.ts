import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  clan: string;
  isLoggedIn: boolean;
  secret: string;
  gems: number;
  ultimacy: number;
  skins: { equipped: number; owned: number[] };
  is_v1: boolean;
  xp: number;
  recovered: boolean;
  profiles: { equipped: number; owned: number[] };
  bio: string;
}

const initialState: AccountState = {
  email: '',
  username: '',
  clan: '',
  secret: '',
  isLoggedIn: false,
  gems: 0,
  ultimacy: 0,
  skins: { equipped: 1, owned: [1] },
  is_v1: false,
  xp: 0,
  recovered: false,
  profiles: { equipped: 1, owned: [1] },
  bio: '',
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
        dispatch(setClantag(newClantag));
        dispatch(setSecret(response.secret));
      }
    } catch (error) {
      // Handle any other errors, such as network issues
      console.error(error);
      alert('An error occurred while changing the clan tag.');
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
      state.ultimacy = 0;
      state.isLoggedIn = false;
      state.skins = { equipped: 1, owned: [1] };
      window.phaser_game?.events.emit('tokenUpdate', '');
      state.is_v1 = false;
      state.xp = 0;
      state.recovered = false;
      state.profiles = { equipped: 1, owned: [1] };
      state.bio = '';
    },
    setAccount: (state, action) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.clan = action.payload.clan;
      state.isLoggedIn = true;
      const previousToken = state.secret;
      state.secret = action.payload.secret;
      state.gems = action.payload.gems;
      state.ultimacy = action.payload.ultimacy;
      state.skins = action.payload.skins;
      state.is_v1 = action.payload.is_v1;
      state.xp = action.payload.xp;
      state.recovered = action.payload.recovered;
      state.profiles = action.payload.profiles;
      state.bio = action.payload.bio;
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
    setClantag: (state, action) => {
      state.clan = action.payload;
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
  },
  extraReducers: (builder) => {
    // Handle async thunks here if needed
  },
});

export const { setAccount, clearAccount, setName, setClantag, setSecret } = accountSlice.actions;
export default accountSlice.reducer;
