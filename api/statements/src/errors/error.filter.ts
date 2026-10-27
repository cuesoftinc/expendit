import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Every error leaves in the ecosystem envelope, never as a stack trace. */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      if (typeof body === 'object' && body !== null && 'error' in body) {
        response.status(status).json(body);
        return;
      }
      response.status(status).json({
        error: { code: status === 404 ? 'not_found' : 'bad_request', message: exception.message, details: {} },
      });
      return;
    }
    this.logger.error({ message: 'unhandled error', error: (exception as Error)?.message });
    response.status(500).json({ error: { code: 'internal', message: 'Something went wrong', details: {} } });
  }
}
