import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter.js';
import { join } from 'path';
import { User } from '../entities/user.entity.js';
import { Account } from '../entities/account.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { EmailVerification } from '../entities/email-verification.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { GoogleOAuthClient } from './clients/google-oauth.client.js';
import { CookieService } from './cookie.service.js';
import { EmailNotificationService } from './email-notification.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { AuthPasswordService } from './auth-password.service.js';

@Module({
  imports: [
    PassportModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret')!,
        signOptions: {
          expiresIn: configService.get('jwt.accessExpiration', '15m'),
        },
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('email.host'),
          port: configService.get<number>('email.port'),
          secure: configService.get<boolean>('email.secure'),
          auth: {
            user: configService.get<string>('email.address'),
            pass: configService.get<string>('email.password'),
          },
        },
        defaults: {
          from: `"${configService.get<string>('email.fromName')}" <${configService.get<string>('email.address')}>`,
        },
        template: {
          dir: join(__dirname, '..', 'templates', 'email'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
    TypeOrmModule.forFeature([User, Account, RefreshToken, EmailVerification]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleOAuthClient,
    CookieService,
    EmailNotificationService,
    EmailVerificationService,
    AuthPasswordService,
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
