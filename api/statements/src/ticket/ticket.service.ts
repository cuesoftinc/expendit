import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG, type Config } from '../config/config';
import { ApiError } from '../errors/api-error';

export type FileType = 'csv' | 'xlsx' | 'pdf' | 'image';

export interface TicketClaims {
  kid: string;
  jti: string;
  org_id: string;
  target: { kind: 'import_job' | 'fin_statement'; id: string };
  file_type: FileType;
  max_bytes: number;
  iat: number;
  exp: number;
}

const SKEW_SECONDS = 30;
const FILE_TYPES: readonly string[] = ['csv', 'xlsx', 'pdf', 'image'];

/**
 * Verifies upload tickets signed by api/common (format:
 * api/common/contract/upload-ticket.md). Stateless: single use is enforced
 * by common when it consumes upload.received.
 */
@Injectable()
export class TicketService {
  private readonly keys = new Map<string, KeyObject>();

  constructor(@Inject(CONFIG) config: Pick<Config, 'ticketPublicKeys'>) {
    for (const [kid, raw] of config.ticketPublicKeys) {
      this.keys.set(kid, createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: raw.toString('base64url') }, format: 'jwk' }));
    }
  }

  verify(ticket: string | undefined, now: number = Date.now() / 1000): TicketClaims {
    const invalid = () => new ApiError(401, 'invalid_ticket', 'The upload ticket is missing or invalid');
    const parts = ticket?.split('.') ?? [];
    if (parts.length !== 3 || parts[0] !== 'v1') throw invalid();
    const [version, payload, signature] = parts;

    let claims: TicketClaims;
    try {
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TicketClaims;
    } catch {
      throw invalid();
    }
    const key = this.keys.get(claims.kid);
    if (!key || !verify(null, Buffer.from(`${version}.${payload}`, 'ascii'), key, Buffer.from(signature, 'base64url'))) {
      throw invalid();
    }
    if (
      typeof claims.jti !== 'string' ||
      typeof claims.org_id !== 'string' ||
      !claims.target?.id ||
      !['import_job', 'fin_statement'].includes(claims.target.kind) ||
      !FILE_TYPES.includes(claims.file_type) ||
      !(claims.max_bytes > 0) ||
      typeof claims.exp !== 'number'
    ) {
      throw invalid();
    }
    if (claims.exp + SKEW_SECONDS < now) {
      throw new ApiError(401, 'ticket_expired', 'The upload ticket has expired; start the upload again');
    }
    return claims;
  }
}
