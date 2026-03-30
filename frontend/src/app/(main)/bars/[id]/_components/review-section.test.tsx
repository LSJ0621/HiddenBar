import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewStatus } from '@my-project/shared';

import type { ReviewItem, ReviewListResponse } from '@/types/review';

// scrollIntoView는 jsdom에 없으므로 모킹
Element.prototype.scrollIntoView = jest.fn();

// next/navigation 모킹
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// useAuthStore 모킹
const mockUseAuthStore = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// 쿼리 훅 모킹
const mockUseBarReviews = jest.fn();
const mockUseMyReview = jest.fn();
const mockDeleteMutateAsync = jest.fn();
const mockUseDeleteReview = jest.fn();

jest.mock('@/hooks/queries/use-reviews', () => ({
  useBarReviews: (...args: unknown[]) => mockUseBarReviews(...args),
  useMyReview: (...args: unknown[]) => mockUseMyReview(...args),
  useDeleteReview: (...args: unknown[]) => mockUseDeleteReview(...args),
}));

const mockAdminDeleteMutateAsync = jest.fn();
const mockUseAdminDeleteReview = jest.fn();

jest.mock('@/hooks/queries/use-admin-reviews', () => ({
  useAdminDeleteReview: (...args: unknown[]) => mockUseAdminDeleteReview(...args),
}));

// 자식 컴포넌트들을 단순 모킹 (각 컴포넌트는 별도 테스트 파일에서 검증)
jest.mock('./review-stats-summary', () => ({
  ReviewStatsSummary: () => <div data-testid="review-stats-summary" />,
}));

jest.mock('./review-card', () => ({
  ReviewCard: ({ review, onEdit, onDelete }: {
    review: ReviewItem;
    onEdit?: () => void;
    onDelete?: () => void;
  }) => (
    <div data-testid={`review-card-${review.id}`}>
      <span>{review.author.name}</span>
      {onEdit && <button onClick={onEdit}>Edit review {review.id}</button>}
      {onDelete && <button onClick={onDelete}>Delete review {review.id}</button>}
    </div>
  ),
}));

jest.mock('./review-form-modal', () => ({
  ReviewFormModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) =>
    open ? (
      <div data-testid="review-form-modal">
        <button onClick={() => onOpenChange(false)}>Close modal</button>
      </div>
    ) : null,
}));

jest.mock('./review-moderate-dialog', () => ({
  ReviewModerateDialog: () => <div data-testid="review-moderate-dialog" />,
}));

// Accordion 래퍼가 있어서 AccordionItem은 단독으로 렌더링하면 에러가 발생함
// Accordion 컨텍스트를 제공하기 위해 Accordion 컴포넌트를 사용한 wrapper 필요
import { Accordion } from '@/components/ui/accordion';
import { ReviewSection } from './review-section';

const mockReview: ReviewItem = {
  id: 1,
  rating: 4,
  content: 'Great bar!',
  visitedAt: null,
  status: ReviewStatus.PUBLISHED,
  author: { id: 10, name: 'Bob', profileImageUrl: null },
  photos: [],
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const myReview: ReviewItem = {
  id: 2,
  rating: 5,
  content: 'My review',
  visitedAt: null,
  status: ReviewStatus.PUBLISHED,
  author: { id: 1, name: 'Me', profileImageUrl: null },
  photos: [],
  createdAt: '2026-03-02T00:00:00Z',
  updatedAt: '2026-03-02T00:00:00Z',
};

const defaultReviewData: ReviewListResponse = {
  items: [mockReview],
  meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
  stats: { averageRating: 4.0, totalCount: 1, distribution: [] },
};

/** ReviewSection을 Accordion 컨텍스트 안에서 렌더링하는 헬퍼 */
function renderReviewSection(props: Partial<{ barId: number; isOwner: boolean }> = {}) {
  return render(
    <Accordion type="multiple">
      <ReviewSection barId={1} isOwner={false} {...props} />
    </Accordion>,
  );
}

describe('ReviewSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteReview.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    });
    mockUseAdminDeleteReview.mockReturnValue({
      mutateAsync: mockAdminDeleteMutateAsync,
      isPending: false,
    });
    mockDeleteMutateAsync.mockResolvedValue(undefined);
    mockAdminDeleteMutateAsync.mockResolvedValue(undefined);
  });

  describe('비로그인 상태', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({ user: null, isAuthenticated: false });
      mockUseBarReviews.mockReturnValue({ data: undefined, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: null });
    });

    it('should show "Log In" button when not authenticated', () => {
      renderReviewSection();
      // Desktop 섹션 (hidden lg:block) + Mobile accordion 둘 다 렌더링되므로 여러 개 존재
      expect(screen.getAllByRole('button', { name: /Log In/i })).not.toHaveLength(0);
    });

    it('should show login prompt text', () => {
      renderReviewSection();
      expect(screen.getAllByText(/Log in to see reviews/i)).not.toHaveLength(0);
    });

    it('should navigate to /login when Log In button is clicked', () => {
      renderReviewSection();
      const loginButtons = screen.getAllByRole('button', { name: /Log In/i });
      fireEvent.click(loginButtons[0]);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should not render review list when not authenticated', () => {
      renderReviewSection();
      expect(screen.queryByTestId('review-card-1')).not.toBeInTheDocument();
    });
  });

  describe('로그인 상태 — 리뷰 목록', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { id: 1, name: 'Me', role: 'USER' },
        isAuthenticated: true,
      });
      mockUseBarReviews.mockReturnValue({ data: defaultReviewData, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: null });
    });

    it('should render review cards when authenticated and reviews exist', () => {
      renderReviewSection();
      expect(screen.getAllByTestId('review-card-1')).not.toHaveLength(0);
    });

    it('should render stats summary when stats are available', () => {
      renderReviewSection();
      expect(screen.getAllByTestId('review-stats-summary')).not.toHaveLength(0);
    });

    it('should show "Write a Review" button when my review does not exist', () => {
      renderReviewSection();
      expect(screen.getAllByRole('button', { name: /Write a Review/i })).not.toHaveLength(0);
    });

    it('should show empty state when no reviews', () => {
      mockUseBarReviews.mockReturnValue({
        data: {
          ...defaultReviewData,
          items: [],
          meta: { ...defaultReviewData.meta, totalItems: 0 },
          stats: { averageRating: 0, totalCount: 0, distribution: [] },
        },
        isLoading: false,
      });
      renderReviewSection();
      expect(screen.getAllByText(/No reviews yet/i)).not.toHaveLength(0);
    });

    it('should show loading skeleton when isLoading is true', () => {
      mockUseBarReviews.mockReturnValue({ data: undefined, isLoading: true });
      const { container } = renderReviewSection();
      // 스켈레톤은 animate-pulse 클래스를 가짐
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('내 리뷰가 있는 경우', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { id: 1, name: 'Me', role: 'USER' },
        isAuthenticated: true,
      });
      mockUseBarReviews.mockReturnValue({ data: defaultReviewData, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: myReview });
    });

    it('should show "Edit My Review" button when my review exists', () => {
      renderReviewSection();
      expect(screen.getAllByRole('button', { name: /Edit My Review/i })).not.toHaveLength(0);
    });

    it('should not show "Write a Review" button when my review exists', () => {
      renderReviewSection();
      expect(screen.queryByRole('button', { name: /Write a Review/i })).not.toBeInTheDocument();
    });

    it('should open form modal with editing review when Edit My Review is clicked', () => {
      renderReviewSection();
      const editButtons = screen.getAllByRole('button', { name: /Edit My Review/i });
      fireEvent.click(editButtons[0]);
      expect(screen.getAllByTestId('review-form-modal')).not.toHaveLength(0);
    });
  });

  describe('리뷰 작성 버튼', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { id: 1, name: 'Me', role: 'USER' },
        isAuthenticated: true,
      });
      mockUseBarReviews.mockReturnValue({ data: defaultReviewData, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: null });
    });

    it('should open form modal when Write a Review is clicked', () => {
      renderReviewSection();
      const writeButtons = screen.getAllByRole('button', { name: /Write a Review/i });
      fireEvent.click(writeButtons[0]);
      expect(screen.getAllByTestId('review-form-modal')).not.toHaveLength(0);
    });
  });

  describe('페이지네이션', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { id: 1, name: 'Me', role: 'USER' },
        isAuthenticated: true,
      });
    });

    it('should render pagination when totalPages > 1', () => {
      mockUseBarReviews.mockReturnValue({
        data: {
          ...defaultReviewData,
          meta: { page: 1, limit: 10, totalItems: 25, totalPages: 3 },
        },
        isLoading: false,
      });
      mockUseMyReview.mockReturnValue({ data: null });
      renderReviewSection();
      expect(screen.getAllByTestId('pagination')).not.toHaveLength(0);
    });

    it('should not render pagination when totalPages is 1', () => {
      mockUseBarReviews.mockReturnValue({ data: defaultReviewData, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: null });
      renderReviewSection();
      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('should call useBarReviews with updated page when next page button is clicked', () => {
      mockUseBarReviews.mockReturnValue({
        data: {
          ...defaultReviewData,
          meta: { page: 1, limit: 10, totalItems: 25, totalPages: 3 },
        },
        isLoading: false,
      });
      mockUseMyReview.mockReturnValue({ data: null });
      renderReviewSection();

      const nextButtons = screen.getAllByRole('button', { name: /Next page/i });
      fireEvent.click(nextButtons[0]);

      // page=2로 useBarReviews가 재호출됨 (실제 호출 횟수는 리렌더링으로 누적)
      expect(mockUseBarReviews).toHaveBeenCalledWith(1, expect.objectContaining({ page: 2 }));
    });
  });

  describe('리뷰 삭제 확인 다이얼로그', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: { id: 1, name: 'Me', role: 'USER' },
        isAuthenticated: true,
      });
      mockUseBarReviews.mockReturnValue({ data: defaultReviewData, isLoading: false });
      mockUseMyReview.mockReturnValue({ data: null });
    });

    it('should show delete confirmation dialog when delete is triggered on review card', () => {
      renderReviewSection();
      const deleteButtons = screen.getAllByText(`Delete review ${mockReview.id}`);
      fireEvent.click(deleteButtons[0]);
      expect(screen.getAllByText('Delete Review')).not.toHaveLength(0);
    });

    it('should call deleteReview mutation when Delete is confirmed', async () => {
      renderReviewSection();
      const deleteButtons = screen.getAllByText(`Delete review ${mockReview.id}`);
      fireEvent.click(deleteButtons[0]);

      // 확인 다이얼로그에서 "Delete" 버튼 클릭
      const confirmDeleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(confirmDeleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith(mockReview.id);
      });
    });
  });
});
