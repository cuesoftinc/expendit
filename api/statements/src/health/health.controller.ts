import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { StorageService } from '../storage/storage.service';

@Controller()
export class HealthController {
  constructor(
    private readonly kafka: KafkaProducerService,
    private readonly storage: StorageService,
  ) {}

  /** Liveness: the process is up. */
  @Get('health')
  health() {
    return { status: 'healthy' };
  }

  /** Readiness: can hand off an upload (Kafka connected, bucket reachable). */
  @Get('ready')
  async ready(@Res() response: Response) {
    try {
      await this.storage.ready();
      if (!this.kafka.isConnected) throw new Error('kafka');
      response.status(HttpStatus.OK).json({ status: 'ready' });
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'not_ready' });
    }
  }
}
