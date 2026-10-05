/**
 * Typed environment config (CueLABS standard: fail fast). Names follow
 * docs/system-design.md §10.3. Nothing else in the service reads
 * process.env.
 */

export interface Config {
  port: number;
  corsOrigins: string[];
  kafka: {
    brokers: string[];
    username: string;
    password: string;
    sslCa: string;
  };
  storage: {
    driver: 'gcs' | 's3';
    bucket: string;
    /** e.g. expendit/stg — every key starts with it. */
    prefix: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    useSsl: boolean;
  };
  /** kid -> raw 32-byte Ed25519 public key (S-5; rotation keeps several). */
  ticketPublicKeys: Map<string, Buffer>;
  /** JSON Schemas copied from api/common/contract. */
  contractDir: string;
}

export const CONFIG = Symbol('CONFIG');

const required = (env: NodeJS.ProcessEnv, name: string, missing: string[]): string => {
  const value = env[name]?.trim() ?? '';
  if (!value) missing.push(name);
  return value;
};

/** UPLOAD_TICKET_PUBLIC_KEYS="kid1:<base64url raw key>,kid2:<…>". */
export const parsePublicKeys = (raw: string): Map<string, Buffer> => {
  const keys = new Map<string, Buffer>();
  for (const entry of raw.split(',').map((e) => e.trim()).filter(Boolean)) {
    const [kid, encoded] = entry.split(':');
    const key = Buffer.from(encoded ?? '', 'base64url');
    if (!kid || key.length !== 32) {
      throw new Error(`UPLOAD_TICKET_PUBLIC_KEYS: entry "${kid ?? ''}" must be kid:<32-byte base64url Ed25519 key>`);
    }
    keys.set(kid, key);
  }
  return keys;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const missing: string[] = [];
  const brokers = required(env, 'KAFKA_BROKERS', missing);
  const bucket = required(env, 'STORAGE_BUCKET', missing);
  const prefix = required(env, 'STORAGE_PREFIX', missing);
  const keys = required(env, 'UPLOAD_TICKET_PUBLIC_KEYS', missing);
  const driver = (env.STORAGE_DRIVER ?? 'gcs').trim() as Config['storage']['driver'];
  if (driver !== 'gcs' && driver !== 's3') missing.push('STORAGE_DRIVER (gcs|s3)');
  if (driver === 's3') required(env, 'STORAGE_ENDPOINT', missing);
  if (missing.length) {
    throw new Error(`missing or invalid configuration: ${missing.join(', ')}`);
  }

  return {
    port: Number(env.PORT ?? 8081),
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    kafka: {
      brokers: brokers.split(',').map((b) => b.trim()).filter(Boolean),
      username: env.KAFKA_USERNAME ?? '',
      password: env.KAFKA_PASSWORD ?? '',
      sslCa: env.KAFKA_SSL_CA ?? '',
    },
    storage: {
      driver,
      bucket,
      prefix: prefix.replace(/\/+$/, ''),
      endpoint: env.STORAGE_ENDPOINT ?? '',
      accessKey: env.STORAGE_ACCESS_KEY ?? '',
      secretKey: env.STORAGE_SECRET_KEY ?? '',
      useSsl: (env.STORAGE_USE_SSL ?? 'true') !== 'false',
    },
    ticketPublicKeys: parsePublicKeys(keys),
    contractDir: env.CONTRACT_DIR ?? 'contract',
  };
};
