import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  isLoggedIn: boolean;
  secret: string;
  gems: number;
  skins: { equipped: number; owned: number[] };
  is_v1: boolean;
  xp: number;
}

const initialState: AccountState = {
  email: '',
  username: '',
  secret: '',
  isLoggedIn: false,
  gems: 0,
  skins: { equipped: 1, owned: [1] },
  is_v1: false,
  xp: 0,
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


const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearAccount: (state) => {
      state.email = '';
      state.username = '';
      state.secret = '';
      state.gems = 0;
      state.isLoggedIn = false;
      state.skins = { equipped: 1, owned: [1] };
      window.phaser_game?.events.emit('tokenUpdate', '');
      state.is_v1 = false;
      state.xp = 0;
    },
    setAccount: (state, action) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.isLoggedIn = true;
      const previousToken = state.secret;
      state.secret = action.payload.secret;
      state.gems = action.payload.gems;
      state.skins = action.payload.skins;
      state.is_v1 = action.payload.is_v1;
      state.xp = action.payload.xp;
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

export const { setAccount, clearAccount, setName, setSecret } = accountSlice.actions;
export default accountSlice.reducer;
