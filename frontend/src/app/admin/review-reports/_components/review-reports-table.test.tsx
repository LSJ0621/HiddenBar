import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportReason, ReportStatus } from '@my-project/shared';

import type { ReportListItem } from '@/types/review-report';

import { ReviewReportsTable } from './review-reports-table';

// useRouter mock
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// useAdminReviewReports mock
const mockUseAdminReviewReports = jest.fn();
jest.mock('@/hooks/queries/use-review-reports', () => ({
  useAdminReviewReports: (params: unknown) => mockUseAdminReviewReports(params),
}));

// nuqs mock
const mockSetStatus = jest.fn();
const mockSetPage = jest.fn();
let mockStatus: string | null = null;
let mockPage = 1;
jest.mock('nuqs', () => ({
  useQueryState: (key: string, _parser?: unknown) => {
    if (key === 'status') return [mockStatus, mockSetStatus];
    if (key === 'page') return [mockPage, mockSetPage];
    return [null, jest.fn()];
  },
  parseAsString: {},
  parseAsInteger: { withDefault: () => ({}) },
}));

const makeItem = (overrides: Partial<ReportListItem> = {}): ReportListItem => ({
  id: 1,
  reviewId: 10,
  status: ReportStatus.PENDING,
  reason: ReportReason.SPAM,
  detail: null,
  reporter: { id: 100, name: 'Reporter Kim' },
  review: { id: 10, status: 'REPORTED' },
  createdAt: '2026-03-20T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = null;
  mockPage = 1;
});

describe('ReviewReportsTable', () => {
  describe('기본 렌더링', () => {
    it('should render the page title', () => {
      mockUseAdminReviewReports.mockReturnValue({ data: undefined, isLoading: false });
      render(<ReviewReportsTable />);
      expect(screen.getByText('Review Reports')).toBeInTheDocument();
    });

    it('should render table headers', () => {
      mockUseAdminReviewReports.mockReturnValue({
        data: { items: [makeItem()], meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 } },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Reason')).toBeInTheDocument();
      expect(screen.getByText('Reporter')).toBeInTheDocument();
      expect(screen.getByText('Review Status')).toBeInTheDocument();
      expect(screen.getByText('Report Status')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should render report data in table rows', () => {
      mockUseAdminReviewReports.mockReturnValue({
        data: {
          items: [makeItem({ id: 5, reason: ReportReason.SPAM, reporter: { id: 1, name: 'John' } })],
          meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Spam')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });

  describe('빈 상태', () => {
    it('should show empty state when no reports', () => {
      mockUseAdminReviewReports.mockReturnValue({
        data: { items: [], meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 } },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('should show skeleton when loading', () => {
      mockUseAdminReviewReports.mockReturnValue({ data: undefined, isLoading: true });
      render(<ReviewReportsTable />);
      // Skeleton이 렌더링 됨 (테이블 대신)
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('상태 필터', () => {
    it('should render status filter tabs', () => {
      mockUseAdminReviewReports.mockReturnValue({ data: undefined, isLoading: false });
      render(<ReviewReportsTable />);
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('should call setStatus when PENDING tab is clicked', async () => {
      const user = userEvent.setup();
      mockUseAdminReviewReports.mockReturnValue({ data: undefined, isLoading: false });
      render(<ReviewReportsTable />);
      await user.click(screen.getByText('Pending'));
      expect(mockSetStatus).toHaveBeenCalledWith(ReportStatus.PENDING);
      expect(mockSetPage).toHaveBeenCalledWith(1);
    });

    it('should call setStatus(null) when All tab is clicked', async () => {
      const user = userEvent.setup();
      mockStatus = ReportStatus.PENDING;
      mockUseAdminReviewReports.mockReturnValue({ data: undefined, isLoading: false });
      render(<ReviewReportsTable />);
      await user.click(screen.getByText('All'));
      expect(mockSetStatus).toHaveBeenCalledWith(null);
    });
  });

  describe('행 클릭 네비게이션', () => {
    it('should navigate to detail page when row is clicked', async () => {
      const user = userEvent.setup();
      mockUseAdminReviewReports.mockReturnValue({
        data: {
          items: [makeItem({ id: 42 })],
          meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      const row = screen.getByText('42').closest('tr')!;
      await user.click(row);
      expect(mockPush).toHaveBeenCalledWith('/admin/review-reports/42');
    });
  });

  describe('상태 배지', () => {
    it('should render PENDING badge', () => {
      mockUseAdminReviewReports.mockReturnValue({
        data: {
          items: [makeItem({ status: ReportStatus.PENDING })],
          meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      // 테이블 본문에서만 확인 (필터 탭 Pending 제외)
      const table = screen.getByRole('table');
      expect(within(table).getByText('Pending')).toBeInTheDocument();
    });

    it('should render RESOLVED badge', () => {
      mockUseAdminReviewReports.mockReturnValue({
        data: {
          items: [makeItem({ status: ReportStatus.RESOLVED })],
          meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        },
        isLoading: false,
      });
      render(<ReviewReportsTable />);
      const table = screen.getByRole('table');
      expect(within(table).getByText('Resolved')).toBeInTheDocument();
    });
  });
});
