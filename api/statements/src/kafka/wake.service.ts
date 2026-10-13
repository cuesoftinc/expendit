import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type Config } from '../config/config';

/** An instance that answered moments ago is still up. */
const DEBOUNCE_MS = 10_000;

/**
 * Wakes api/common after upload.received is sent (scale to zero,
 * docs/system-design.md §16 I-16). Cloud Run starts an instance only for an
 * HTTP request, so a GET /health brings common up and its consumer reads the
 * message. Awaited inside the upload request, because this service's CPU is
 * only allocated while a request runs. Best-effort: a missed wake leaves the
 * message in Kafka, and the reaper job wakes common while work is pending.
 */
@Injectable()
export class WakeService {
  private readonly logger = new Logger(WakeService.name);
  private readonly base: string;
  private last = 0;

  constructor(@Inject(CONFIG) config: Config) {
    this.base = config.wakeCommonUrl.replace(/\/+$/, '');
  }

  async common(reason: string): Promise<void> {
    // No URL: compose and Helm run common all the time.
    if (!this.base || Date.now() - this.last < DEBOUNCE_MS) return;
    this.last = Date.now();
    const target = new URL(this.base).host;
    try {
      const res = await fetch(`${this.base}/health`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      this.logger.log({ message: 'woke service', step: 'wake', target, reason });
    } catch (error) {
      this.last = 0; // a failed wake must not hold back the next one
      this.logger.warn({ message: 'wake failed', step: 'wake', target, reason, error: (error as Error).message });
    }
  }
}
