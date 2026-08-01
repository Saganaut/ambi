// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { authPromptRequested } from "../../features/auth/store/authPromptSlice.ts";
import {
  refreshSession,
  readXsrfToken,
} from "../../features/auth/store/authRefresh.ts";
import { logger } from "@utils/logger";

export const apiBaseUrl: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:8080";

// Frontend half of the request-correlation thread: each call carries a unique
// X-Request-Id, which the backend adopts as its MDC `traceId` (and echoes back).
// One id ties a user action to its server log lines. See MdcLoggingFilter and
// z-docs/decisions/001-observability-stack.md.
const REQUEST_ID_HEADER = "X-Request-Id";

// The backend enforces CSRF via the double-submit-cookie pattern: it writes a
// readable XSRF-TOKEN cookie and requires the same value echoed in this header
// on every mutation (POST/PUT/PATCH/DELETE — including /api/auth/refresh).
// Setting it on safe methods too is harmless (Spring's CsrfFilter ignores it
// there) and keeps this branch-free.
const XSRF_HEADER = "X-XSRF-TOKEN";

// Spring binds a `Pageable` from flat `page` / `size` / `sort` query params, but
// OpenAPI models it as one nested object, so the generated clients pass it as
// `params: { pageable }`. The default `new URLSearchParams(params)` would render
// that as `pageable=[object Object]` and every request would silently fall back
// to the server's default page. Flatten one level of nested objects onto their
// own keys and repeat array values (`sort=name,asc&sort=…`), which is exactly
// how Spring reads them.
const serializeParams = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) append(key, item);
      return;
    }
    if (typeof value === "object") {
      for (const [nested, nestedValue] of Object.entries(value)) {
        append(nested, nestedValue);
      }
      return;
    }
    search.append(key, String(value));
  };
  for (const [key, value] of Object.entries(params)) append(key, value);
  return search.toString();
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  paramsSerializer: serializeParams,
  prepareHeaders: (headers) => {
    if (!headers.has(REQUEST_ID_HEADER)) {
      headers.set(REQUEST_ID_HEADER, crypto.randomUUID());
    }
    const xsrf = readXsrfToken();
    if (xsrf && !headers.has(XSRF_HEADER)) {
      headers.set(XSRF_HEADER, xsrf);
    }
    return headers;
  },
  // The backend's error contract serves RFC 9457 bodies as
  // `application/problem+json` (see z-docs/features/exceptions.md). RTK Query's
  // default content-type test misses the `+json` suffix and would parse those
  // bodies as text, blanking out `error.data.detail`. Broaden it to any `*/*+json`.
  isJsonContentType: (headers) =>
    /\bjson\b/.test(headers.get("content-type") ?? ""),
});

// Generated multipart endpoints (e.g. gallery `uploadImage`) describe their body
// as a plain object of fields — `{ file: Blob }` — because that's all OpenAPI can
// express. `fetchBaseQuery` would JSON-stringify such an object and lose the
// bytes, so we lift any body that carries a `File`/`Blob` value into `FormData`
// here. That lets the generated client be used verbatim (no hand-edits, no casts
// at the call site) and keeps the multipart contract a base-query concern. We
// leave the boundary unset so fetch derives it; setting Content-Type by hand
// would drop it.
const hasBinaryField = (body: unknown): body is Record<string, unknown> => {
  if (typeof body !== "object" || body === null) return false;
  if (body instanceof FormData || body instanceof Blob) return false;
  return Object.values(body).some((v) => v instanceof Blob);
};

const toFormData = (body: Record<string, unknown>): FormData => {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    form.append(key, value as string | Blob);
  }
  return form;
};

// `/api/auth/me` is the optional-auth probe — a 401 there just means "visitor",
// not "the user tried to do something they aren't allowed to do", so we don't
// surface the login modal for it.
const isAuthProbe = (args: string | FetchArgs): boolean => {
  const url = typeof args === "string" ? args : args.url;
  return url.endsWith("/api/auth/me");
};

const logFailure = (
  args: string | FetchArgs,
  result: Awaited<ReturnType<typeof rawBaseQuery>>,
): void => {
  // Log every genuine failure with the server's traceId so a frontend error
  // and its backend log line carry the same id. 401s are an expected, handled
  // control-flow signal (refresh / auth prompt), so we don't log them as errors.
  // User-facing copy stays a per-call concern via extractErrorMessage + toast.
  if (!result.error || result.error.status === 401) return;
  const url = typeof args === "string" ? args : args.url;
  const traceId =
    result.meta?.response?.headers.get(REQUEST_ID_HEADER) ?? undefined;
  logger.error("API request failed", {
    url,
    status: result.error.status,
    traceId,
    data: result.error.data,
  });
};

// Reactive re-auth + auth-prompt funnel. A 401 from a protected call means the
// short-lived access token lapsed: we slide the session once via the shared
// single-flight `refreshSession()` (see authRefresh.ts) and replay the original
// request. If refresh fails, or the replay still 401s, we fall through to the
// `authPrompt` slice — `AuthPromptBridge` subscribes and opens the LoginModal.
// `/api/auth/refresh` is issued by `refreshSession` via a raw fetch, so it never
// re-enters this wrapper; and `/api/auth/me` never 401s, so it's excluded too.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  if (typeof args !== "string" && hasBinaryField(args.body)) {
    args = { ...args, body: toFormData(args.body) };
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isAuthProbe(args)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
    if (!refreshed || result.error?.status === 401) {
      api.dispatch(
        authPromptRequested({ message: "Please sign in to continue." }),
      );
    }
  }

  logFailure(args, result);
  return result;
};

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
