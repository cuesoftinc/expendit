import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONFIG, type Config } from '../config/config';

/** Covers a cold start, a consumer-group join and common's own settle budget; stays inside the 60 s request timeout. */
const SETTLE_TIMEOUT_MS = 45_000;

const METADATA_IDENTITY = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';

/**
 * Settles api/common after upload.received is sent (scale to zero,
 * docs/system-design.md §16 I-16). Cloud Run allocates CPU only while a
 * request is open, so a GET /health would start common but its consumer would
 * stall once the answer is sent. POST /internal/settle is answered only after
 * common has handled what is waiting, and it is awaited inside the upload
 * request, because this service's CPU is also allocated only while a request
 * runs. Best-effort: a missed settle leaves the message in Kafka, and the
 * reaper job settles common while work is pending.
 */
@Injectable()
export class WakeService {
  private readonly logger = new Logger(WakeService.name);
  private readonly base: string;
  /** On Cloud Run the call carries this service account's ID token for common. */
  onCloudRun = Boolean(process.env.K_SERVICE);
  metadataIdentity = METADATA_IDENTITY;

  constructor(@Inject(CONFIG) config: Config) {
    this.base = config.wakeCommonUrl.replace(/\/+$/, '');
  }

  async common(reason: string): Promise<void> {
    // No URL: compose and Helm run common all the time.
    if (!this.base) return;
    const target = new URL(this.base).host;
    try {
      const headers: Record<string, string> = {};
      if (this.onCloudRun) headers.Authorization = `Bearer ${await this.idToken(this.base)}`;
      const res = await fetch(`${this.base}/internal/settle`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(SETTLE_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      this.logger.log({ message: 'settled service', step: 'settle', target, reason });
    } catch (error) {
      this.logger.warn({ message: 'settle failed', step: 'settle', target, reason, error: (error as Error).message });
    }
  }

  /** An ID token whose audience is common's URL, which is what its settle route checks. */
  private async idToken(audience: string): Promise<string> {
    const res = await fetch(`${this.metadataIdentity}?audience=${encodeURIComponent(audience)}`, {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`id token: metadata status ${res.status}`);
    return (await res.text()).trim();
  }
}
