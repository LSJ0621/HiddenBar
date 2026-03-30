import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailNotificationService } from './email-notification.service.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

const mockMailerService = () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
});

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mailerService: ReturnType<typeof mockMailerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        { provide: MailerService, useFactory: mockMailerService },
      ],
    }).compile();

    service = module.get<EmailNotificationService>(EmailNotificationService);
    mailerService = module.get(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send signup verification email with correct subject', async () => {
    await service.sendVerificationCode(
      'test@example.com',
      '123456',
      EmailVerificationPurpose.SIGNUP,
    );

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: '[HiddenBar] Signup Verification Code',
        template: 'verification-code',
        context: expect.objectContaining({
          code: '123456',
          purpose: EmailVerificationPurpose.SIGNUP,
          expirationMinutes: 3,
        }),
      }),
    );
  });

  it('should send reset password verification email with correct subject', async () => {
    await service.sendVerificationCode(
      'test@example.com',
      '654321',
      EmailVerificationPurpose.RESET_PASSWORD,
    );

    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '[HiddenBar] Password Reset Verification Code',
      }),
    );
  });

  it('should propagate mailer errors', async () => {
    mailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

    await expect(
      service.sendVerificationCode(
        'test@example.com',
        '123456',
        EmailVerificationPurpose.SIGNUP,
      ),
    ).rejects.toThrow('SMTP error');
  });
});
