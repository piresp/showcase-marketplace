/**
 * Extracted and simplified from a personal marketplace project (in development)
 * for portfolio purposes. Renamed to generic domain terms; integrations and
 * business rules removed. Technical approach preserved verbatim.
 *
 * What this demonstrates:
 *   - An Axios interceptor that treats an expired token like a recoverable
 *     condition: queue the in-flight request, refresh once, replay all queued
 *     requests with the fresh token.
 *   - Why the queue matters: on app launch, many components fetch in parallel.
 *     Without the queue, each 401 would kick off its own refresh, only the
 *     first one would succeed (rotation blacklists the rest), and the user
 *     would be bounced to login despite holding a valid refresh token.
 *   - A small GraphQL-over-HTTP nuance: a GraphQL auth failure arrives with
 *     HTTP 200 and an `UNAUTHENTICATED` code in `errors[*].extensions.code`.
 *     We rewrite it into a synthetic 401 so the rest of the pipeline stays
 *     single-path.
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// Replace with whatever you use for secure storage (SecureStore, Keychain,
// Zustand + AsyncStorage, etc). The interceptor shouldn't care.
type TokenStore = {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(access: string, refresh: string): void;
  clear(): void;
};

type Queued = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

export function createApi(baseURL: string, store: TokenStore) {
  const api = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // --- request: attach bearer token if we have one ---------------------------
  api.interceptors.request.use((config) => {
    const token = store.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // --- refresh state (module-scoped, shared across concurrent requests) ------
  let isRefreshing = false;
  let queue: Queued[] = [];

  function flushQueue(error: unknown, token: string | null) {
    queue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
    queue = [];
  }

  // --- response: transform GraphQL auth errors into HTTP 401 -----------------
  api.interceptors.response.use(
    (response: AxiosResponse) => {
      const errors = response.data?.errors as
        | Array<{ extensions?: { code?: string } }>
        | undefined;

      // Only rewrite if the user is supposed to be logged in. Without a token,
      // a credential error (e.g. wrong password on /login) should surface with
      // its original message, not be hijacked by the refresh flow.
      const hasToken = !!store.getAccessToken();
      const isAuthError = errors?.some(
        (e) => e.extensions?.code === 'UNAUTHENTICATED',
      );

      if (hasToken && isAuthError) {
        const synthetic = Object.assign(new Error('UNAUTHENTICATED'), {
          config: response.config,
          response: { ...response, status: 401 },
          isAxiosError: true,
        }) as AxiosError;
        return Promise.reject(synthetic);
      }

      return response;
    },

    // --- response error: run the refresh dance -------------------------------
    async (error: AxiosError) => {
      const original = error.config as
        | (AxiosRequestConfig & { _retry?: boolean })
        | undefined;

      // Not a 401, or we've already retried this exact request. Pass through.
      if (!original || error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }

      // Another request is already refreshing. Queue this one and wait.
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = store.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        store.clear();
        return Promise.reject(error);
      }

      try {
        // Raw axios (not `api`) to skip the interceptors for the refresh call
        // itself — otherwise a failing refresh would re-enter the interceptor
        // and loop.
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        if (!data?.accessToken || !data?.refreshToken) {
          throw new Error('refresh returned no tokens');
        }

        store.setTokens(data.accessToken, data.refreshToken);
        flushQueue(null, data.accessToken);

        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${data.accessToken}`,
        };
        return api(original);
      } catch (refreshError) {
        // Double-failure: reject every queued caller so they stop spinning,
        // then clear credentials so the app sends the user to login.
        flushQueue(refreshError, null);
        store.clear();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return api;
}
