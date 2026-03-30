import {
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGetResponse: jest.Mock;
  let mockHost: any;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
      }),
    };

    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  // --- HttpException 처리 (기존) ---

  it('should return structured response for string exception', () => {
    const exception = new HttpException(
      'Something went wrong',
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Something went wrong',
      error: 'HttpException',
    });
  });

  it('should return merged response for object exception', () => {
    const exception = new BadRequestException({
      message: ['field must not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['field must not be empty'],
        error: 'Bad Request',
      }),
    );
  });

  it('should call logger.error for 500 errors', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    const exception = new InternalServerErrorException('Server error');

    filter.catch(exception, mockHost);

    expect(errorSpy).toHaveBeenCalled();
  });

  it('should call logger.warn for non-5xx errors', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn');
    const exception = new BadRequestException('Bad input');

    filter.catch(exception, mockHost);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('400'));
  });

  it('should set correct status code on response for 400', () => {
    const exception = new BadRequestException('Bad');
    filter.catch(exception, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(400);
  });

  it('should set correct status code on response for 401', () => {
    const exception = new UnauthorizedException('Unauthorized');
    filter.catch(exception, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(401);
  });

  it('should set correct status code on response for 403', () => {
    const exception = new ForbiddenException('Forbidden');
    filter.catch(exception, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(403);
  });

  it('should set correct status code on response for 404', () => {
    const exception = new NotFoundException('Not Found');
    filter.catch(exception, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(404);
  });

  it('should set correct status code on response for 500', () => {
    const exception = new InternalServerErrorException('Internal');
    filter.catch(exception, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(500);
  });

  // --- Unknown 예외 처리 (신규) ---

  it('should return 500 for plain Error', () => {
    const exception = new Error('unexpected error');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });

  it('should return 500 for TypeError', () => {
    const exception = new TypeError('cannot read property of undefined');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });

  it('should return 500 for string exception', () => {
    filter.catch('something broke', mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });

  it('should return 500 for null/undefined exception', () => {
    filter.catch(null, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );

    filter.catch(undefined, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
  });

  it('should hide error details in production', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('secret db connection string');

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
    });
  });

  it('should expose error details in non-production', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('detailed error info');

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'detailed error info',
      error: 'Internal Server Error',
    });
  });

  it('should log stack trace for Error instances', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    const exception = new Error('with stack');

    filter.catch(exception, mockHost);

    expect(errorSpy).toHaveBeenCalledWith('with stack', exception.stack);
  });
});
