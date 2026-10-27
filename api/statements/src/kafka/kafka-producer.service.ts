import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Kafka, Partitioners, type Producer } from 'kafkajs';
import { CONFIG, type Config } from '../config/config';
import { ContractService } from '../contract/contract.service';
import { StorageService } from '../storage/storage.service';
import { ENVELOPE_VERSION, UPLOADS_TOPIC } from './topics';

/**
 * Publishes validated envelopes (api/common/contract/envelope.schema.json) on
 * the CueLABS shared bus. Every product can read its lanes, so the payload
 * (it holds the file name) is written to tmp/ and the message carries only
 * the pointer (S-3 claim-check, docs/system-design.md §16 I-18).
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private connected = false;

  constructor(
    @Inject(CONFIG) config: Config,
    private readonly contract: ContractService,
    private readonly storage: StorageService,
  ) {
    const { kafka } = config;
    const kafkaClient = new Kafka({
      clientId: 'expendit-api-statements',
      brokers: kafka.brokers,
      ...(kafka.username
        ? {
            // Aiven: SASL/SCRAM over TLS, one user per service (S-11).
            ssl: kafka.sslCa ? { ca: [kafka.sslCa] } : true,
            sasl: { mechanism: 'scram-sha-256' as const, username: kafka.username, password: kafka.password },
          }
        : {}),
    });
    this.producer = kafkaClient.producer({
      idempotent: true,
      maxInFlightRequests: 1,
      allowAutoTopicCreation: false,
      // Keyed partitioning (murmur2). Each topic has one producing service,
      // so the clients' differing hash functions never split a key.
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    this.producer.on('producer.disconnect', () => (this.connected = false));
  }

  async onModuleInit(): Promise<void> {
    // Don't block startup on Kafka: /ready reports it, and send() connects.
    this.connect().catch((error: Error) => this.logger.warn({ message: 'kafka not reachable yet', error: error.message }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async send(event: string, key: string, data: object): Promise<void> {
    this.contract.validateData(event, data);
    const id = randomUUID();
    const body = Buffer.from(JSON.stringify(data));
    const dataRef = await this.storage.store(
      `${this.storage.prefix}/tmp/claims/${id}.json`,
      body,
      'application/json',
      createHash('sha256').update(body).digest('hex'),
    );
    const envelope = {
      type: event,
      version: ENVELOPE_VERSION,
      id,
      request_id: randomUUID(),
      produced_at: new Date().toISOString(),
      data_ref: dataRef,
    };
    this.contract.validateEnvelope(envelope);
    await this.connect();
    await this.producer.send({ topic: UPLOADS_TOPIC, acks: -1, messages: [{ key, value: JSON.stringify(envelope) }] });
  }

  private async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }
}
