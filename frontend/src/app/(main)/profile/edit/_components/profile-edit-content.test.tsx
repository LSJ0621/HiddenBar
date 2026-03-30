import { render, screen, fireEvent } from '@testing-library/react';

import { ProfileEditContent } from './profile-edit-content';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMutateAsync = jest.fn();
const mockPasswordMutateAsync = jest.fn();
const mockUploadMutateAsync = jest.fn();

jest.mock('@/hooks/queries/use-profile', () => ({
  useProfile: jest.fn(() => ({
    data: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      profileImage: null,
      role: 'USER',
      createdAt: '2026-01-01',
      hasPassword: true,
    },
    isLoading: false,
  })),
  useUpdateProfile: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
  useChangePassword: jest.fn(() => ({
    mutateAsync: mockPasswordMutateAsync,
  })),
  useUploadProfileImage: jest.fn(() => ({
    mutateAsync: mockUploadMutateAsync,
    isPending: false,
  })),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(({ onDrop }) => ({
    getRootProps: () => ({
      'data-testid': 'profile-image-uploader',
      onClick: jest.fn(),
    }),
    getInputProps: () => ({
      type: 'file',
      'data-testid': 'dropzone-input',
    }),
    isDragActive: false,
  })),
}));

describe('ProfileEditContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render back button', () => {
      render(<ProfileEditContent />);
      expect(screen.getByTestId('profile-back-button')).toBeInTheDocument();
    });

    it('should render profile image uploader instead of URL input', () => {
      render(<ProfileEditContent />);
      expect(screen.getByTestId('profile-image-uploader')).toBeInTheDocument();
      expect(screen.queryByTestId('profile-image-input')).not.toBeInTheDocument();
    });

    it('should render password confirm input', () => {
      render(<ProfileEditContent />);
      expect(screen.getByTestId('password-confirm-input')).toBeInTheDocument();
    });

    it('should render password toggle buttons with aria-labels', () => {
      render(<ProfileEditContent />);
      const toggleButtons = screen.getAllByRole('button', { name: /Show password/ });
      expect(toggleButtons).toHaveLength(3);
    });
  });

  describe('back button', () => {
    it('should navigate to /profile when clicked', () => {
      render(<ProfileEditContent />);
      fireEvent.click(screen.getByTestId('profile-back-button'));
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });
  });

  describe('password toggle', () => {
    it('should toggle password visibility', () => {
      render(<ProfileEditContent />);
      const currentPwInput = screen.getByTestId('password-current-input');
      expect(currentPwInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getAllByRole('button', { name: 'Show password' })[0];
      fireEvent.click(toggleBtn);
      expect(currentPwInput).toHaveAttribute('type', 'text');
    });
  });

  describe('form fieldset', () => {
    it('should wrap profile form in fieldset', () => {
      render(<ProfileEditContent />);
      const nameInput = screen.getByTestId('profile-name-input');
      const fieldset = nameInput.closest('fieldset');
      expect(fieldset).toBeInTheDocument();
    });

    it('should wrap password form in fieldset', () => {
      render(<ProfileEditContent />);
      const pwInput = screen.getByTestId('password-current-input');
      const fieldset = pwInput.closest('fieldset');
      expect(fieldset).toBeInTheDocument();
    });
  });
});
