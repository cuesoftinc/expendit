import { HttpException } from '@nestjs/common';

/** The ecosystem error envelope: {"error": {code, message, details}}. */
export class ApiError extends HttpException {
  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super({ error: { code, message, details } }, status);
  }
}
