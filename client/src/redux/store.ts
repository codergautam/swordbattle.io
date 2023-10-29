import { configureStore } from '@reduxjs/toolkit';
import account from './account/slice';

export const store = configureStore({
  reducer: {
    account,
  },
})

export type RootState = ReturnType<typeof store.getState>;
