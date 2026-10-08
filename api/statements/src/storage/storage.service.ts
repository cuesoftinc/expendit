import { Inject, Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { Client as MinioClient } from 'minio';
import { CONFIG, type Config } from '../config/config';

export interface StoredObject {
  bucket: string;
  key: string;
  size: number;
  content_type: string;
  sha256: string;
}

/**
 * Writes uploads to the temporary prefix (S-3). Cloud Storage via ADC in
 * cloud, where IAM lets this service write tmp/ only; MinIO in compose.
 */
@Injectable()
export class StorageService {
  private readonly put: (key: string, data: Buffer, contentType: string) => Promise<void>;
  private readonly ping: () => Promise<void>;
  readonly bucket: string;
  readonly prefix: string;

  constructor(@Inject(CONFIG) config: Config) {
    const { storage } = config;
    this.bucket = storage.bucket;
    this.prefix = storage.prefix;
    if (storage.driver === 's3') {
      const [host, port] = storage.endpoint.split(':');
      const client = new MinioClient({
        endPoint: host,
        port: port ? Number(port) : undefined,
        useSSL: storage.useSsl,
        accessKey: storage.accessKey,
        secretKey: storage.secretKey,
      });
      this.put = async (key, data, contentType) => {
        await client.putObject(storage.bucket, key, data, data.length, { 'Content-Type': contentType });
      };
      this.ping = async () => {
        if (!(await client.bucketExists(storage.bucket))) throw new Error('bucket missing');
      };
    } else {
      const bucket = new Storage().bucket(storage.bucket);
      this.put = (key, data, contentType) => bucket.file(key).save(data, { contentType, resumable: false });
      // Write-only IAM can't read bucket metadata; readiness doesn't probe GCS.
      this.ping = async () => undefined;
    }
  }

  tmpKey(targetId: string, ticketId: string): string {
    // No file name in the key: names can carry personal data.
    return `${this.prefix}/tmp/${targetId}/${ticketId}`;
  }

  async store(key: string, data: Buffer, contentType: string, sha256: string): Promise<StoredObject> {
    await this.put(key, data, contentType);
    return { bucket: this.bucket, key, size: data.length, content_type: contentType, sha256 };
  }

  async ready(): Promise<void> {
    await this.ping();
  }
}
