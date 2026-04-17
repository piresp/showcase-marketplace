/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - Role-based authorization that *also* enforces the token's origin
 *     context. A valid `staff`-context token carrying `role: STAFF` is not
 *     the same as an end-user token with a spoofed role claim — this guard
 *     rejects mismatches.
 *   - Kept separate from `JwtAuthGuard` deliberately. `JwtAuthGuard`
 *     answers "is this request authenticated?"; `RolesGuard` answers
 *     "is this authenticated request allowed to do THIS?". Split
 *     responsibilities survive refactors.
 *   - Works for both HTTP and GraphQL requests — `GqlExecutionContext`
 *     normalizes the request shape, and the upstream auth guard attaches
 *     `req.user` the same way in both transports.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
 *   async confidentialMutation() { ... }
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

// Keep the role set small and opinionated. Adding more is cheap; subtracting
// is a nightmare once call sites reference them.
export enum UserRole {
  USER = 'USER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  STAFF = 'STAFF',
}

type TokenContext = 'contextA' | 'contextB' | 'contextC';

// Map roles to the token contexts they're allowed to come from. If STAFF
// appears on a contextA token, that's a bug or an attack — reject it.
const STAFF_ROLES: UserRole[] = [UserRole.STAFF];
const TENANT_ROLES: UserRole[] = [UserRole.TENANT_ADMIN];

// `@Roles(...roles)` — attaches required roles to a handler or class.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No `@Roles(...)` on this handler → nothing to enforce. `JwtAuthGuard`
    // upstream already answered "is this authenticated".
    if (!requiredRoles) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { user } = ctx.getContext().req as {
      user?: { role: UserRole; context: TokenContext };
    };

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Context enforcement — a STAFF-only endpoint requires a STAFF-context
    // token. Role claim alone is not enough.
    if (requiredRoles.every((r) => STAFF_ROLES.includes(r)) && user.context !== 'contextC') {
      throw new ForbiddenException('This endpoint requires a staff-context token');
    }

    if (
      requiredRoles.every((r) => TENANT_ROLES.includes(r)) &&
      !(['contextB', 'contextC'] as TokenContext[]).includes(user.context)
    ) {
      throw new ForbiddenException('This endpoint requires a tenant-admin or staff-context token');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role '${user.role}' is not in [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
