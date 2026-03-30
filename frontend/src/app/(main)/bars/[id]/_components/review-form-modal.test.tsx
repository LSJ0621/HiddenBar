import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewStatus } from '@my-project/shared';

import type { ReviewItem } from '@/types/review';

// 모달이 Desktop(Dialog)으로 렌더링되도록 useMediaQuery를 true로 설정
jest.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: jest.fn(() => ({ matches: true, mounted: true })),
}));

const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();
const mockUploadMutateAsync = jest.fn();
const mockDeletePhotoMutate = jest.fn();

jest.mock('@/hooks/queries/use-reviews', () => ({
  useCreateReview: jest.fn(() => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  })),
  useUpdateReview: jest.fn(() => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  })),
  useUploadReviewPhotos: jest.fn(() => ({
    mutateAsync: mockUploadMutateAsync,
    isPending: false,
  })),
  useDeleteReviewPhoto: jest.fn(() => ({
    mutate: mockDeletePhotoMutate,
    isPending: false,
  })),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// PhotoUploader는 복잡한 dropzone 로직이 있으므로 모킹
jest.mock('@/components/bars/photo-uploader', () => ({
  PhotoUploader: ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => (
    <div data-testid="photo-uploader">
      <input
        type="file"
        data-testid="photo-input"
        onChange={(e) => {
          if (e.target.files) {
            onFilesChange(Array.from(e.target.files));
          }
        }}
      />
    </div>
  ),
}));

const mockOnOpenChange = jest.fn();

const existingReview: ReviewItem = {
  id: 42,
  rating: 4,
  content: 'Original review content',
  visitedAt: '2026-01-15',
  status: ReviewStatus.PUBLISHED,
  author: { id: 1, name: 'Test User', profileImageUrl: null },
  photos: [{ id: 100, url: 'https://example.com/photo.jpg', sortOrder: 0 }],
  createdAt: '2026-01-16T00:00:00Z',
  updatedAt: '2026-01-16T00:00:00Z',
};

describe('ReviewFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({ id: 99, barId: 1 });
    mockUpdateMutateAsync.mockResolvedValue({ id: 42 });
    mockUploadMutateAsync.mockResolvedValue(undefined);
  });

  // lazy import로 컴포넌트를 가져와야 모킹이 올바르게 적용됨
  const renderModal = (props: Partial<Parameters<typeof import('./review-form-modal')['ReviewFormModal']>[0]> = {}) => {
    const { ReviewFormModal } = require('./review-form-modal');
    return render(
      <ReviewFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        barId={1}
        {...props}
      />,
    );
  };

  describe('신규 작성 모드', () => {
    it('should render dialog title "Write a Review"', () => {
      renderModal();
      expect(screen.getByText('Write a Review')).toBeInTheDocument();
    });

    it('should render Submit button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
    });

    it('should render Rating, Review, Visit Date fields', () => {
      renderModal();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText(/Visit Date/i)).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should call onOpenChange(false) when Cancel is clicked', () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('폼 유효성 검사: 별점 미선택', () => {
    it('should show rating error message when rating is 0 and form is submitted', async () => {
      renderModal();
      // textarea에 내용 입력
      const textarea = screen.getByPlaceholderText(/How was your experience/i);
      await userEvent.type(textarea, 'Some content');

      // Submit 클릭 (rating = 0)
      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText('Please select a rating')).toBeInTheDocument();
      });
    });

    it('should not call createReview mutation when rating is invalid', async () => {
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

      await waitFor(() => {
        expect(mockCreateMutateAsync).not.toHaveBeenCalled();
      });
    });
  });

  describe('폼 유효성 검사: 내용 비어있음', () => {
    it('should show content error when content is empty and form is submitted', async () => {
      renderModal();
      // rating은 선택하되 content는 비워둠
      fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));
      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a review')).toBeInTheDocument();
      });
    });
  });

  describe('폼 유효성 검사: 미래 방문 날짜', () => {
    it('should show error when visitedAt is a future date', async () => {
      renderModal();

      // rating 선택
      fireEvent.click(screen.getByRole('radio', { name: '4 stars' }));

      // content 입력
      const textarea = screen.getByPlaceholderText(/How was your experience/i);
      await userEvent.type(textarea, 'Great bar!');

      // react-hook-form의 setValue로 미래 날짜를 직접 설정 (Calendar UI는 미래 날짜를 disabled 처리하므로)
      // Zod 스키마 레벨의 검증을 테스트하기 위해 form 내부를 직접 조작
      // Calendar picker에서는 disabled={{ after: new Date() }}로 미래 날짜 선택이 차단되므로,
      // 이 테스트는 스키마 레벨 방어를 확인하는 것임
      const { reviewSchema } = require('@/lib/validations/review-schema');
      const result = reviewSchema.safeParse({
        rating: 4,
        content: 'Great bar!',
        visitedAt: '2099-12-31',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('수정 모드', () => {
    it('should render dialog title "Edit Review" in edit mode', () => {
      renderModal({ editingReview: existingReview });
      expect(screen.getByText('Edit Review')).toBeInTheDocument();
    });

    it('should render Update button instead of Submit in edit mode', () => {
      renderModal({ editingReview: existingReview });
      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Submit/i })).not.toBeInTheDocument();
    });

    it('should pre-fill content field with existing review content', () => {
      renderModal({ editingReview: existingReview });
      expect(screen.getByDisplayValue('Original review content')).toBeInTheDocument();
    });

    it('should pre-fill visitedAt field with existing review date', () => {
      renderModal({ editingReview: existingReview });
      // Calendar date picker에서 날짜는 "Jan 15, 2026" 형식으로 표시됨
      expect(screen.getByText('Jan 15, 2026')).toBeInTheDocument();
    });

    it('should mark existing rating as aria-checked on the correct star', () => {
      renderModal({ editingReview: existingReview });
      // rating=4 => 4번째 별이 aria-checked=true
      expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true');
    });

    it('should call updateReview mutation on valid submit in edit mode', async () => {
      renderModal({ editingReview: existingReview });

      fireEvent.click(screen.getByRole('button', { name: /Update/i }));

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
          rating: 4,
          content: 'Original review content',
          visitedAt: '2026-01-15',
        });
      });
    });

    it('should not call createReview mutation in edit mode', async () => {
      renderModal({ editingReview: existingReview });

      fireEvent.click(screen.getByRole('button', { name: /Update/i }));

      await waitFor(() => {
        expect(mockCreateMutateAsync).not.toHaveBeenCalled();
      });
    });
  });

  describe('신규 작성 성공 제출', () => {
    it('should call createReview with correct data', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
      const textarea = screen.getByPlaceholderText(/How was your experience/i);
      await userEvent.type(textarea, 'Amazing place!');

      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            barId: 1,
            rating: 5,
            content: 'Amazing place!',
          }),
        );
      });
    });

    it('should call onOpenChange(false) after successful create', async () => {
      renderModal();

      fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
      const textarea = screen.getByPlaceholderText(/How was your experience/i);
      await userEvent.type(textarea, 'Amazing place!');

      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('닫힌 상태', () => {
    it('should not render dialog content when open is false', () => {
      renderModal({ open: false });
      expect(screen.queryByText('Write a Review')).not.toBeInTheDocument();
    });
  });
});
