'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './use-onboarding';

interface OnboardingDialogProps {
  /** 다이얼로그 타입: welcome(시작) 또는 complete(완료) */
  type: 'welcome' | 'complete';
}

/**
 * 온보딩 Welcome / Complete 다이얼로그
 * @description shadcn Dialog를 재사용하여 투어 시작/완료 화면 표시
 */
export function OnboardingDialog({ type }: OnboardingDialogProps) {
  const { startTour, skipTour, endTour } = useOnboarding();

  if (type === 'welcome') {
    return (
      <Dialog open onOpenChange={(open) => !open && skipTour()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Hidden Bar!</DialogTitle>
            <DialogDescription>
              Take a quick tour to learn how to search for bars, get directions,
              and navigate in real time. It only takes a minute.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={skipTour}>
              Skip
            </Button>
            <Button onClick={startTour}>Start Tour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && endTour()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You&apos;re all set!</DialogTitle>
          <DialogDescription>
            You now know how to search, explore, and navigate to hidden bars.
            You can replay this tour anytime from your profile.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={endTour}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
