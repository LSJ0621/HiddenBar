import { render, screen } from '@testing-library/react';
import { RatingBadge } from './rating-badge';

describe('RatingBadge', () => {
  // ─── reviewCount > 0 ─────────────────────────────────────────────────

  describe('reviewCount > 0일 때', () => {
    it('should render star icon', () => {
      const { container } = render(
        <RatingBadge averageRating={4.3} reviewCount={12} />,
      );
      // lucide-react Star SVG가 렌더링되어야 한다
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render rating formatted to 1 decimal place', () => {
      render(<RatingBadge averageRating={4.3} reviewCount={12} />);
      expect(screen.getByText('4.3')).toBeInTheDocument();
    });

    it('should render review count in parentheses by default', () => {
      render(<RatingBadge averageRating={4.3} reviewCount={12} />);
      expect(screen.getByText('(12)')).toBeInTheDocument();
    });

    it('should render toFixed(1) even when rating is whole number', () => {
      render(<RatingBadge averageRating={4} reviewCount={5} />);
      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('should not render "New" text when reviewCount > 0', () => {
      render(<RatingBadge averageRating={4.3} reviewCount={12} />);
      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });
  });

  // ─── reviewCount === 0 + showEmpty=true (default) ────────────────────

  describe('reviewCount === 0이고 showEmpty=true (기본값)일 때', () => {
    it('should render "New" text', () => {
      render(<RatingBadge averageRating={0} reviewCount={0} />);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should not render star icon', () => {
      const { container } = render(
        <RatingBadge averageRating={0} reviewCount={0} />,
      );
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });

    it('should not render review count parentheses', () => {
      render(<RatingBadge averageRating={0} reviewCount={0} />);
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });

    it('should render "New" when showEmpty is explicitly true', () => {
      render(
        <RatingBadge averageRating={0} reviewCount={0} showEmpty={true} />,
      );
      expect(screen.getByText('New')).toBeInTheDocument();
    });
  });

  // ─── reviewCount === 0 + showEmpty=false ─────────────────────────────

  describe('reviewCount === 0이고 showEmpty=false일 때', () => {
    it('should render nothing (null)', () => {
      const { container } = render(
        <RatingBadge averageRating={0} reviewCount={0} showEmpty={false} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('should not render "New" text', () => {
      render(
        <RatingBadge averageRating={0} reviewCount={0} showEmpty={false} />,
      );
      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('should not render star icon', () => {
      const { container } = render(
        <RatingBadge averageRating={0} reviewCount={0} showEmpty={false} />,
      );
      expect(container.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  // ─── size="compact" ──────────────────────────────────────────────────

  describe('size="compact"일 때', () => {
    it('should render star icon', () => {
      const { container } = render(
        <RatingBadge averageRating={4.3} reviewCount={12} size="compact" />,
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render rating number', () => {
      render(<RatingBadge averageRating={4.3} reviewCount={12} size="compact" />);
      expect(screen.getByText('4.3')).toBeInTheDocument();
    });

    it('should omit review count parentheses', () => {
      render(<RatingBadge averageRating={4.3} reviewCount={12} size="compact" />);
      expect(screen.queryByText('(12)')).not.toBeInTheDocument();
    });

    it('should show review count parentheses in default size', () => {
      render(
        <RatingBadge averageRating={4.3} reviewCount={12} size="default" />,
      );
      expect(screen.getByText('(12)')).toBeInTheDocument();
    });
  });
});
