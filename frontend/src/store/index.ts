import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './auth-slice';

/** Create a fresh store instance (SSR safe) */
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
