import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import type { TicketClaims } from '../ticket/ticket.service';

/** Test-only signer mirroring api/common's ticket issuer. */
export const makeSigner = (kid = 'test') => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url');

  const issue = (overrides: Partial<TicketClaims> = {}): string => {
    const now = Math.floor(Date.now() / 1000);
    const claims: TicketClaims = {
      kid,
      jti: randomUUID(),
      org_id: '3f6e2b1a-9c8d-4e7f-a6b5-c4d3e2f1a0b9',
      target: { kind: 'import_job', id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f' },
      file_type: 'csv',
      max_bytes: 15 * 1024 * 1024,
      iat: now,
      exp: now + 300,
      ...overrides,
    };
    const head = `v1.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
    return `${head}.${sign(null, Buffer.from(head, 'ascii'), privateKey).toString('base64url')}`;
  };

  return { kid, publicKey: raw, issue };
};
