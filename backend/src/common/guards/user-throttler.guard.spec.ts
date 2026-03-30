import { UserThrottlerGuard } from './user-throttler.guard.js';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;

  beforeEach(() => {
    // UserThrottlerGuard는 ThrottlerGuard를 상속하므로 DI 없이 getTracker만 테스트
    guard = Object.create(UserThrottlerGuard.prototype);
  });

  describe('getTracker', () => {
    it('인증된 사용자면 user-{id}를 반환한다', async () => {
      const req = { user: { id: 42 }, ip: '127.0.0.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('user-42');
    });

    it('req.user가 없으면 IP를 반환한다', async () => {
      const req = { ip: '192.168.1.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('192.168.1.1');
    });

    it('req.user.id가 없으면 IP를 반환한다', async () => {
      const req = { user: {}, ip: '10.0.0.1' };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('10.0.0.1');
    });

    it('req.user도 IP도 없으면 unknown을 반환한다', async () => {
      const req = {};
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('unknown');
    });
  });
});
