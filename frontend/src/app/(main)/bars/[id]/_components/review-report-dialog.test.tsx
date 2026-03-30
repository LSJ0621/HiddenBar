import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportReason } from '@my-project/shared';
import { AxiosError } from 'axios';

// sonner 모킹
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// useReportReview 모킹
const mockMutateAsync = jest.fn();
const mockUseReportReview = jest.fn();
jest.mock('@/hooks/queries/use-review-reports', () => ({
  useReportReview: (...args: unknown[]) => mockUseReportReview(...args),
}));

// Radix Select는 jsdom에서 scrollIntoView/hasPointerCapture 미지원으로 동작 불가
// 네이티브 <select>로 대체하여 테스트
jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: {
    value: string;
    onValueChange: (val: string) => void;
    children: React.ReactNode;
  }) => {
    // children에서 SelectContent > SelectItem들을 추출하기 위해 context 사용
    const ref = React.useRef({ onValueChange });
    ref.current.onValueChange = onValueChange;
    return (
      <div data-testid="mock-select-wrapper" data-value={value}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          // SelectTrigger나 SelectContent에 onValueChange를 전달
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
            _onValueChange: onValueChange,
            _value: value,
          });
        })}
      </div>
    );
  },
  SelectTrigger: ({ children, _value }: { children: React.ReactNode; _value?: string }) => (
    <div data-testid="mock-select-trigger">{_value || children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children, _onValueChange }: {
    children: React.ReactNode;
    _onValueChange?: (val: string) => void;
  }) => (
    <div data-testid="mock-select-content">
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          _onValueChange,
        });
      })}
    </div>
  ),
  SelectItem: ({ value, children, _onValueChange }: {
    value: string;
    children: React.ReactNode;
    _onValueChange?: (val: string) => void;
  }) => (
    <button
      data-testid={`select-option-${value}`}
      onClick={() => _onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}));

import { ReviewReportDialog } from './review-report-dialog';

describe('ReviewReportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    reviewId: 42,
    barId: 7,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ reportId: 1 });
    mockUseReportReview.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  describe('기본 렌더링', () => {
    it('should render dialog title', () => {
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.getByText('Report Review')).toBeInTheDocument();
    });

    it('should render reason label', () => {
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.getByText('Reason')).toBeInTheDocument();
    });

    it('should render Submit and Cancel buttons', () => {
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render detail textarea by default', () => {
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.queryByPlaceholderText(/detail/i)).not.toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(<ReviewReportDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Report Review')).not.toBeInTheDocument();
    });

    it('should disable Submit button when no reason is selected', () => {
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });
  });

  describe('신고 사유 선택', () => {
    it('should show detail textarea only when OTHER is selected', async () => {
      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      await user.click(screen.getByTestId('select-option-OTHER'));
      expect(screen.getByPlaceholderText(/detail/i)).toBeInTheDocument();
    });

    it('should hide detail textarea when reason changes from OTHER to another', async () => {
      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      // OTHER 선택
      await user.click(screen.getByTestId('select-option-OTHER'));
      expect(screen.getByPlaceholderText(/detail/i)).toBeInTheDocument();

      // SPAM 선택
      await user.click(screen.getByTestId('select-option-SPAM'));
      expect(screen.queryByPlaceholderText(/detail/i)).not.toBeInTheDocument();
    });

    it('should enable Submit button after selecting a reason', async () => {
      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      await user.click(screen.getByTestId('select-option-SPAM'));
      expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled();
    });
  });

  describe('신고 제출', () => {
    it('should call mutateAsync with reason when submitted', async () => {
      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      await user.click(screen.getByTestId('select-option-SPAM'));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          reviewId: 42,
          dto: { reason: ReportReason.SPAM },
        });
      });
    });

    it('should call mutateAsync with reason and detail when OTHER is submitted', async () => {
      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      await user.click(screen.getByTestId('select-option-OTHER'));
      await user.type(screen.getByPlaceholderText(/detail/i), 'Test detail reason');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          reviewId: 42,
          dto: { reason: ReportReason.OTHER, detail: 'Test detail reason' },
        });
      });
    });

    it('should close dialog on successful submission', async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<ReviewReportDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByTestId('select-option-SPAM'));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        // onSuccess 토스트는 mutation hook(useReportReview) 내부에서 처리
        // 다이얼로그는 성공 시 닫힘만 책임
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show duplicate error toast on 409 conflict and close dialog', async () => {
      const error = new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: { message: 'Already reported' },
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
      });
      mockMutateAsync.mockRejectedValueOnce(error);

      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<ReviewReportDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByTestId('select-option-SPAM'));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('You have already reported this review');
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show generic error toast on other errors', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<ReviewReportDialog {...defaultProps} />);

      await user.click(screen.getByTestId('select-option-SPAM'));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/failed/i));
      });
    });
  });

  describe('Cancel 버튼', () => {
    it('should call onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<ReviewReportDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should reset form state when dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ReviewReportDialog {...defaultProps} />);

      // 사유 선택
      await user.click(screen.getByTestId('select-option-SPAM'));

      // 다이얼로그 닫기
      rerender(<ReviewReportDialog {...defaultProps} open={false} />);

      // 다시 열기
      rerender(<ReviewReportDialog {...defaultProps} open={true} />);

      // Submit 버튼이 다시 비활성화 (사유 리셋)
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });
  });

  describe('pending 상태', () => {
    it('should disable Submit button while mutation is pending', () => {
      mockUseReportReview.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      });
      render(<ReviewReportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });
  });
});
