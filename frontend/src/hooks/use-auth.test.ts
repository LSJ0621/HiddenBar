import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from './use-auth';

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: null, isAuthenticated: false } }),
  useDispatch: () => mockDispatch,
}));

const mockCacheUser = jest.fn();
const mockClearCachedUser = jest.fn();
const mockClearIsLoggedIn = jest.fn();
const mockIsLoggedIn = jest.fn();
jest.mock('@/lib/token', () => ({
  isLoggedIn: () => mockIsLoggedIn(),
  clearIsLoggedIn: () => mockClearIsLoggedIn(),
  cacheUser: (user: unknown) => mockCacheUser(user),
  clearCachedUser: () => mockClearCachedUser(),
}));

const mockQueryClientClear = jest.fn();
jest.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({ clear: mockQueryClientClear }),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial auth state', () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  describe('login', () => {
    it('should call API, dispatch setUser, and cache user', async () => {
      const mockUser = { id: 1, email: 'test@test.com', name: 'Test', profileImage: null, role: 'user' };
      mockPost.mockResolvedValueOnce({ data: { user: mockUser } });

      const { result } = renderHook(() => useAuthStore());

      let data: unknown;
      await act(async () => {
        data = await result.current.login({ email: 'test@test.com', password: 'password' });
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'password' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/setUser',
        payload: mockUser,
      });
      expect(mockCacheUser).toHaveBeenCalledWith(mockUser);
      expect(data).toEqual({ user: mockUser });
    });
  });

  describe('signup', () => {
    it('should call API, dispatch setUser, and cache user', async () => {
      const mockUser = { id: 2, email: 'new@test.com', name: 'New', profileImage: null, role: 'user' };
      mockPost.mockResolvedValueOnce({ data: { user: mockUser } });

      const { result } = renderHook(() => useAuthStore());

      const dto = { email: 'new@test.com', password: 'password', name: 'New', verificationToken: 'token123' };
      let data: unknown;
      await act(async () => {
        data = await result.current.signup(dto);
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/signup', dto);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/setUser',
        payload: mockUser,
      });
      expect(mockCacheUser).toHaveBeenCalledWith(mockUser);
      expect(data).toEqual({ user: mockUser });
    });
  });

  describe('logout', () => {
    it('should call API and clear all auth state', async () => {
      mockPost.mockResolvedValueOnce({});

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/logout');
      expect(mockClearIsLoggedIn).toHaveBeenCalled();
      expect(mockClearCachedUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/clearUser' });
      expect(mockQueryClientClear).toHaveBeenCalled();
    });

    it('should clear local state even when API call fails', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.logout();
        } catch {
          // 에러가 전파되지만 finally 블록에서 정리가 수행됨
        }
      });

      expect(mockClearIsLoggedIn).toHaveBeenCalled();
      expect(mockClearCachedUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/clearUser' });
      expect(mockQueryClientClear).toHaveBeenCalled();
    });
  });

  describe('hydrate', () => {
    it('should skip when not logged in', async () => {
      mockIsLoggedIn.mockReturnValue(false);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrate();
      });

      expect(mockGet).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should fetch user and dispatch setUser when logged in', async () => {
      mockIsLoggedIn.mockReturnValue(true);
      const mockUser = { id: 1, email: 'test@test.com', name: 'Test', profileImage: null, role: 'user' };
      mockGet.mockResolvedValueOnce({ data: mockUser });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrate();
      });

      expect(mockGet).toHaveBeenCalledWith('/users/me');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/setUser',
        payload: mockUser,
      });
      expect(mockCacheUser).toHaveBeenCalledWith(mockUser);
    });

    it('should clear auth state when fetch fails', async () => {
      mockIsLoggedIn.mockReturnValue(true);
      mockGet.mockRejectedValueOnce(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.hydrate();
      });

      expect(mockClearCachedUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/clearUser' });
    });
  });
});
