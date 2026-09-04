import { defineFunction, input, s, ref, inp, c, col, expr, withFilters, fl, obj } from "@xanots/sdk";
import { accounts } from "../tables/accounts.js";
import { products } from "../tables/products.js";
import { fee_schedules } from "../tables/fee_schedules.js";
import { rate_tiers } from "../tables/rate_tiers.js";
import { quote_log } from "../tables/quote_log.js";

/**
 * The ONE governed fee calculation. Every quote — from the public endpoint and
 * from the seed routine — runs through this single function, so there is no second
 * copy of the pricing rule to drift. This is the Play-1 proof: business logic
 * centralized in one readable, versioned place.
 *
 * The rule:
 *   1. resolve the single ACTIVE fee schedule for the product (else a governed
 *      error, never a silent 0);
 *   2. select the rate tier whose band contains the account balance (the greatest
 *      min_balance at or below it — the bands are contiguous);
 *   3. quoted_fee = base_fee + fee_adjustment;
 *   4. write an immutable quote_log row and return the fee with the exact version
 *      and tier that produced it.
 */
export const computeQuote = defineFunction({
  name: "compute_quote",
  description:
    "Compute an account fee from the product's active fee schedule and the matching balance tier, log it, and return the fee with its schedule version and tier.",
  input: {
    account_id: input.int({ required: true }),
    product_id: input.int({ required: true }),
    requested_by: input.text({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: accounts, id: inp("account_id"), as: "account" }),
    s.precondition({
      expr: expr(ref("account", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Account not found."),
    }),
    s.db.get_by_id({ table: products, id: inp("product_id"), as: "product" }),
    s.precondition({
      expr: expr(ref("product", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Product not found."),
    }),
    // The single active schedule for this product (governed: exactly one).
    s.db.query({
      table: fee_schedules,
      where: [expr(col("product_id"), "=", inp("product_id")), expr(col("status"), "=", c.text("active"))],
      returnType: "single",
      as: "schedule",
    }),
    s.precondition({
      expr: expr(ref("schedule", { safe: true }), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("No active fee schedule for this product."),
    }),
    // The matching tier: greatest min_balance at or below the account balance.
    s.db.query({
      table: rate_tiers,
      where: [
        expr(col("fee_schedule_id"), "=", ref("schedule.id")),
        expr(col("min_balance"), "<=", ref("account.balance")),
      ],
      sort: [{ sortBy: "min_balance", dir: "desc" }],
      returnType: "single",
      as: "tier",
    }),
    s.precondition({
      expr: expr(ref("tier", { safe: true }), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("No rate tier covers the account balance."),
    }),
    // quoted_fee = base_fee + fee_adjustment (computed at runtime, not in JS).
    s.set_var("quoted_fee", withFilters(ref("schedule.base_fee"), fl.add(ref("tier.fee_adjustment")))),
    s.db.add({
      table: quote_log,
      row: {
        account_id: inp("account_id"),
        product_id: inp("product_id"),
        fee_schedule_id: ref("schedule.id"),
        rate_tier_id: ref("tier.id"),
        schedule_version: ref("schedule.version"),
        base_fee: ref("schedule.base_fee"),
        tier_adjustment: ref("tier.fee_adjustment"),
        quoted_fee: ref("quoted_fee"),
        requested_by: inp("requested_by"),
      },
      as: "log",
    }),
  ],
  // Numbers come from the stored log row (typed decimals); names from the joins.
  response: {
    quote_id: ref("log.id"),
    quoted_fee: ref("log.quoted_fee"),
    base_fee: ref("log.base_fee"),
    tier_adjustment: ref("log.tier_adjustment"),
    schedule_version: ref("log.schedule_version"),
    currency: ref("schedule.currency"),
    fee_schedule_id: ref("schedule.id"),
    requested_by: ref("log.requested_by"),
    product: obj({ id: ref("product.id"), code: ref("product.code"), name: ref("product.name") }),
    account: obj({
      id: ref("account.id"),
      account_number: ref("account.account_number"),
      holder_name: ref("account.holder_name"),
      balance: ref("account.balance"),
    }),
    tier: obj({
      id: ref("tier.id"),
      tier_name: ref("tier.tier_name"),
      min_balance: ref("tier.min_balance"),
      max_balance: ref("tier.max_balance"),
      fee_adjustment: ref("tier.fee_adjustment"),
    }),
  },
});
