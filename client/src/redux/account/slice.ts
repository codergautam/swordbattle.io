import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  isLoggedIn: boolean;
  token: string;
  gems: number;
}

const initialState: AccountState = {
  email: '',
  username: '',
  token: '',
  isLoggedIn: false,
  gems: 0,
};

// Async Thunks
export const logoutAsync = createAsyncThunk(
  'account/logout',
  async (_, { dispatch }) => {
    await api.post(`${api.endpoint}/auth/logout`, {});
    dispatch(clearAccount());
  }
);

export const changeNameAsync = createAsyncThunk(
  'account/changeName',
  async (newUsername: string, { getState, dispatch }) => {
    const state: any = getState();
    console.log('changeNameAsync', newUsername, state.account.username);
    try {
      const response = await api.postAsync(`${api.endpoint}/auth/change-username`, {
        newUsername,
        curUsername: state.account.username
      });

      if (response.error) {
        alert(response.error);
      } else if (response.success) {
        alert('Username changed successfully');
        // Dispatching actions to update name and token in the state
        dispatch(setName(newUsername));
        dispatch(setToken(response.token));
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
      state.token = '';
      state.gems = 0;
      state.isLoggedIn = false;
    },
    setAccount: (state, action) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.isLoggedIn = true;
      const previousToken = state.token;
      state.token = action.payload.token;
      state.gems = action.payload.gems;
      if (previousToken !== state.token) {
        window.phaser_game?.events.emit('tokenUpdate', state.token);
      }
    },
    setName: (state, action) => {
      state.username = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
      if (state.token) {
        window.phaser_game?.events.emit('tokenUpdate', state.token);
      }
    },
  },
  extraReducers: (builder) => {
    // Handle async thunks here if needed
  },
});

export const { setAccount, clearAccount, setName, setToken } = accountSlice.actions;
export default accountSlice.reducer;
