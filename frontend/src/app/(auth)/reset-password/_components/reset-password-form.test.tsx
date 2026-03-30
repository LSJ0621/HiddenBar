import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResetPasswordForm } from './reset-password-form';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSendCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockResendCode = jest.fn();

/** useEmailVerification hook mock — step/state는 각 테스트에서 재정의한다 */
jest.mock('@/hooks/use-email-verification', () => ({
  useEmailVerification: () => mockUseEmailVerificationReturn,
}));

/** 각 테스트에서 덮어쓸 수 있는 mutable 반환값 */
let mockUseEmailVerificationReturn = {
  step: 'email' as 'email' | 'code' | 'done',
  email: '',
  verificationToken: null as string | null,
  isSending: false,
  isVerifying: false,
  sendCode: mockSendCode,
  verifyCode: mockVerifyCode,
  resendCode: mockResendCode,
  reset: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseEmailVerificationReturn = {
    step: 'email',
    email: '',
    verificationToken: null,
    isSending: false,
    isVerifying: false,
    sendCode: mockSendCode,
    verifyCode: mockVerifyCode,
    resendCode: mockResendCode,
    reset: jest.fn(),
  };
});

describe('ResetPasswordForm', () => {
  describe('Step 1: 이메일 입력', () => {
    it('should show inline error on email field when sendCode returns an error string for unregistered email', async () => {
      // Arrange
      mockSendCode.mockResolvedValue('No account found with this email.');
      render(<ResetPasswordForm />);

      // Act
      const emailInput = screen.getByTestId('reset-email-input');
      const sendButton = screen.getByTestId('reset-send-code-button');
      await userEvent.type(emailInput, 'notregistered@example.com');
      await userEvent.click(sendButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No account found with this email.')).toBeInTheDocument();
      });
    });

    it('should show inline error when sendCode returns a social login error (403)', async () => {
      mockSendCode.mockResolvedValue(
        'Social login accounts cannot reset password. Please sign in with your social account.',
      );
      render(<ResetPasswordForm />);

      const emailInput = screen.getByTestId('reset-email-input');
      const sendButton = screen.getByTestId('reset-send-code-button');
      await userEvent.type(emailInput, 'social@example.com');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Social login accounts cannot reset password. Please sign in with your social account.',
          ),
        ).toBeInTheDocument();
      });
    });

    it('should advance to code step when sendCode returns null for a valid email', async () => {
      // Arrange — sendCode resolves null (success), hook transitions step to 'code'
      mockSendCode.mockImplementation(async () => {
        mockUseEmailVerificationReturn.step = 'code';
        mockUseEmailVerificationReturn.email = 'valid@example.com';
        return null;
      });

      const { rerender } = render(<ResetPasswordForm />);

      // Act
      const emailInput = screen.getByTestId('reset-email-input');
      const sendButton = screen.getByTestId('reset-send-code-button');
      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(sendButton);

      // Re-render to reflect updated hook state
      rerender(<ResetPasswordForm />);

      // Assert — code step UI is now visible
      await waitFor(() => {
        expect(screen.getByTestId('reset-code-input')).toBeInTheDocument();
        expect(screen.getByTestId('reset-verify-code-button')).toBeInTheDocument();
      });
    });
  });
});
