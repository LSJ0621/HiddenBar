import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportReason, ReportStatus, ReportResolution } from '@my-project/shared';

import type { ReportDetail } from '@/types/review-report';

import { ReportDetailContent } from './report-detail-content';

// useRouter mock
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// hooks mock
const mockUseAdminReviewReportDetail = jest.fn();
const mockMutateAsync = jest.fn();
jest.mock('@/hooks/queries/use-review-reports', () => ({
  useAdminReviewReportDetail: (id: number) => mockUseAdminReviewReportDetail(id),
  useResolveReviewReport: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const pendingReport: ReportDetail = {
  id: 1,
  status: ReportStatus.PENDING,
  reason: ReportReason.SPAM,
  detail: 'This is spam content',
  createdAt: '2026-03-20T00:00:00Z',
  processedAt: null,
  resolution: null,
  resolutionNote: null,
  reporter: { id: 100, name: 'Reporter Kim', email: 'reporter@test.com' },
  review: {
    id: 10,
    status: 'REPORTED',
    rating: 3,
    content: 'Bad review content here',
    visitedAt: '2026-03-15',
    user: { id: 50, name: 'Author Lee' },
  },
};

const resolvedReport: ReportDetail = {
  ...pendingReport,
  id: 2,
  status: ReportStatus.RESOLVED,
  processedAt: '2026-03-21T00:00:00Z',
  resolution: ReportResolution.HIDDEN,
  resolutionNote: 'Content was inappropriate',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReportDetailContent', () => {
  describe('로딩 상태', () => {
    it('should show skeleton when loading', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: undefined, isLoading: true });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.queryByText('Report Details')).not.toBeInTheDocument();
    });
  });

  describe('데이터 없음', () => {
    it('should show not found message when data is null', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: undefined, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Report not found')).toBeInTheDocument();
    });
  });

  describe('신고 정보 렌더링', () => {
    it('should render report reason label', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Spam')).toBeInTheDocument();
    });

    it('should render report detail when present', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('This is spam content')).toBeInTheDocument();
    });

    it('should render reporter name', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Reporter Kim')).toBeInTheDocument();
    });
  });

  describe('리뷰 정보 렌더링', () => {
    it('should render review content', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Bad review content here')).toBeInTheDocument();
    });

    it('should render review author name', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Author Lee')).toBeInTheDocument();
    });

    it('should render review rating', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('PENDING 상태: resolve 폼', () => {
    it('should render resolve form when status is PENDING', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Resolve Report')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should render action select with options', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should render note textarea', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      expect(screen.getByPlaceholderText(/note/i)).toBeInTheDocument();
    });

    it('should not render resolve form when status is RESOLVED', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: resolvedReport, isLoading: false });
      render(<ReportDetailContent reportId={2} />);
      expect(screen.queryByText('Resolve Report')).not.toBeInTheDocument();
    });
  });

  describe('RESOLVED 상태: 처리 결과 표시', () => {
    it('should render resolution label when resolved', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: resolvedReport, isLoading: false });
      render(<ReportDetailContent reportId={2} />);
      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('should render resolution note when resolved', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: resolvedReport, isLoading: false });
      render(<ReportDetailContent reportId={2} />);
      expect(screen.getByText('Content was inappropriate')).toBeInTheDocument();
    });

    it('should render processed date when resolved', () => {
      mockUseAdminReviewReportDetail.mockReturnValue({ data: resolvedReport, isLoading: false });
      render(<ReportDetailContent reportId={2} />);
      // processedAt: 2026-03-21 => 3/21/2026 in en-US locale
      expect(screen.getByText('3/21/2026')).toBeInTheDocument();
    });
  });

  describe('뒤로가기 버튼', () => {
    it('should navigate back to list when back button is clicked', async () => {
      const user = userEvent.setup();
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);
      const backBtn = screen.getByRole('button', { name: /back/i });
      await user.click(backBtn);
      expect(mockPush).toHaveBeenCalledWith('/admin/review-reports');
    });
  });

  describe('resolve mutation 호출', () => {
    it('should call mutateAsync with correct params on submit', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue(undefined);
      mockUseAdminReviewReportDetail.mockReturnValue({ data: pendingReport, isLoading: false });
      render(<ReportDetailContent reportId={1} />);

      // note 입력
      const textarea = screen.getByPlaceholderText(/note/i);
      await user.type(textarea, 'Handled appropriately');

      // submit
      await user.click(screen.getByRole('button', { name: /submit/i }));
      expect(mockMutateAsync).toHaveBeenCalledWith({
        reportId: 1,
        dto: {
          action: ReportResolution.RESTORED,
          note: 'Handled appropriately',
        },
      });
    });
  });
});
