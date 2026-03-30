import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 전역 예외 필터.
 * 모든 예외를 포착하여 일관된 에러 응답 구조로 변환한다.
 * HttpException은 상태코드를 유지하고, 그 외 예외는 500으로 처리한다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const errorResponse =
        typeof exceptionResponse === 'string'
          ? { statusCode, message: exceptionResponse, error: exception.name }
          : { statusCode, ...exceptionResponse };

      if (statusCode >= 500) {
        this.logger.error(exception.message, exception.stack);
      } else {
        this.logger.warn(`${statusCode} - ${exception.message}`);
      }

      response.status(statusCode).json(errorResponse);
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(message, stack);

    const isProduction = process.env.NODE_ENV === 'production';
    response.status(500).json({
      statusCode: 500,
      message: isProduction ? 'Internal Server Error' : message,
      error: 'Internal Server Error',
    });
  }
}
