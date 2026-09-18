import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';

export const TOPIC_RECEIPT_UPLOADED = 'expendit.receipts.uploaded';

// snake_case on the wire: matches api/common's existing JSON conventions
// (see e.g. ImportJob's json tags) and api/process's pydantic schemas, so
// all three services agree on one casing for Kafka payloads.
export interface ReceiptUploadedMessage {
  job_id: string;
  user_id: string;
  file_name: string;
  file_data: string; // base64
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer | null = null;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS ?? '').split(',').filter(Boolean);
    if (brokers.length === 0) {
      this.logger.warn('KAFKA_BROKERS not set, Kafka producer disabled');
      return;
    }

    const kafka = new Kafka({
      clientId: 'expendit-api-intake',
      brokers,
      logLevel: logLevel.WARN,
      ssl: true,
      sasl: process.env.KAFKA_USERNAME
        ? {
            mechanism: 'scram-sha-256',
            username: process.env.KAFKA_USERNAME,
            password: process.env.KAFKA_PASSWORD ?? '',
          }
        : undefined,
    });

    this.producer = kafka.producer();
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async publishReceiptUploaded(message: ReceiptUploadedMessage): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka producer not connected (KAFKA_BROKERS not set)');
    }
    await this.producer.send({
      topic: TOPIC_RECEIPT_UPLOADED,
      messages: [{ key: message.job_id, value: JSON.stringify(message) }],
    });
  }
}
