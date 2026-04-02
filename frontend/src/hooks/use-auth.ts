'use client';

import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { setUser, clearUser } from '@/store/auth-slice';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { getQueryClient } from '@/lib/query-client';
import { isLoggedIn, clearIsLoggedIn, cacheUser, clearCachedUser } from '@/lib/token';
import type { LoginDto, SignupDto, AuthResponse, User } from '@/types';

/** Auth store hook — wraps Redux auth slice with API actions */
export const useAuthStore = () => {
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const dispatch = useDispatch<AppDispatch>();

  /** Log in with email/password */
  const login = async (credentials: LoginDto) => {
    const { data } = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    dispatch(setUser(data.user));
    cacheUser(data.user);
    return data;
  };

  /** Sign up a new account */
  const signup = async (dto: SignupDto) => {
    const { data } = await api.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, dto);
    dispatch(setUser(data.user));
    cacheUser(data.user);
    return data;
  };

  /** Log out and clear all auth state */
  const logout = async () => {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      clearIsLoggedIn();
      clearCachedUser();
      dispatch(clearUser());
      getQueryClient().clear();
    }
  };

  /** Restore auth state from stored token */
  const hydrate = async () => {
    if (!isLoggedIn()) return;

    try {
      const { data } = await api.get<User>(API_ENDPOINTS.USERS.ME);
      dispatch(setUser(data));
      cacheUser(data);
    } catch {
      clearCachedUser();
      dispatch(clearUser());
    }
  };

  return { user, isAuthenticated, login, signup, logout, hydrate };
};
