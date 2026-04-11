import { configureStore } from '@reduxjs/toolkit';
import account from './account/slice';
import clans from './clans/slice';

export const store = configureStore({
  reducer: {
    account,
    clans,
  },
})

export type RootState = ReturnType<typeof store.getState>;
