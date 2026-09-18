import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';

const MAX_RECEIPT_FILE_SIZE = 10 << 20; // 10 MB, matches the old monolith's limit

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RECEIPT_FILE_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!file) {
      throw new BadRequestException("a file field named 'file' is required");
    }

    return this.receiptsService.uploadReceipt(request.userId, file.originalname, file.buffer, idempotencyKey);
  }
}
