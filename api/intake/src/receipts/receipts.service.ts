import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

interface IdempotencyEntry {
  jobId: string;
  expiresAt: number;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24h, matches the Idempotency-Key convention's intent

// api/common looks up jobs by Mongo ObjectID hex (see its handlers'
// primitive.ObjectIDFromHex calls), so the ID minted here has to be a valid
// 24-char hex string, not a UUID, or the client's later poll/confirm calls
// against api/common would 404 on an ID that never made it into Mongo.
function newJobId(): string {
  return randomBytes(12).toString('hex');
}

@Injectable()
export class ReceiptsService {
  // In-memory only: fine for a single instance. A multi-replica deployment
  // needs a shared store (e.g. Redis) for this to actually dedupe retries
  // across instances, noted here rather than silently pretending it works.
  private readonly idempotencyCache = new Map<string, IdempotencyEntry>();

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async uploadReceipt(
    userId: string,
    fileName: string,
    fileBuffer: Buffer,
    idempotencyKey?: string,
  ): Promise<{ jobId: string }> {
    if (idempotencyKey) {
      const existing = this.idempotencyCache.get(idempotencyKey);
      if (existing && existing.expiresAt > Date.now()) {
        return { jobId: existing.jobId };
      }
    }

    const jobId = newJobId();
    await this.kafkaProducer.publishReceiptUploaded({
      job_id: jobId,
      user_id: userId,
      file_name: fileName,
      file_data: fileBuffer.toString('base64'),
    });

    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, { jobId, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
    }

    return { jobId };
  }
}
