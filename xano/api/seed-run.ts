import { query, s, ref, c } from "@xanots/sdk";
import { seedGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { products } from "../tables/products.js";
import { fee_schedules } from "../tables/fee_schedules.js";
import { rate_tiers } from "../tables/rate_tiers.js";
import { accounts } from "../tables/accounts.js";
import { quote_log } from "../tables/quote_log.js";
import { computeQuote } from "../functions/compute-quote.js";

/**
 * Seed a realistic, browsable demo. Idempotent: it truncates every table (resetting
 * ids) and rebuilds, so calling it again is safe. Public so the frontend can seed a
 * fresh ephemeral on first load. Quotes are created through the SAME compute_quote
 * function the live endpoint uses, so the seeded audit trail is real, not faked.
 *
 * Demo sign-in (seeded here, plaintext hashed on write):
 *   admin@bank.example  / admin-pass-123  (pricing_admin)
 *   viewer@bank.example / viewer-pass-123 (pricing_viewer)
 */
export const seedRunQuery = query({
  name: "run",
  verb: "GET",
  apiGroup: seedGroup,
  stack: [
    // ── Reset (children first) ────────────────────────────────────────────────
    s.db.truncate({ table: quote_log, reset: true }),
    s.db.truncate({ table: rate_tiers, reset: true }),
    s.db.truncate({ table: fee_schedules, reset: true }),
    s.db.truncate({ table: accounts, reset: true }),
    s.db.truncate({ table: products, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // ── Staff (API-layer RBAC) ────────────────────────────────────────────────
    s.db.add({
      table: users,
      row: { email: "admin@bank.example", password: "admin-pass-123", name: "Ada Admin", role: "pricing_admin" },
    }),
    s.db.add({
      table: users,
      row: { email: "viewer@bank.example", password: "viewer-pass-123", name: "Vic Viewer", role: "pricing_viewer" },
    }),

    // ── Products ──────────────────────────────────────────────────────────────
    s.db.add({ table: products, row: { code: "CHK", name: "Everyday Checking", product_type: "checking", active: true }, as: "pChk" }),
    s.db.add({ table: products, row: { code: "SAV", name: "Premier Savings", product_type: "savings", active: true }, as: "pSav" }),
    s.db.add({ table: products, row: { code: "WIRE", name: "Wire Transfer", product_type: "wire_transfer", active: true }, as: "pWire" }),
    s.db.add({ table: products, row: { code: "MM", name: "Money Market", product_type: "savings", active: true }, as: "pMm" }),

    // ── Fee schedules (one active + one draft per product; MM is draft-only) ────
    s.db.add({ table: fee_schedules, row: { product_id: ref("pChk.id"), version: 1, status: "active", base_fee: 12.0, currency: "USD", effective_date: "2025-01-01", note: "Standard consumer checking fees." }, as: "chkV1" }),
    s.db.add({ table: fee_schedules, row: { product_id: ref("pChk.id"), version: 2, status: "draft", base_fee: 10.0, currency: "USD", effective_date: "2026-01-01", note: "Proposed 2026 checking fees (lower base, deeper waivers)." }, as: "chkV2" }),
    s.db.add({ table: fee_schedules, row: { product_id: ref("pSav.id"), version: 1, status: "active", base_fee: 8.0, currency: "USD", effective_date: "2025-01-01", note: "Premier savings maintenance fees." }, as: "savV1" }),
    s.db.add({ table: fee_schedules, row: { product_id: ref("pSav.id"), version: 2, status: "draft", base_fee: 6.0, currency: "USD", effective_date: "2026-01-01", note: "Proposed 2026 savings fees." }, as: "savV2" }),
    s.db.add({ table: fee_schedules, row: { product_id: ref("pWire.id"), version: 1, status: "active", base_fee: 25.0, currency: "USD", effective_date: "2025-01-01", note: "Per-transfer wire fees." }, as: "wireV1" }),
    s.db.add({ table: fee_schedules, row: { product_id: ref("pMm.id"), version: 1, status: "draft", base_fee: 9.0, currency: "USD", effective_date: "2026-01-01", note: "Money market fees pending approval (no active version yet)." }, as: "mmV1" }),

    // ── Rate tiers (contiguous bands; top band max_balance = null) ──────────────
    // CHK v1 (active): 12 base → 12 / 7 / 0
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV1.id"), tier_name: "Standard", min_balance: 0.0, max_balance: 2500.0, fee_adjustment: 0.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV1.id"), tier_name: "Preferred", min_balance: 2500.0, max_balance: 25000.0, fee_adjustment: -5.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV1.id"), tier_name: "Premier", min_balance: 25000.0, max_balance: null, fee_adjustment: -12.0 } }),
    // CHK v2 (draft): 10 base → 10 / 6 / 0
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV2.id"), tier_name: "Standard", min_balance: 0.0, max_balance: 2500.0, fee_adjustment: 0.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV2.id"), tier_name: "Preferred", min_balance: 2500.0, max_balance: 25000.0, fee_adjustment: -4.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("chkV2.id"), tier_name: "Premier", min_balance: 25000.0, max_balance: null, fee_adjustment: -10.0 } }),
    // SAV v1 (active): 8 base → 8 / 5
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("savV1.id"), tier_name: "Basic", min_balance: 0.0, max_balance: 5000.0, fee_adjustment: 0.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("savV1.id"), tier_name: "Saver", min_balance: 5000.0, max_balance: null, fee_adjustment: -3.0 } }),
    // SAV v2 (draft): 6 base → 6 / 4
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("savV2.id"), tier_name: "Basic", min_balance: 0.0, max_balance: 5000.0, fee_adjustment: 0.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("savV2.id"), tier_name: "Saver", min_balance: 5000.0, max_balance: null, fee_adjustment: -2.0 } }),
    // WIRE v1 (active): 25 base → 25 / 35 (high-value surcharge)
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("wireV1.id"), tier_name: "Standard", min_balance: 0.0, max_balance: 100000.0, fee_adjustment: 0.0 } }),
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("wireV1.id"), tier_name: "High value", min_balance: 100000.0, max_balance: null, fee_adjustment: 10.0 } }),
    // MM v1 (draft): 9 base → 9
    s.db.add({ table: rate_tiers, row: { fee_schedule_id: ref("mmV1.id"), tier_name: "Base", min_balance: 0.0, max_balance: null, fee_adjustment: 0.0 } }),

    // ── Accounts (balances span the CHK bands, plus SAV / WIRE / MM) ────────────
    s.db.add({ table: accounts, row: { account_number: "ACC-1001", product_id: ref("pChk.id"), holder_name: "Jordan Lee", balance: 1200.0, status: "open" }, as: "a1" }),
    s.db.add({ table: accounts, row: { account_number: "ACC-1002", product_id: ref("pChk.id"), holder_name: "Sam Rivera", balance: 8000.0, status: "open" }, as: "a2" }),
    s.db.add({ table: accounts, row: { account_number: "ACC-1003", product_id: ref("pChk.id"), holder_name: "Alex Kim", balance: 65000.0, status: "open" }, as: "a3" }),
    s.db.add({ table: accounts, row: { account_number: "ACC-2001", product_id: ref("pSav.id"), holder_name: "Robin Chase", balance: 30000.0, status: "open" }, as: "a4" }),
    s.db.add({ table: accounts, row: { account_number: "ACC-3001", product_id: ref("pWire.id"), holder_name: "Casey Park", balance: 250000.0, status: "open" }, as: "a5" }),
    s.db.add({ table: accounts, row: { account_number: "ACC-4001", product_id: ref("pMm.id"), holder_name: "Morgan Diaz", balance: 10000.0, status: "open" }, as: "a6" }),

    // ── A few quotes through the SAME governed function (real audit trail) ───────
    s.function.run({ fn: computeQuote, input: { account_id: ref("a1.id"), product_id: ref("pChk.id"), requested_by: c.text("seed@system") } }),
    s.function.run({ fn: computeQuote, input: { account_id: ref("a2.id"), product_id: ref("pChk.id"), requested_by: c.text("seed@system") } }),
    s.function.run({ fn: computeQuote, input: { account_id: ref("a3.id"), product_id: ref("pChk.id"), requested_by: c.text("seed@system") } }),
    s.function.run({ fn: computeQuote, input: { account_id: ref("a4.id"), product_id: ref("pSav.id"), requested_by: c.text("seed@system") } }),

    // ── Counts back ─────────────────────────────────────────────────────────────
    s.db.query({ table: users, returnType: "count", as: "cUsers" }),
    s.db.query({ table: products, returnType: "count", as: "cProducts" }),
    s.db.query({ table: fee_schedules, returnType: "count", as: "cSchedules" }),
    s.db.query({ table: rate_tiers, returnType: "count", as: "cTiers" }),
    s.db.query({ table: accounts, returnType: "count", as: "cAccounts" }),
    s.db.query({ table: quote_log, returnType: "count", as: "cQuotes" }),
  ],
  response: {
    ok: c.bool(true),
    users: ref("cUsers"),
    products: ref("cProducts"),
    schedules: ref("cSchedules"),
    tiers: ref("cTiers"),
    accounts: ref("cAccounts"),
    quotes: ref("cQuotes"),
  },
});
