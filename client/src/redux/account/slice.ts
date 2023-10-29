import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../api';

export type AccountState = {
  email: string;
  username: string;
  isLoggedIn: boolean;
}

const initialState: AccountState = {
  email: '',
  username: '',
  isLoggedIn: false,
};

const accountSlice = createSlice({
  name: 'account',
  initialState: initialState,
  reducers: {
    clearAccount: (state) => {
      state.email = '';
      state.username = '';
      state.isLoggedIn = false;
    },
    setAccount: (state, action: PayloadAction<AccountState>) => {
      state.email = action.payload.email;
      state.username = action.payload.username;
      state.isLoggedIn = true;
    },
    logout: (state: any) => {
      api.post(`${api.endpoint}/auth/logout`, {});
      accountSlice.caseReducers.clearAccount(state);
    }
  },
})

export const { setAccount, clearAccount, logout } = accountSlice.actions;

export default accountSlice.reducer;
