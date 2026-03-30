import { render, screen, waitFor } from '@testing-library/react';

import { OAuthGoogleCallback } from './oauth-google-callback';

const mockReplace = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

jest.mock('@/store/auth-slice', () => ({
  setUser: (user: unknown) => ({ type: 'auth/setUser', payload: user }),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  profileImage: null,
  role: 'USER',
};

const mockSuccessResponse = {
  data: {
    user: mockUser,
    isNewUser: false,
  },
};

function setupSearchParams(params: Record<string, string | null>) {
  mockGet.mockImplementation((key: string) => params[key] ?? null);
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe('OAuthGoogleCallback', () => {
  describe('에러 파라미터', () => {
    it('should show "Google authentication was cancelled." toast and redirect to /login when error param exists', () => {
      setupSearchParams({ error: 'access_denied', code: null, state: null });

      render(<OAuthGoogleCallback />);

      expect(mockToastError).toHaveBeenCalledWith(
        'Google authentication was cancelled.',
      );
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  describe('code 누락', () => {
    it('should show "Google authentication code is missing." toast and redirect to /login when code is missing', () => {
      setupSearchParams({ error: null, code: null, state: null });

      render(<OAuthGoogleCallback />);

      expect(mockToastError).toHaveBeenCalledWith(
        'Google authentication code is missing.',
      );
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  describe('CSRF state 검증', () => {
    it('should redirect to /login when state param is missing from URL', () => {
      setupSearchParams({ error: null, code: 'auth-code', state: null });
      sessionStorage.setItem('oauth_state', 'stored-state');

      render(<OAuthGoogleCallback />);

      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('should redirect to /login when state does not match sessionStorage oauth_state', () => {
      setupSearchParams({
        error: null,
        code: 'auth-code',
        state: 'wrong-state',
      });
      sessionStorage.setItem('oauth_state', 'correct-state');

      render(<OAuthGoogleCallback />);

      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('should show "Invalid authentication request. Please try again." toast on state mismatch', () => {
      setupSearchParams({
        error: null,
        code: 'auth-code',
        state: 'wrong-state',
      });
      sessionStorage.setItem('oauth_state', 'correct-state');

      render(<OAuthGoogleCallback />);

      expect(mockToastError).toHaveBeenCalledWith(
        'Invalid authentication request. Please try again.',
      );
    });
  });

  describe('성공 콜백', () => {
    beforeEach(() => {
      setupSearchParams({
        error: null,
        code: 'valid-code',
        state: 'valid-state',
      });
      sessionStorage.setItem('oauth_state', 'valid-state');
      mockPost.mockResolvedValue(mockSuccessResponse);
    });

    it('should call POST /auth/google with { code } on valid code + state', async () => {
      render(<OAuthGoogleCallback />);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/google', {
          code: 'valid-code',
        });
      });
    });

    it('should dispatch setUser with response user data', async () => {
      render(<OAuthGoogleCallback />);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'auth/setUser',
          payload: mockUser,
        });
      });
    });

    it('should remove oauth_state from sessionStorage and redirect to /', async () => {
      render(<OAuthGoogleCallback />);

      await waitFor(() => {
        expect(sessionStorage.getItem('oauth_state')).toBeNull();
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('API 에러', () => {
    beforeEach(() => {
      setupSearchParams({
        error: null,
        code: 'valid-code',
        state: 'valid-state',
      });
      sessionStorage.setItem('oauth_state', 'valid-state');
    });

    it('should show "Your account has been suspended. Please contact an administrator." toast on 403', async () => {
      mockPost.mockRejectedValue({ response: { status: 403 } });

      render(<OAuthGoogleCallback />);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Your account has been suspended. Please contact an administrator.',
        );
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('should show "Google authentication failed." toast on other errors', async () => {
      mockPost.mockRejectedValue({ response: { status: 500 } });

      render(<OAuthGoogleCallback />);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Google authentication failed.',
        );
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('로딩 UI', () => {
    it('should render Loader2 spinner and "Signing in with Google..." text', () => {
      setupSearchParams({ error: null, code: 'valid-code', state: 'valid-state' });
      sessionStorage.setItem('oauth_state', 'valid-state');
      mockPost.mockReturnValue(new Promise(() => {}));

      render(<OAuthGoogleCallback />);

      expect(screen.getByText('Signing in with Google...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
