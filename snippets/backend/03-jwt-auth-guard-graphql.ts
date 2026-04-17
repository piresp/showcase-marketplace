/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - Adapting Passport's HTTP-oriented `AuthGuard('jwt')` to NestJS's
 *     GraphQL resolver execution model. Passport expects a plain Express
 *     request in `context.switchToHttp().getRequest()`; GraphQL resolvers
 *     route through `GqlExecutionContext` instead. Overriding `getRequest`
 *     bridges the two — now the *same* JWT strategy serves both HTTP
 *     controllers and GraphQL resolvers with zero duplicated code.
 *   - `@Public()` as an explicit opt-out. By default we register this guard
 *     globally (every endpoint is authenticated); public routes must
 *     declare themselves. It's easier to audit "who opted out" than "who
 *     forgot to opt in".
 *   - `getAllAndOverride` (not `get`) so a class-level `@Public()` is
 *     respected while a method inside the class can still override it.
 */

import { ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // Override how the underlying Passport strategy finds the request.
  // For REST, `context.switchToHttp().getRequest()` would work;
  // for GraphQL, the request lives on `ctx.getContext().req`.
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}

// Usage:
//   @Resolver()
//   export class AuthResolver {
//     @Public()
//     @Mutation(() => AuthPayload)
//     login(...) { ... }
//
//     @Mutation(() => User)
//     updateProfile(...) { ... } // requires a valid JWT
//   }
