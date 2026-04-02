import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OnboardingDialog } from './onboarding-dialog';

// useOnboarding mock
const mockStartTour = jest.fn();
const mockSkipTour = jest.fn();
const mockEndTour = jest.fn();

jest.mock('./use-onboarding', () => ({
  useOnboarding: () => ({
    startTour: mockStartTour,
    skipTour: mockSkipTour,
    endTour: mockEndTour,
  }),
}));

describe('OnboardingDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Welcome 다이얼로그', () => {
    it('should render welcome title and description', () => {
      render(<OnboardingDialog type="welcome" />);
      expect(screen.getByText('Welcome to Hidden Bar!')).toBeInTheDocument();
      expect(
        screen.getByText(/Take a quick tour to learn/),
      ).toBeInTheDocument();
    });

    it('should render "Start Tour" and "Skip" buttons', () => {
      render(<OnboardingDialog type="welcome" />);
      expect(
        screen.getByRole('button', { name: 'Start Tour' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Skip' }),
      ).toBeInTheDocument();
    });

    it('should call startTour when "Start Tour" is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingDialog type="welcome" />);
      await user.click(screen.getByRole('button', { name: 'Start Tour' }));
      expect(mockStartTour).toHaveBeenCalledTimes(1);
    });

    it('should call skipTour when "Skip" is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingDialog type="welcome" />);
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(mockSkipTour).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complete 다이얼로그', () => {
    it('should render complete title and description', () => {
      render(<OnboardingDialog type="complete" />);
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
      expect(
        screen.getByText(/You now know how to search/),
      ).toBeInTheDocument();
    });

    it('should render "Done" button', () => {
      render(<OnboardingDialog type="complete" />);
      expect(
        screen.getByRole('button', { name: 'Done' }),
      ).toBeInTheDocument();
    });

    it('should call endTour when "Done" is clicked', async () => {
      const user = userEvent.setup();
      render(<OnboardingDialog type="complete" />);
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(mockEndTour).toHaveBeenCalledTimes(1);
    });
  });
});
