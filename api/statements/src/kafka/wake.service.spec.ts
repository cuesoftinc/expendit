import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Config } from '../config/config';
import { WakeService } from './wake.service';

describe('WakeService', () => {
  let server: Server;
  let status = 200;
  let delayMs = 0;
  const hits: { method?: string; url?: string; authorization?: string }[] = [];
  let base = '';

  const record = (req: IncomingMessage) =>
    hits.push({ method: req.method, url: req.url ?? '', authorization: req.headers.authorization });

  beforeAll(async () => {
    server = createServer((req, res) => {
      record(req);
      setTimeout(() => res.writeHead(status, { 'content-type': 'text/plain' }).end('tok\n'), delayMs);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => {
    hits.length = 0;
    status = 200;
    delayMs = 0;
  });

  const wake = (url: string) => {
    const service = new WakeService({ wakeCommonUrl: url } as Config);
    service.onCloudRun = false;
    return service;
  };

  it('settles common with a POST to /internal/settle', async () => {
    await wake(base).common('test');
    expect(hits).toEqual([{ method: 'POST', url: '/internal/settle', authorization: undefined }]);
  });

  it('settles every time and does not debounce', async () => {
    const service = wake(base);
    await service.common('test');
    await service.common('test');
    expect(hits.map((h) => h.url)).toEqual(['/internal/settle', '/internal/settle']);
  });

  it('does not return until common has answered', async () => {
    delayMs = 150;
    const started = Date.now();
    await wake(base).common('test');
    expect(Date.now() - started).toBeGreaterThanOrEqual(140);
  });

  it('does nothing without a URL', async () => {
    await wake('').common('test');
    expect(hits).toEqual([]);
  });

  it('signs the call with an ID token for common on Cloud Run', async () => {
    const service = wake(base);
    service.onCloudRun = true;
    service.metadataIdentity = `${base}identity`;
    await service.common('test');
    const [token, settle] = hits;
    expect(token.url).toBe(`/identity?audience=${encodeURIComponent(base.replace(/\/+$/, ''))}`);
    expect(settle).toEqual({ method: 'POST', url: '/internal/settle', authorization: 'Bearer tok' });
  });

  it('never throws when the settle fails', async () => {
    status = 503;
    await expect(wake(base).common('test')).resolves.toBeUndefined();
    expect(hits).toHaveLength(1);
  });
});
