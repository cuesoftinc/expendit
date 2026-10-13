import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Config } from '../config/config';
import { WakeService } from './wake.service';

describe('WakeService', () => {
  let server: Server;
  let status = 200;
  const hits: string[] = [];
  let base = '';

  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url ?? '');
      res.writeHead(status).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => {
    hits.length = 0;
    status = 200;
  });

  const wake = (url: string) => new WakeService({ wakeCommonUrl: url } as Config);

  it('calls /health once within the debounce window', async () => {
    const service = wake(base);
    await service.common('test');
    await service.common('test');
    expect(hits).toEqual(['/health']);
  });

  it('does nothing without a URL', async () => {
    await wake('').common('test');
    expect(hits).toEqual([]);
  });

  it('retries after a failed wake and never throws', async () => {
    const service = wake(base);
    status = 503;
    await expect(service.common('test')).resolves.toBeUndefined();
    status = 200;
    await service.common('test');
    expect(hits).toEqual(['/health', '/health']);
  });
});
