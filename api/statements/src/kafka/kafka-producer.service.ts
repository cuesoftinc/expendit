import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Kafka, Partitioners, type Producer } from 'kafkajs';
import { CONFIG, type Config } from '../config/config';
import { ContractService } from '../contract/contract.service';

/**
 * Publishes validated envelopes (api/common/contract/envelope.schema.json).
 * The gateway only ever sends upload.received, whose payload is a pointer,
 * so it never needs the 512 KB claim-check.
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private connected = false;

  constructor(
    @Inject(CONFIG) config: Config,
    private readonly contract: ContractService,
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

  async send(topic: string, key: string, data: object): Promise<void> {
    this.contract.validateData(topic, data);
    const envelope = {
      type: topic,
      version: 1,
      id: randomUUID(),
      produced_at: new Date().toISOString(),
      data,
    };
    this.contract.validateEnvelope(envelope);
    await this.connect();
    await this.producer.send({ topic, acks: -1, messages: [{ key, value: JSON.stringify(envelope) }] });
  }

  private async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }
}
