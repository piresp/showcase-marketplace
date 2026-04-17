/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A single error shape for GraphQL clients regardless of where the
 *     failure originated: validation pipe, authorization guard, resolver
 *     business rule, or unhandled exception.
 *   - GraphQL doesn't use HTTP status codes for business failures — it
 *     returns HTTP 200 with an `errors[]` array on the payload. What
 *     clients look at is `error.extensions.code`. This filter maps the
 *     familiar HTTP status of a `NestJS` `HttpException` onto a canonical
 *     code (`BAD_REQUEST`, `UNAUTHENTICATED`, `FORBIDDEN`, …) so mobile
 *     clients have one decision tree: read `extensions.code`, branch.
 *   - Validation errors from `class-validator` arrive as an array of
 *     strings inside `response.message`. We join them with a comma so the
 *     first-line message is human-readable; the full list still ships
 *     under `extensions.status` if a client needs structured access.
 *   - Raw `GraphQLError` passes through unchanged — it already has the
 *     shape we want.
 */

import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    GqlArgumentsHost.create(host); // normalize the host type for consistency

    // NestJS `HttpException` family (BadRequest, Unauthorized, Forbidden, …).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      let message: string;
      if (typeof response === 'string') {
        message = response;
      } else if (response && typeof response === 'object' && 'message' in response) {
        const raw = (response as { message: unknown }).message;
        message = Array.isArray(raw) ? raw.join(', ') : String(raw);
      } else {
        message = exception.message;
      }

      return new GraphQLError(message, {
        extensions: {
          code: mapStatusToCode(status),
          status,
        },
      });
    }

    // Already a GraphQL-native error — pass through untouched.
    if (exception instanceof GraphQLError) {
      return exception;
    }

    // Unknown error type — wrap generically and never leak a stack trace.
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    return new GraphQLError(message, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_ENTITY';
    case 429: return 'TOO_MANY_REQUESTS';
    default:  return 'INTERNAL_SERVER_ERROR';
  }
}
