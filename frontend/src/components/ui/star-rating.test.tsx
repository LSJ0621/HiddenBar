import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StarRating } from './star-rating';

describe('StarRating', () => {
  describe('display mode (onChange 없음)', () => {
    it('should render with role img and aria-label containing value', () => {
      render(<StarRating value={3} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', '3 out of 5 stars');
    });

    it('should render 5 Star icons', () => {
      const { container } = render(<StarRating value={4} />);
      // lucide-react Star SVG는 svg 엘리먼트로 렌더링됨
      const stars = container.querySelectorAll('svg');
      expect(stars).toHaveLength(5);
    });

    it('should not render buttons in display mode', () => {
      render(<StarRating value={3} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should apply sm size class when size is sm', () => {
      const { container } = render(<StarRating value={2} size="sm" />);
      const star = container.querySelector('svg');
      expect(star).toHaveClass('size-4');
    });

    it('should apply lg size class when size is lg', () => {
      const { container } = render(<StarRating value={2} size="lg" />);
      const star = container.querySelector('svg');
      expect(star).toHaveClass('size-6');
    });

    it('should apply default md size class when size is not specified', () => {
      const { container } = render(<StarRating value={2} />);
      const star = container.querySelector('svg');
      expect(star).toHaveClass('size-5');
    });
  });

  describe('interactive mode (onChange 있음)', () => {
    it('should render with role radiogroup', () => {
      render(<StarRating value={0} onChange={jest.fn()} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should render 5 radio buttons', () => {
      render(<StarRating value={0} onChange={jest.fn()} />);
      expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    it('should render aria-label for each star button', () => {
      render(<StarRating value={0} onChange={jest.fn()} />);
      expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '2 stars' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
    });

    it('should call onChange with correct value when star is clicked', () => {
      const handleChange = jest.fn();
      render(<StarRating value={0} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));
      expect(handleChange).toHaveBeenCalledWith(3);
    });

    it('should call onChange with 1 when first star is clicked', () => {
      const handleChange = jest.fn();
      render(<StarRating value={0} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('radio', { name: '1 star' }));
      expect(handleChange).toHaveBeenCalledWith(1);
    });

    it('should call onChange with 5 when fifth star is clicked', () => {
      const handleChange = jest.fn();
      render(<StarRating value={0} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
      expect(handleChange).toHaveBeenCalledWith(5);
    });

    it('should mark selected star as aria-checked true', () => {
      render(<StarRating value={3} onChange={jest.fn()} />);
      expect(screen.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark non-selected stars as aria-checked false', () => {
      render(<StarRating value={3} onChange={jest.fn()} />);
      expect(screen.getByRole('radio', { name: '1 star' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('radio', { name: '5 stars' })).toHaveAttribute('aria-checked', 'false');
    });

    it('should show hover preview when mouse enters a star', async () => {
      const user = userEvent.setup();
      const { container } = render(<StarRating value={1} onChange={jest.fn()} />);

      const fourthStarButton = screen.getByRole('radio', { name: '4 stars' });
      await user.hover(fourthStarButton);

      // 호버 시 4번째 star까지 fill 클래스가 적용돼야 함
      const stars = container.querySelectorAll('svg');
      // 1~4번째 별은 filled 상태여야 함
      expect(stars[0]).toHaveClass('fill-amber-400');
      expect(stars[3]).toHaveClass('fill-amber-400');
      // 5번째 별은 unfilled 상태여야 함
      expect(stars[4]).toHaveClass('fill-transparent');
    });

    it('should revert to original value when mouse leaves', async () => {
      const user = userEvent.setup();
      const { container } = render(<StarRating value={2} onChange={jest.fn()} />);

      const fourthStarButton = screen.getByRole('radio', { name: '4 stars' });
      await user.hover(fourthStarButton);
      await user.unhover(fourthStarButton);

      // 호버 해제 후 value=2 기준으로 돌아와야 함
      const stars = container.querySelectorAll('svg');
      expect(stars[1]).toHaveClass('fill-amber-400'); // 2번째 별 filled
      expect(stars[2]).toHaveClass('fill-transparent'); // 3번째 별 unfilled
    });
  });

  describe('accessibility', () => {
    it('display mode: container has aria-label with value and out of 5 stars', () => {
      render(<StarRating value={4} />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', '4 out of 5 stars');
    });

    it('interactive mode: container has aria-label "Rating"', () => {
      render(<StarRating value={0} onChange={jest.fn()} />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Rating');
    });
  });
});
