import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import { AppModule } from '../app.module';
import { CONFIG, type Config } from '../config/config';
import { ContractService } from '../contract/contract.service';
import { ErrorFilter } from '../errors/error.filter';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { StorageService, type StoredObject } from '../storage/storage.service';
import { makeSigner } from '../testing/tickets';

const signer = makeSigner('k1');
const CONTRACT_DIR = process.env.CONTRACT_DIR ?? join(__dirname, '..', '..', '..', 'common', 'contract');

const config: Config = {
  port: 0,
  corsOrigins: ['http://localhost:3000'],
  kafka: { brokers: ['unused:9092'], username: '', password: '', sslCa: '' },
  storage: { driver: 's3', bucket: 'b', prefix: 'expendit/test', endpoint: 'unused', accessKey: '', secretKey: '', useSsl: false },
  ticketPublicKeys: new Map([['k1', signer.publicKey]]),
  contractDir: CONTRACT_DIR,
};

describe('POST /api/v1/uploads', () => {
  let app: INestApplication;
  const stored: Array<{ key: string; data: Buffer; contentType: string }> = [];
  const sent: Array<{ topic: string; key: string; data: Record<string, unknown> }> = [];

  beforeAll(async () => {
    const contract = new ContractService(config);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CONFIG)
      .useValue(config)
      .overrideProvider(StorageService)
      .useValue({
        tmpKey: (target: string, ticket: string) => `expendit/test/tmp/${target}/${ticket}`,
        store: async (key: string, data: Buffer, contentType: string, sha256: string): Promise<StoredObject> => {
          stored.push({ key, data, contentType });
          return { bucket: 'b', key, size: data.length, content_type: contentType, sha256 };
        },
        ready: async () => undefined,
      })
      .overrideProvider(KafkaProducerService)
      .useValue({
        isConnected: true,
        // Validate exactly as the real producer does.
        send: async (topic: string, key: string, data: Record<string, unknown>) => {
          contract.validateData(topic, data);
          sent.push({ topic, key, data });
        },
      })
      .compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    app.useGlobalFilters(new ErrorFilter());
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => {
    stored.length = 0;
    sent.length = 0;
  });

  const csv = Buffer.from('Date,Description,Amount\n2026-09-01,BOLT RIDE,1200\n');

  it('stores the file in tmp/ and publishes a valid upload.received', async () => {
    const ticket = signer.issue();
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Upload-Ticket', ticket)
      .attach('file', csv, 'C:\\Users\\me\\gtbank sept.csv')
      .expect(202);

    expect(res.body).toEqual({ id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f', kind: 'import_job', status: 'processing' });
    expect(stored).toHaveLength(1);
    expect(stored[0].key).toMatch(/^expendit\/test\/tmp\/7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f\/[0-9a-f-]{36}$/);
    expect(sent[0].topic).toBe('expendit.upload.received');
    expect(sent[0].data).toMatchObject({ file_name: 'gtbank sept.csv', file_type: 'csv' });
  });

  it('401s without a ticket, before touching storage', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/uploads').attach('file', csv, 'a.csv').expect(401);
    expect(res.body.error.code).toBe('invalid_ticket');
    expect(stored).toHaveLength(0);
  });

  it('413s a file over the ticket limit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Upload-Ticket', signer.issue({ max_bytes: 10 }))
      .attach('file', csv, 'a.csv')
      .expect(413);
    expect(res.body.error.code).toBe('file_too_large');
  });

  it('415s a file whose bytes do not match the declared type', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Upload-Ticket', signer.issue({ file_type: 'pdf' }))
      .attach('file', csv, 'statement.pdf')
      .expect(415);
    expect(res.body.error.code).toBe('unsupported_type');
  });

  it('downscales an oversized receipt image', async () => {
    const big = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: '#fff' } }).jpeg().toBuffer();
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Upload-Ticket', signer.issue({ file_type: 'image' }))
      .attach('file', big, 'receipt.jpg')
      .expect(202);
    const meta = await sharp(stored[0].data).metadata();
    expect([meta.width, meta.height]).toEqual([2048, 683]);
  });

  it('answers health and readiness', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'healthy' });
    await request(app.getHttpServer()).get('/ready').expect(200, { status: 'ready' });
  });
});
