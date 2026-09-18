import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

interface SignedDetails {
  Uid: string;
  Email?: string;
  exp: number;
}

// Verifies the same HS256 token api/common issues (JWT_SECRET, see
// api/common/internal/helper/token_helper.go). This checks signature and
// expiry only, NOT the DB-stored session token api/common's Authenticate()
// middleware also checks (see that middleware's comment on logout support),
// so a token revoked by logout is still accepted here until this guard
// either shares that session store or a proper session-check path exists.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No Authorization header provided');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('server misconfigured: JWT_SECRET not set');
    }

    try {
      const claims = jwt.verify(token, secret, { algorithms: ['HS256'] }) as SignedDetails;
      request.userId = claims.Uid;
      return true;
    } catch {
      throw new UnauthorizedException('invalid or expired token');
    }
  }
}
