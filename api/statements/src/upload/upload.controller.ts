import { Controller, HttpCode, HttpStatus, Post, Req, UseInterceptors } from '@nestjs/common';
import { TicketUploadInterceptor, type TicketedRequest } from './ticket-upload.interceptor';
import { type UploadAccepted, UploadService } from './upload.service';

/**
 * POST /api/v1/uploads — the only route the load balancer sends here
 * (S-14). Auth is the upload ticket, not a user session.
 */
@Controller('api/v1/uploads')
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(TicketUploadInterceptor)
  upload(@Req() request: TicketedRequest): Promise<UploadAccepted> {
    return this.uploads.accept(request.ticket, request.file);
  }
}
