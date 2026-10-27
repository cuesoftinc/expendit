import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { from, type Observable, switchMap } from 'rxjs';
import { type TicketClaims, TicketService } from '../ticket/ticket.service';
import { ApiError } from '../errors/api-error';

/** Multipart framing around a single file part. */
const MULTIPART_OVERHEAD = 64 * 1024;

export interface TicketedRequest extends Request {
  ticket: TicketClaims;
  file?: Express.Multer.File;
}

/**
 * Verifies the ticket and the declared size before reading the body
 * (system-design.md §8 "Abuse"), then reads the single `file` part with the
 * ticket's max_bytes as the hard limit.
 */
@Injectable()
export class TicketUploadInterceptor implements NestInterceptor {
  constructor(private readonly tickets: TicketService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<TicketedRequest>();
    const response = http.getResponse<Response>();

    const ticket = this.tickets.verify(request.header('upload-ticket'));
    const declared = Number(request.header('content-length') ?? 0);
    if (declared > ticket.max_bytes + MULTIPART_OVERHEAD) {
      throw tooLarge(ticket.max_bytes);
    }
    request.ticket = ticket;

    const read = new Promise<void>((resolve, reject) => {
      multer({ storage: multer.memoryStorage(), limits: { fileSize: ticket.max_bytes, files: 1, fields: 0 } }).single('file')(
        request,
        response,
        (error: unknown) => {
          if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') return reject(tooLarge(ticket.max_bytes));
          if (error instanceof MulterError) {
            return reject(new ApiError(400, 'invalid_upload', 'Send one file in a multipart field named "file"'));
          }
          if (error) return reject(error);
          resolve();
        },
      );
    });
    return from(read).pipe(switchMap(() => next.handle()));
  }
}

const tooLarge = (maxBytes: number) =>
  new ApiError(413, 'file_too_large', `Files can be at most ${Math.floor(maxBytes / (1024 * 1024))} MB`, { max_bytes: maxBytes });
