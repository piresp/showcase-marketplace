/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A global NestJS module exposing a single Redis client, injectable
 *     anywhere as `@Inject(REDIS_CLIENT)`. `@Global()` avoids having to
 *     import `RedisModule` into every feature module — the cache, the
 *     JWT blocklist, and rate limiters all depend on the same connection.
 *   - `lazyConnect: true` — `ioredis` normally dials the server eagerly in
 *     the constructor. That's a problem during unit tests and CI, where
 *     importing the module shouldn't require Redis to be running.
 *     `lazyConnect` defers the handshake to the first command.
 *   - `OnModuleDestroy` for graceful shutdown. Without it, end-to-end
 *     tests (each spinning up a Nest `TestingModule`) leak connections.
 *     Eventually you hit the client's max socket count and every new test
 *     suite fails with an unhelpful timeout. The cleanup is three lines
 *     and it's saved me hours of flaky-test debugging.
 *
 * Usage:
 *   @Module({ imports: [RedisModule] })   // once, in the root module
 *   export class AppModule {}
 *
 *   @Injectable()
 *   class RateLimiter {
 *     constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
 *     async hit(key: string) { return this.redis.incr(key); }
 *   }
 */

import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          // Defer the connection until the first command. Keeps tests fast
          // and avoids noisy `ECONNREFUSED` on app startup when Redis is
          // still warming up in a sidecar.
          lazyConnect: true,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    // `quit()` sends QUIT and waits for the ack; `disconnect()` would hang
    // up without draining. For tests we want a clean close — leaking
    // sockets produces unhelpful timeouts later in the suite.
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}
