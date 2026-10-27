import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { CONFIG, type Config } from '../config/config';

const BASE = 'https://expendit.cuesoft.io/contract/';

export class ContractError extends Error {}

/** Validates messages against the JSON Schemas in api/common/contract. */
@Injectable()
export class ContractService {
  private readonly ajv = new Ajv2020({ allErrors: false, strict: false });
  private readonly cache = new Map<string, ValidateFunction>();

  constructor(@Inject(CONFIG) config: Pick<Config, 'contractDir'>) {
    addFormats(this.ajv);
    for (const file of readdirSync(config.contractDir).filter((f) => f.endsWith('.schema.json'))) {
      this.ajv.addSchema(JSON.parse(readFileSync(join(config.contractDir, file), 'utf8')));
    }
  }

  validateEnvelope(message: unknown): void {
    this.check('envelope', message);
  }

  /** `topic` is the full topic name, e.g. expendit.upload.received. */
  validateData(topic: string, data: unknown): void {
    this.check(topic.replace(/^expendit\./, ''), data);
  }

  private check(name: string, value: unknown): void {
    let validate = this.cache.get(name);
    if (!validate) {
      validate = this.ajv.getSchema(`${BASE}${name}.schema.json`);
      if (!validate) throw new ContractError(`no schema named ${name}`);
      this.cache.set(name, validate);
    }
    if (!validate(value)) {
      const [error] = validate.errors ?? [];
      throw new ContractError(`${name}: ${error?.instancePath || '(root)'} ${error?.message ?? 'invalid'}`);
    }
  }
}
