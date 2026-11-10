import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const body = this.toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        ...body,
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
        timestamp: new Date().toISOString(),
      },
      body.statusCode,
    );
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode, error: exception.name, message: response };
      }

      const { error, message } = response as Partial<ErrorBody>;
      return {
        statusCode,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
    ) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Resource already exists',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    };
  }
}
