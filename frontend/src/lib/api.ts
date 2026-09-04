// The one contract: paths and request/response TYPES are derived from the xanots
// query defs. Change a def and everything here follows. No hand-typed URLs, no
// hand-mirrored response shapes.

import type { InferInput, InferResponse } from "@xanots/sdk";

// Runtime: the lean query defs, imported for getPath()/verb only.
import { loginQuery } from "../../../xano/api/login.js";
import { meQuery } from "../../../xano/api/me.js";
import { quoteQuery } from "../../../xano/api/quote.js";
import { scheduleGetQuery } from "../../../xano/api/schedule-get.js";
import { quoteGetQuery } from "../../../xano/api/quote-get.js";
import { auditQuery } from "../../../xano/api/audit.js";
import { publishQuery } from "../../../xano/api/publish.js";
import { lookupsQuery } from "../../../xano/api/lookups.js";
import { seedRunQuery } from "../../../xano/api/seed-run.js";
import { seedStatusQuery } from "../../../xano/api/seed-status.js";

// Types (erased at build). The quote endpoint relays the shared function's result,
// so its shape is the function's InferResponse — the single source of the truth.
import type { computeQuote } from "../../../xano/functions/compute-quote.js";

export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types from the defs ───────────────────────────────────────────────────────
export type LoginBody = InferInput<typeof loginQuery>;
export type LoginResponse = InferResponse<typeof loginQuery>;
export type Me = InferResponse<typeof meQuery>;
export type User = Me;
export type QuoteBody = InferInput<typeof quoteQuery>;
export type Quote = InferResponse<typeof computeQuote>;
export type ScheduleView = InferResponse<typeof scheduleGetQuery>;
export type QuoteDetail = InferResponse<typeof quoteGetQuery>;
export type AuditList = InferResponse<typeof auditQuery>;
export type AuditRow = AuditList extends readonly (infer T)[] ? T : never;
export type Lookups = InferResponse<typeof lookupsQuery>;
export type PublishResult = InferResponse<typeof publishQuery>;
export type SeedStatus = InferResponse<typeof seedStatusQuery>;

// ── Token store ───────────────────────────────────────────────────────────────
const TOKEN_KEY = "bfps.token";
export const getToken = (): string | null =>
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ── Fetch helpers ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, verb: string, body?: unknown, authed = true): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authed) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : undefined) || `Request failed (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

// ── The endpoints ─────────────────────────────────────────────────────────────
export const api = {
  login: (body: LoginBody) => call<LoginResponse>(loginQuery.getPath(), loginQuery.verb, body, false),
  me: () => call<Me>(meQuery.getPath(), meQuery.verb),
  quote: (body: QuoteBody) => call<Quote>(quoteQuery.getPath(), quoteQuery.verb, body),
  schedule: (productId: number) =>
    call<ScheduleView>(scheduleGetQuery.getPath({ params: { product_id: productId } }), scheduleGetQuery.verb),
  quoteById: (id: number) =>
    call<QuoteDetail>(quoteGetQuery.getPath({ params: { id } }), quoteGetQuery.verb),
  audit: (filters: { account_id?: number; product_id?: number; from_ms?: number; to_ms?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && !Number.isNaN(v)) qs.set(k, String(v));
    }
    const q = qs.toString();
    return call<AuditList>(auditQuery.getPath() + (q ? `?${q}` : ""), auditQuery.verb);
  },
  publish: (feeScheduleId: number) =>
    call<PublishResult>(publishQuery.getPath(), publishQuery.verb, { fee_schedule_id: feeScheduleId }),
  lookups: () => call<Lookups>(lookupsQuery.getPath(), lookupsQuery.verb),
  seedStatus: () => call<SeedStatus>(seedStatusQuery.getPath(), seedStatusQuery.verb, undefined, false),
  seedRun: () => call<unknown>(seedRunQuery.getPath(), seedRunQuery.verb, undefined, false),
};
