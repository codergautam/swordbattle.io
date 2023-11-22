import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  isLoggedIn: boolean;
  token: string;
}

const initialState: AccountState = {
  email: '',
  username: '',
  token: '',
  isLoggedIn: false,
};

const accountSlice = createSlice({
  name: 'account',
  initialState: initialState,
  reducers: {
    clearAccount: (state) => {
      state.email = '';
      state.username = '';
      state.token = '';
      state.isLoggedIn = false;
    },
    setAccount: (state, action: PayloadAction<AccountState>) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.isLoggedIn = true;

      const previousToken = state.token;
      state.token = action.payload.token;
      if (previousToken !== state.token) {
        window.phaser_game?.events.emit('tokenUpdate', state.token);
      }
    },
    logout: (state: any) => {
      api.post(`${api.endpoint}/auth/logout`, {});
      accountSlice.caseReducers.clearAccount(state);
    }
  },
})

export const { setAccount, clearAccount, logout } = accountSlice.actions;

export default accountSlice.reducer;
