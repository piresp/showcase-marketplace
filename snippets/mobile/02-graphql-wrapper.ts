/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - A ~15-line GraphQL-over-HTTP wrapper. No Apollo Client, no Relay, no
 *     codegen runtime. The thinking: React Query already gives us caching,
 *     deduping, and background refetching. Apollo's cache becomes redundant
 *     and its schema awareness is a nice-to-have we pay for in bundle size
 *     and mental overhead.
 *   - All GraphQL calls go through `api.post('/graphql', ...)` so they
 *     automatically inherit the auth interceptor and refresh-queue behaviour
 *     defined in `01-auth-interceptor-refresh-queue.ts`.
 *   - Only the first error in the `errors[]` array surfaces as a thrown
 *     message. React Query turns that into `query.error`; error boundaries
 *     or toast layers handle it from there.
 */

import type { AxiosInstance } from 'axios';

export function createGqlRequest(api: AxiosInstance) {
  return async function gqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const { data } = await api.post('/graphql', { query, variables });

    if (data.errors?.length) {
      // `UNAUTHENTICATED` is intercepted upstream and turned into a 401, so
      // if we see an error here it's a real business/validation failure.
      throw new Error(data.errors[0].message);
    }

    return data.data as T;
  };
}
