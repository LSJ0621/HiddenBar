import { AxiosError } from 'axios';
import { toast } from 'sonner';

/**
 * AxiosError에서 서버 메시지를 추출하여 toast.error를 호출한다.
 * AxiosError가 아닌 경우 fallback 메시지를 표시한다.
 */
export function showErrorToast(error: unknown, fallback: string): void {
  if (error instanceof AxiosError) {
    toast.error(error.response?.data?.message ?? fallback);
  } else {
    toast.error(fallback);
  }
}
