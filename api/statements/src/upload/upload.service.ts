import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { detect, matches } from '../filetype/filetype';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { UPLOAD_RECEIVED } from '../kafka/topics';
import { StorageService } from '../storage/storage.service';
import type { TicketClaims } from '../ticket/ticket.service';
import { ApiError } from '../errors/api-error';

/** Receipts are client-compressed to 2048 px; the server re-checks (flows/import.md §2). */
export const MAX_IMAGE_EDGE = 2048;
const RESIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadAccepted {
  id: string;
  kind: TicketClaims['target']['kind'];
  status: 'processing';
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async accept(ticket: TicketClaims, file: Express.Multer.File | undefined): Promise<UploadAccepted> {
    if (!file || file.size === 0) {
      throw new ApiError(400, 'invalid_upload', 'Send one file in a multipart field named "file"');
    }
    const detected = detect(file.buffer);
    if (!detected || !matches(ticket.file_type, detected.type)) {
      throw new ApiError(415, 'unsupported_type', 'Upload a CSV, XLSX or PDF statement, or a receipt image');
    }

    const data = RESIZABLE.has(detected.contentType) ? await downscale(file.buffer) : file.buffer;
    const sha256 = createHash('sha256').update(data).digest('hex');

    let object;
    try {
      object = await this.storage.store(this.storage.tmpKey(ticket.target.id, ticket.jti), data, detected.contentType, sha256);
    } catch (error) {
      this.logger.error({ message: 'storage write failed', ticket: ticket.jti, error: (error as Error).message });
      throw new ApiError(503, 'storage_unavailable', 'Uploads are temporarily unavailable; try again shortly');
    }

    try {
      await this.kafka.send(UPLOAD_RECEIVED, ticket.jti, {
        ticket_id: ticket.jti,
        org_id: ticket.org_id,
        target: ticket.target,
        file_name: sanitizeName(file.originalname),
        file_type: detected.type,
        object,
      });
    } catch (error) {
      // The object stays in tmp/; common's 15-minute sweep removes it.
      this.logger.error({ message: 'kafka publish failed', ticket: ticket.jti, error: (error as Error).message });
      throw new ApiError(503, 'queue_unavailable', 'Uploads are temporarily unavailable; try again shortly');
    }

    this.logger.log({
      message: 'upload accepted; stored in tmp/ and handed to common',
      step: 'upload.received',
      ticket: ticket.jti,
      target: ticket.target.kind,
      target_id: ticket.target.id,
      file_type: detected.type,
      bytes: data.length,
    });
    return { id: ticket.target.id, kind: ticket.target.kind, status: 'processing' };
  }
}

/** Server-side downscale of oversized images, keeping the format. */
export const downscale = async (data: Buffer): Promise<Buffer> => {
  const image = sharp(data, { failOn: 'error' });
  const { width = 0, height = 0 } = await image.metadata();
  if (Math.max(width, height) <= MAX_IMAGE_EDGE) return data;
  return image.rotate().resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: 'inside' }).toBuffer();
};

/** Shown on the import review only; drop path parts and control characters. */
const sanitizeName = (name: string): string =>
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  (name.split(/[\\/]/).pop() ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'upload';
