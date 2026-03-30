/**
 * BarForm 멀티스텝 폼 회귀 방지 테스트
 *
 * 수정 내용:
 * - onSubmit에 `if (currentStep !== LAST_STEP) return;` 가드
 * - form의 onKeyDown 핸들러: HTMLInputElement의 Enter 키 시 preventDefault
 * - 제출 트리거를 네이티브 form submit에서 분리 (Register 버튼 type="button" + onClick)
 * - 5단계 위자드 (Basic → Location → Photos → Menu → Hours)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarForm } from '../bar-form';

// ────────────────────────────────────────────────────────────────────────────────
// next/navigation mock
// ────────────────────────────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ────────────────────────────────────────────────────────────────────────────────
// useCreateBar / useUpdateBar / useUploadPhotos mock
// ────────────────────────────────────────────────────────────────────────────────
const mockMutateAsync = jest.fn();

jest.mock('@/hooks/queries/use-bars', () => ({
  useCreateBar: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUpdateBar: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useUploadPhotos: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

// ────────────────────────────────────────────────────────────────────────────────
// @tanstack/react-query mock (useQueryClient)
// ────────────────────────────────────────────────────────────────────────────────
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

// ────────────────────────────────────────────────────────────────────────────────
// sonner mock
// ────────────────────────────────────────────────────────────────────────────────
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// ────────────────────────────────────────────────────────────────────────────────
// Step 컴포넌트 mock
// Step 2는 Google Maps / useFormContext 등 복잡한 외부 의존성을 가지므로 전체 mock.
// 각 step은 data-testid와 내부 input을 그대로 노출시켜 Enter 키 이벤트 테스트에 사용.
// ────────────────────────────────────────────────────────────────────────────────
jest.mock('@/components/bars/bar-form-step-basic', () => ({
  BarFormStepBasic: () => (
    <div data-testid="bar-form-step-1">
      <input data-testid="step1-name-input" placeholder="Enter bar name" />
    </div>
  ),
}));

jest.mock('@/components/bars/bar-form-step-location', () => ({
  BarFormStepLocation: () => (
    <div data-testid="bar-form-step-2">
      <input data-testid="step2-address-input" placeholder="Enter address" />
    </div>
  ),
}));

jest.mock('@/components/bars/bar-form-step-photos', () => ({
  BarFormStepPhotos: () => (
    <div data-testid="bar-form-step-3">
      <p>Photos step</p>
    </div>
  ),
}));

jest.mock('@/components/bars/bar-form-step-details', () => ({
  BarFormStepMenu: () => (
    <div data-testid="bar-form-step-4">
      <p>Menu step</p>
    </div>
  ),
}));

jest.mock('@/components/bars/bar-form-step-hours', () => ({
  BarFormStepHours: () => (
    <div data-testid="bar-form-step-5">
      <p>Hours step</p>
    </div>
  ),
}));

// ────────────────────────────────────────────────────────────────────────────────
// 헬퍼: 마지막 단계(step 5)까지 Next 버튼을 눌러 이동
// step 3, 4에서 Next를 누르면 검증 없이 또는 optional 검증으로 즉시 이동.
// step 1, 2는 필드 validation이 있으나, react-hook-form의 trigger가
// mock 컴포넌트 내부의 비제어 input을 인식하지 못하므로 defaultValues로
// 유효한 초기값을 주입한 상태에서 호출한다.
// ────────────────────────────────────────────────────────────────────────────────

/**
 * 마지막 단계(step 5)에 도달하기 위해 step 1~4의 Next 버튼을 순서대로 클릭한다.
 */
async function navigateToLastStep() {
  const user = userEvent.setup();

  // step 1 → step 2
  await user.click(screen.getByTestId('bar-form-next-button'));
  // step 2 → step 3
  await user.click(screen.getByTestId('bar-form-next-button'));
  // step 3 → step 4 (step 3에는 validation 필드 없음)
  await user.click(screen.getByTestId('bar-form-next-button'));
  // step 4 → step 5 (menuItems는 optional)
  await user.click(screen.getByTestId('bar-form-next-button'));
}

/** 마지막 단계에서 사용할 유효한 defaultValues */
const validDefaultValues = {
  name: 'Test Bar',
  description: 'A great bar',
  address: '123 Main St',
  city: 'Bangkok',
  country: 'Thailand',
  latitude: 13.7563,
  longitude: 100.5018,
  phone: '',
  website: '',
  menuItems: [],
  operatingHours: [],
};

// ────────────────────────────────────────────────────────────────────────────────

describe('BarForm - 조기 submit 버그 회귀 방지', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Enter 키 입력 시 조기 submit 방지 (onKeyDown 가드)', () => {
    it('step 1에서 HTMLInputElement에 Enter 키 입력 시 createBar가 호출되지 않는다', async () => {
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      // step 1이 렌더링되어 있는지 확인
      expect(screen.getByTestId('bar-form-step-1')).toBeInTheDocument();

      // step 1의 input에 Enter 키 이벤트 발생
      const nameInput = screen.getByTestId('step1-name-input');
      fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

      // createBar.mutateAsync가 호출되지 않아야 한다
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('step 2에서 HTMLInputElement에 Enter 키 입력 시 createBar가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      // step 1 → step 2로 이동
      await user.click(screen.getByTestId('bar-form-next-button'));

      // step 2가 렌더링되어 있는지 확인
      expect(screen.getByTestId('bar-form-step-2')).toBeInTheDocument();

      // step 2의 input에 Enter 키 이벤트 발생
      const addressInput = screen.getByTestId('step2-address-input');
      fireEvent.keyDown(addressInput, { key: 'Enter', code: 'Enter' });

      // createBar.mutateAsync가 호출되지 않아야 한다
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('마지막 단계(step 5)에서만 submit 가능', () => {
    it('마지막 단계에서 submit 버튼 클릭 시 createBar가 정상 호출된다', async () => {
      mockMutateAsync.mockResolvedValue({ id: 42, name: 'Test Bar' });

      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      await navigateToLastStep();

      // step 5가 렌더링되어 있는지 확인
      expect(screen.getByTestId('bar-form-step-5')).toBeInTheDocument();

      // submit 버튼이 표시되어 있어야 한다 (Next 버튼 대신)
      expect(screen.getByTestId('bar-form-submit-button')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-form-next-button')).not.toBeInTheDocument();

      // submit 버튼 클릭
      const user = userEvent.setup();
      await user.click(screen.getByTestId('bar-form-submit-button'));

      // createBar.mutateAsync가 호출되어야 한다
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Step 3 → Step 4 전환 시 자동 제출 방지', () => {
    it('step 3에서 Next 클릭 시 step 4(Menu)가 표시되고 자동 제출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      // step 1 → step 2 → step 3
      await user.click(screen.getByTestId('bar-form-next-button'));
      await user.click(screen.getByTestId('bar-form-next-button'));

      expect(screen.getByTestId('bar-form-step-3')).toBeInTheDocument();

      // step 3 → step 4
      await user.click(screen.getByTestId('bar-form-next-button'));

      // step 4(Menu)가 정상 표시되어야 한다
      expect(screen.getByTestId('bar-form-step-4')).toBeInTheDocument();

      // Next 버튼이 여전히 표시되어야 한다 (마지막 단계가 아니므로)
      expect(screen.getByTestId('bar-form-next-button')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-form-submit-button')).not.toBeInTheDocument();

      // createBar가 호출되지 않아야 한다
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('onKeyDown 가드의 조건 분기 검증', () => {
    it('step 1에서 div 요소에 Enter 키 입력 시 createBar가 호출되지 않는다', () => {
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      expect(screen.getByTestId('bar-form-step-1')).toBeInTheDocument();

      // div(HTMLDivElement)에서 Enter — onKeyDown 가드 조건(instanceof HTMLInputElement) 미충족
      const step1Container = screen.getByTestId('bar-form-step-1');
      fireEvent.keyDown(step1Container, { key: 'Enter', code: 'Enter' });

      // form submit이 발생하지 않으므로 createBar는 호출되지 않아야 한다
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('step 3(photos)에서 Enter 키 입력 시 createBar가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      // step 1 → step 2 → step 3
      await user.click(screen.getByTestId('bar-form-next-button'));
      await user.click(screen.getByTestId('bar-form-next-button'));

      expect(screen.getByTestId('bar-form-step-3')).toBeInTheDocument();

      const step3Container = screen.getByTestId('bar-form-step-3');
      fireEvent.keyDown(step3Container, { key: 'Enter', code: 'Enter' });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('마지막 단계에서 div 요소에 Enter 키 입력 시 createBar가 호출되지 않는다', async () => {
      render(<BarForm mode="create" defaultValues={validDefaultValues} />);

      await navigateToLastStep();

      expect(screen.getByTestId('bar-form-step-5')).toBeInTheDocument();

      // step 5의 div에서 Enter — type="button"이므로 네이티브 submit 불가
      const step5Container = screen.getByTestId('bar-form-step-5');
      fireEvent.keyDown(step5Container, { key: 'Enter', code: 'Enter' });

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });
});
