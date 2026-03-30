import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewStatus } from '@my-project/shared';

import type { ReviewItem } from '@/types/review';

import { ReviewCard } from './review-card';

// ReviewPhotoGrid는 별도로 테스트하므로 모킹
jest.mock('./review-photo-grid', () => ({
  ReviewPhotoGrid: ({ photos }: { photos: { id: number; url: string }[] }) =>
    photos.length > 0 ? (
      <div data-testid="review-photo-grid">
        {photos.map((p) => (
          <img key={p.id} src={p.url} alt="review photo" />
        ))}
      </div>
    ) : null,
}));

const baseReview: ReviewItem = {
  id: 1,
  rating: 4,
  content: 'Great atmosphere and cocktails!',
  visitedAt: '2026-02-14',
  status: ReviewStatus.PUBLISHED,
  author: {
    id: 10,
    name: 'Alice Kim',
    profileImageUrl: null,
  },
  photos: [],
  createdAt: new Date('2026-03-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2026-03-01T00:00:00Z').toISOString(),
};

describe('ReviewCard', () => {
  describe('기본 렌더링', () => {
    it('should render author name', () => {
      render(<ReviewCard review={baseReview} />);
      expect(screen.getByText('Alice Kim')).toBeInTheDocument();
    });

    it('should render review content', () => {
      render(<ReviewCard review={baseReview} />);
      expect(screen.getByText('Great atmosphere and cocktails!')).toBeInTheDocument();
    });

    it('should render visit date when visitedAt is present', () => {
      render(<ReviewCard review={baseReview} />);
      expect(screen.getByText(/Visited:/)).toBeInTheDocument();
    });

    it('should not render visit date when visitedAt is null', () => {
      render(<ReviewCard review={{ ...baseReview, visitedAt: null }} />);
      expect(screen.queryByText(/Visited:/)).not.toBeInTheDocument();
    });

    it('should render star rating component', () => {
      render(<ReviewCard review={baseReview} />);
      // StarRating display mode: role="img"
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render relative time string for createdAt', () => {
      render(<ReviewCard review={baseReview} />);
      // date-fns formatDistanceToNow 결과가 있어야 함 (ago 포함)
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });
  });

  describe('author initials avatar', () => {
    it('should render initials for single-word name', () => {
      render(<ReviewCard review={{ ...baseReview, author: { ...baseReview.author, name: 'Alice' } }} />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should render up to 2 initials for multi-word name', () => {
      render(<ReviewCard review={baseReview} />);
      // "Alice Kim" => "AK"
      expect(screen.getByText('AK')).toBeInTheDocument();
    });
  });

  describe('본인 리뷰 메뉴', () => {
    it('should show dropdown menu trigger for own review', () => {
      render(<ReviewCard review={baseReview} currentUserId={10} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show Edit and Delete items when menu is opened for own review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={10} />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onEdit when Edit is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = jest.fn();
      render(<ReviewCard review={baseReview} currentUserId={10} onEdit={onEdit} />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Edit'));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when Delete is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      render(<ReviewCard review={baseReview} currentUserId={10} onDelete={onDelete} />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should not show Change Status or admin Delete for own review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={10} />);
      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('Change Status')).not.toBeInTheDocument();
    });
  });

  describe('타인 리뷰 메뉴 (비로그인 or 다른 유저)', () => {
    it('should not render menu button when currentUserId is undefined', () => {
      render(<ReviewCard review={baseReview} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render menu button when currentUserId is different from author (for Report)', () => {
      render(<ReviewCard review={baseReview} currentUserId={99} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not show Edit or Delete for non-owner non-admin', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={99} />);
      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('관리자 액션', () => {
    it('should show menu button for admin viewing other review', () => {
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show Change Status and Delete items for admin viewing other review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Change Status')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show Edit item for admin viewing other review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin />);
      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should call onModerate when Change Status is clicked', async () => {
      const user = userEvent.setup();
      const onModerate = jest.fn();
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin onModerate={onModerate} />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Change Status'));
      expect(onModerate).toHaveBeenCalledTimes(1);
    });

    it('should call onAdminDelete when admin Delete is clicked', async () => {
      const user = userEvent.setup();
      const onAdminDelete = jest.fn();
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin onAdminDelete={onAdminDelete} />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Delete'));
      expect(onAdminDelete).toHaveBeenCalledTimes(1);
    });

    it('should show status badge for non-PUBLISHED review when admin', () => {
      render(
        <ReviewCard
          review={{ ...baseReview, status: ReviewStatus.HIDDEN }}
          currentUserId={99}
          isAdmin
        />,
      );
      expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('should not show status badge for PUBLISHED review', () => {
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin />);
      expect(screen.queryByText('Published')).not.toBeInTheDocument();
    });
  });

  describe('사진', () => {
    it('should render ReviewPhotoGrid when photos exist', () => {
      const reviewWithPhotos: ReviewItem = {
        ...baseReview,
        photos: [
          { id: 1, url: 'https://example.com/photo1.jpg', sortOrder: 0 },
          { id: 2, url: 'https://example.com/photo2.jpg', sortOrder: 1 },
        ],
      };
      render(<ReviewCard review={reviewWithPhotos} />);
      expect(screen.getByTestId('review-photo-grid')).toBeInTheDocument();
    });

    it('should not render ReviewPhotoGrid when photos array is empty', () => {
      render(<ReviewCard review={baseReview} />);
      expect(screen.queryByTestId('review-photo-grid')).not.toBeInTheDocument();
    });
  });

  describe('신고(Report) 메뉴', () => {
    it('should show Report menu for non-owner, non-admin user', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={99} />);
      // 비소유 + 비관리자라도 Report를 위해 메뉴 버튼이 표시됨
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('should not show menu for unauthenticated user (no currentUserId)', () => {
      render(<ReviewCard review={baseReview} />);
      // 비인증 사용자에게는 메뉴 버튼 자체가 표시되지 않음
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not show Report menu for own review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={10} />);
      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });

    it('should not show Report menu for admin viewing other review', async () => {
      const user = userEvent.setup();
      render(<ReviewCard review={baseReview} currentUserId={99} isAdmin />);
      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });

    it('should call onReport when Report is clicked', async () => {
      const user = userEvent.setup();
      const onReport = jest.fn();
      render(<ReviewCard review={baseReview} currentUserId={99} onReport={onReport} />);
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Report'));
      expect(onReport).toHaveBeenCalledTimes(1);
    });
  });
});
