import { render, screen } from '@testing-library/react';

import type { ReviewStats } from '@/types/review';

import { ReviewStatsSummary } from './review-stats-summary';

const fullStats: ReviewStats = {
  averageRating: 4.2,
  totalCount: 25,
  distribution: [
    { rating: 5, count: 10 },
    { rating: 4, count: 8 },
    { rating: 3, count: 4 },
    { rating: 2, count: 2 },
    { rating: 1, count: 1 },
  ],
};

describe('ReviewStatsSummary', () => {
  describe('평균 별점 표시', () => {
    it('should render average rating formatted to 1 decimal place', () => {
      render(<ReviewStatsSummary stats={fullStats} />);
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    it('should render "/ 5" unit text', () => {
      render(<ReviewStatsSummary stats={fullStats} />);
      expect(screen.getByText('/ 5')).toBeInTheDocument();
    });

    it('should render total review count with "reviews" label', () => {
      render(<ReviewStatsSummary stats={fullStats} />);
      expect(screen.getByText('25 reviews')).toBeInTheDocument();
    });

    it('should render "review" (singular) when totalCount is 1', () => {
      const singleStats: ReviewStats = { ...fullStats, totalCount: 1 };
      render(<ReviewStatsSummary stats={singleStats} />);
      expect(screen.getByText('1 review')).toBeInTheDocument();
    });
  });

  describe('별점 분포 바', () => {
    it('should render distribution rows for all 5 ratings', () => {
      render(<ReviewStatsSummary stats={fullStats} />);
      // 1~5 별 레이블이 분포 바 영역에 렌더링돼야 함 (별점 표시 영역과 중복되므로 getAllByText 사용)
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('should render count numbers for each rating in distribution', () => {
      render(<ReviewStatsSummary stats={fullStats} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      // count=4, count=2, count=1 은 분포 바 영역의 숫자 (별점과 겹칠 수 있어 getAllByText 사용)
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });

    it('should apply correct width percentage to distribution bar for rating 5', () => {
      const { container } = render(<ReviewStatsSummary stats={fullStats} />);
      // rating 5 count = 10, totalCount = 25 => 40%
      const bars = container.querySelectorAll('[style]');
      const bar5 = Array.from(bars).find((el) => (el as HTMLElement).style.width === '40%');
      expect(bar5).toBeTruthy();
    });

    it('should apply 0% width for rating with no reviews', () => {
      const statsWithZeroRating: ReviewStats = {
        ...fullStats,
        distribution: [
          { rating: 5, count: 5 },
          { rating: 4, count: 0 },
          { rating: 3, count: 0 },
          { rating: 2, count: 0 },
          { rating: 1, count: 0 },
        ],
        totalCount: 5,
      };
      const { container } = render(<ReviewStatsSummary stats={statsWithZeroRating} />);
      const bars = container.querySelectorAll('[style]');
      const zeroBars = Array.from(bars).filter((el) => (el as HTMLElement).style.width === '0%');
      expect(zeroBars).toHaveLength(4);
    });
  });

  describe('리뷰 없을 때 (totalCount = 0)', () => {
    const emptyStats: ReviewStats = {
      averageRating: 0,
      totalCount: 0,
      distribution: [],
    };

    it('should render "—" instead of average rating when no reviews', () => {
      render(<ReviewStatsSummary stats={emptyStats} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should render "0 reviews" when totalCount is 0', () => {
      render(<ReviewStatsSummary stats={emptyStats} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });

    it('should render 0 count for all distribution rows', () => {
      render(<ReviewStatsSummary stats={emptyStats} />);
      // 0이 5개 렌더링돼야 함 (각 별점 분포)
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(5);
    });

    it('should render all distribution bars with 0% width', () => {
      const { container } = render(<ReviewStatsSummary stats={emptyStats} />);
      const bars = container.querySelectorAll('[style]');
      const zeroBars = Array.from(bars).filter((el) => (el as HTMLElement).style.width === '0%');
      expect(zeroBars).toHaveLength(5);
    });
  });

  describe('className prop', () => {
    it('should apply additional className to root element', () => {
      const { container } = render(<ReviewStatsSummary stats={fullStats} className="mt-8" />);
      expect(container.firstChild).toHaveClass('mt-8');
    });
  });
});
