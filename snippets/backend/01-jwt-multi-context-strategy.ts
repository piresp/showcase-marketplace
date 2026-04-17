/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - One Passport JWT strategy serving three account contexts
 *     (`contextA`, `contextB`, `contextC`). Each context uses its own
 *     signing secret. A leak of one secret only compromises that slice —
 *     blast radius stays small.
 *   - `secretOrKeyProvider` is the key mechanism: passport-jwt calls it
 *     with the raw token *before* signature verification. We decode
 *     (without verifying) to read the `context` claim, then return the
 *     matching secret. passport-jwt then verifies against it.
 *   - JTI-based revocation via a Redis blocklist. Every token carries a
 *     unique `jti`; on logout or refresh rotation we write
 *     `jti:<id>` with a TTL matching the token's remaining lifetime.
 *     The strategy checks the blocklist on every request — O(1), and
 *     scales with blocklisted tokens, not active users.
 *   - Three separate secrets are held in env vars. Each context has its
 *     own rotation schedule in production; they never share.
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import type Redis from 'ioredis';
import { ExtractJwt, Strategy } from 'passport-jwt';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

type TokenContext = 'contextA' | 'contextB' | 'contextC';

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  context: TokenContext;
  jti?: string;
  exp?: number;
};

const SECRET_MAP: Record<TokenContext, string> = {
  contextA: process.env.JWT_CONTEXT_A_SECRET || 'dev-secret-a-change-me',
  contextB: process.env.JWT_CONTEXT_B_SECRET || 'dev-secret-b-change-me',
  contextC: process.env.JWT_CONTEXT_C_SECRET || 'dev-secret-c-change-me',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // Per-request secret lookup. `jwt.decode` does NOT verify the signature
      // — that's Passport's next step — so treating the `context` claim as
      // untrusted input is fine: a bad value just yields a bad secret, and
      // the signature check that follows will fail cleanly with 401.
      secretOrKeyProvider: (
        _req: unknown,
        rawToken: string,
        done: (err: Error | null, secret?: string) => void,
      ) => {
        try {
          const decoded = jwt.decode(rawToken) as { context?: string } | null;
          const context = decoded?.context as TokenContext | undefined;
          const secret = context ? SECRET_MAP[context] : undefined;

          if (!secret) {
            return done(new Error('Unknown token context'));
          }
          done(null, secret);
        } catch {
          done(new Error('Invalid token'));
        }
      },
    });
  }

  /**
   * Called after signature verification succeeds. Whatever we return here is
   * attached to `request.user` — so keep it narrow.
   */
  async validate(payload: JwtPayload) {
    // Revocation check: token may still be cryptographically valid but the
    // user has logged out, rotated their refresh token, or been force-logged
    // off. A single Redis `GET` is cheap enough to run on every request.
    if (payload.jti) {
      const revoked = await this.redis.get(`jti:${payload.jti}`);
      if (revoked) {
        throw new UnauthorizedException('Token revoked');
      }
    }

    // Return only what the rest of the app needs. In production you can
    // hydrate from the DB here, but keep it minimal — this runs on every
    // authenticated request.
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      context: payload.context,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
