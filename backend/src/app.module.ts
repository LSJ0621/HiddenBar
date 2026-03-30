import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import configuration from './common/config/configuration.js';
import { validate } from './common/config/env.validation.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { BarsModule } from './bars/bars.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { BookmarksModule } from './bookmarks/bookmarks.module.js';
import { SearchModule } from './search/search.module.js';
import { AdminModule } from './admin/admin.module.js';
import { MapsModule } from './maps/maps.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { ReviewReportsModule } from './review-reports/review-reports.module.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminInitService } from './common/init/admin-init.service.js';
import { TriggerInitService } from './common/init/trigger-init.service.js';
import { SeedInitService } from './common/init/seed-init.service.js';
import { TestUserInitService } from './common/init/test-user-init.service.js';
import { User } from './entities/user.entity.js';
import { Account } from './entities/account.entity.js';
import { Bar } from './entities/bar.entity.js';
import { BarPhoto } from './entities/bar-photo.entity.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { OperatingHours } from './entities/operating-hours.entity.js';
import { OriginValidationMiddleware } from './common/middleware/origin-validation.middleware.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['.env.test']
          : ['.env.local', '.env'],
      load: [configuration],
      validate,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = process.env.NODE_ENV === 'production';
        return {
          pinoHttp: {
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            level: configService.get<string>('log.level') ?? 'info',
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const existingId = req.headers['x-request-id'];
              if (existingId) return existingId;
              const id = randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                },
            serializers: {
              req(req: { id: string; method: string; url: string }) {
                return { id: req.id, method: req.method, url: req.url };
              },
              res(res: { statusCode: number }) {
                return { statusCode: res.statusCode };
              },
            },
          },
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    AuthModule,
    UsersModule,
    SearchModule,
    BarsModule,
    PhotosModule,
    BookmarksModule,
    AdminModule,
    MapsModule,
    ReviewsModule,
    ReviewReportsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: configService.get<boolean>('database.synchronize'),
        dropSchema: configService.get<boolean>('database.dropSchema'),
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    TypeOrmModule.forFeature([User, Account, Bar, BarPhoto, MenuItem, OperatingHours]),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    AppService,
    AdminInitService,
    TriggerInitService,
    SeedInitService,
    TestUserInitService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(OriginValidationMiddleware).forRoutes('*');
  }
}
