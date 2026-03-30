import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';

import { LoginForm } from './login-form';

// ── next/navigation ──────────────────────────────────────────────────────────
const mockPush = jest.fn();
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

// ── @/hooks/use-auth ─────────────────────────────────────────────────────────
const mockLogin = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}));

// ── @/lib/validate-redirect ──────────────────────────────────────────────────
// getSafeRedirect는 redirect 파라미터를 그대로 반환하거나 '/'를 반환한다.
// 테스트에서는 단순히 '/'를 반환하도록 고정한다.
jest.mock('@/lib/validate-redirect', () => ({
  getSafeRedirect: () => '/',
}));

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * AxiosError 인스턴스를 생성한다.
 * status: HTTP 상태 코드, message: 서버가 반환한 메시지(선택)
 */
function makeAxiosError(status: number, message?: string): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    data: message ? { message } : {},
    headers: {},
    config: {} as AxiosError['config'],
    statusText: String(status),
  };
  return error;
}

/**
 * 이메일과 비밀번호를 입력한 후 폼을 제출한다.
 */
async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId('login-email-input'), email);
  await user.type(screen.getByTestId('login-password-input'), password);
  await user.click(screen.getByTestId('login-submit-button'));
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReturnValue(null);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
  describe('폼 렌더링', () => {
    it('should render email input, password input, and submit button', () => {
      render(<LoginForm />);

      expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
    });
  });

  describe('로그인 실패 — 401 (잘못된 자격증명)', () => {
    it('should display "Invalid email or password." in auth-error-message when login returns 401', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(401));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'wrongpassword');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent(
          'Invalid email or password.',
        );
      });
    });

    it('should NOT call router.push when login returns 401', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(401));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'wrongpassword');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('로그인 실패 — 403 (계정 정지)', () => {
    it('should display suspended account message in auth-error-message when login returns 403', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(403));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('suspended@example.com', 'password123');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent(
          'Your account has been suspended. Please contact an administrator.',
        );
      });
    });

    it('should NOT call router.push when login returns 403', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(403));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('suspended@example.com', 'password123');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toBeInTheDocument();
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('로그인 실패 — 기타 API 에러', () => {
    it('should display server message in auth-error-message when login returns other AxiosError with message', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(500, 'Internal server error'));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'password123');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent(
          'Internal server error',
        );
      });
    });

    it('should display fallback "Login failed. Please try again." when other AxiosError has no message', async () => {
      // Arrange
      mockLogin.mockRejectedValue(makeAxiosError(500));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'password123');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent(
          'Login failed. Please try again.',
        );
      });
    });

    it('should display fallback "Login failed. Please try again." when a non-AxiosError is thrown', async () => {
      // Arrange
      mockLogin.mockRejectedValue(new Error('Network error'));
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'password123');

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('auth-error-message')).toHaveTextContent(
          'Login failed. Please try again.',
        );
      });
    });
  });

  describe('로그인 성공', () => {
    it('should call router.push with safe redirect path on successful login', async () => {
      // Arrange
      mockLogin.mockResolvedValue({ user: { id: 1 } });
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'correctpassword');

      // Assert
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should NOT show auth-error-message on successful login', async () => {
      // Arrange
      mockLogin.mockResolvedValue({ user: { id: 1 } });
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'correctpassword');

      // Assert
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
      expect(screen.queryByTestId('auth-error-message')).not.toBeInTheDocument();
    });

    it('should call login with email and password values', async () => {
      // Arrange
      mockLogin.mockResolvedValue({ user: { id: 1 } });
      render(<LoginForm />);

      // Act
      await fillAndSubmit('user@example.com', 'correctpassword');

      // Assert
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'correctpassword',
        });
      });
    });
  });
});
