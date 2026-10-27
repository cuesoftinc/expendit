import type { LoggerService } from '@nestjs/common';

/**
 * JSON lines to stdout (Cloud Run). The never-log list applies: no file
 * names, file contents or tickets — ids and counts only (engineering.md §5).
 */
export class JsonLogger implements LoggerService {
  private write(severity: string, message: unknown, context: unknown[]): void {
    const entry: Record<string, unknown> = { time: new Date().toISOString(), severity };
    if (message instanceof Error) {
      entry.message = message.message;
      entry.stack = message.stack;
    } else if (typeof message === 'object' && message !== null) {
      Object.assign(entry, message);
    } else {
      entry.message = String(message);
    }
    const last = context[context.length - 1];
    if (typeof last === 'string') entry.logger = last;
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  log(message: unknown, ...context: unknown[]): void {
    this.write('INFO', message, context);
  }
  error(message: unknown, ...context: unknown[]): void {
    this.write('ERROR', message, context);
  }
  warn(message: unknown, ...context: unknown[]): void {
    this.write('WARNING', message, context);
  }
  debug(message: unknown, ...context: unknown[]): void {
    this.write('DEBUG', message, context);
  }
  verbose(message: unknown, ...context: unknown[]): void {
    this.write('DEBUG', message, context);
  }
}
