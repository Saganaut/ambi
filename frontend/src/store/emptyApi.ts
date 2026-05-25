// Or from '@reduxjs/toolkit/query' if not using the auto-generated hooks
import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { authPromptRequested } from "./authPromptSlice";
import { logger } from "@/utils/logger";

export const apiBaseUrl: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

// Frontend half of the request-correlation thread: each call carries a unique
// X-Request-Id, which the backend adopts as its MDC `traceId` (and echoes back).
// One id ties a user action to its server log lines. See MdcLoggingFilter and
// z-docs/decisions/001-observability-stack.md.
const REQUEST_ID_HEADER = "X-Request-Id";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  prepareHeaders: (headers) => {
    if (!headers.has(REQUEST_ID_HEADER)) {
      headers.set(REQUEST_ID_HEADER, crypto.randomUUID());
    }
    return headers;
  },
  // The backend's error contract serves RFC 9457 bodies as
  // `application/problem+json` (see z-docs/features/exceptions.md). RTK Query's
  // default content-type test misses the `+json` suffix and would parse those
  // bodies as text, blanking out `error.data.detail`. Broaden it to any `*/*+json`.
  isJsonContentType: (headers) => /\bjson\b/.test(headers.get("content-type") ?? ""),
});

// `/api/auth/me` is the optional-auth probe — a 401 there just means "visitor",
// not "the user tried to do something they aren't allowed to do", so we don't
// surface the login modal for it.
const isAuthProbe = (args: string | FetchArgs): boolean => {
  const url = typeof args === "string" ? args : args.url;
  return url.endsWith("/api/auth/me");
};

// 401s funnel into the `authPrompt` slice via `api.dispatch`; React subscribes
// to the slice in `AuthPromptBridge` and opens the LoginModal there. Replaces
// the hand-rolled `authPromptBus` event bus with native Redux state.
const baseQueryWithAuthPrompt: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const status = result.error.status;
    if (status === 401 && !isAuthProbe(args)) {
      api.dispatch(
        authPromptRequested({ message: "Please sign in to continue." }),
      );
    } else if (status !== 401) {
      // Log every genuine failure with the server's traceId so a frontend error
      // and its backend log line carry the same id. 401s are an expected,
      // handled control-flow signal (auth prompt), so we don't log them as errors.
      // User-facing copy stays a per-call concern via extractErrorMessage + toast.
      const url = typeof args === "string" ? args : args.url;
      const traceId = result.meta?.response?.headers.get(REQUEST_ID_HEADER) ?? undefined;
      logger.error("API request failed", {
        url,
        status,
        traceId,
        data: result.error.data,
      });
    }
  }
  return result;
};

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery: baseQueryWithAuthPrompt,
  endpoints: () => ({}),
});
