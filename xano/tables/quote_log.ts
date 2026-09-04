import { table, f } from "@xanots/sdk";
import { accounts } from "./accounts.js";
import { products } from "./products.js";
import { fee_schedules } from "./fee_schedules.js";
import { rate_tiers } from "./rate_tiers.js";

/**
 * The immutable audit trail: one row per quote issued. The schedule version and
 * tier are copied in at quote time, so a past quote stays reproducible even after
 * the schedule is retired and a new version is published.
 */
export const quote_log = table({
  name: "quote_log",
  schema: {
    account_id: f.tableRef(accounts, { required: true }),
    product_id: f.tableRef(products, { required: true }),
    fee_schedule_id: f.tableRef(fee_schedules, { required: true }),
    // Optional FK uses the 0 sentinel (a null in an int FK is unqueryable); every
    // real quote resolves a tier, so in practice this is always a live id.
    rate_tier_id: f.tableRef(rate_tiers, { required: true, default: 0 }),
    schedule_version: f.int({ required: true }),
    base_fee: f.decimal({ required: true }),
    tier_adjustment: f.decimal({ required: true }),
    quoted_fee: f.decimal({ required: true }),
    requested_by: f.text({ required: true }),
  },
  index: [
    { type: "btree", fields: [{ name: "account_id" }] },
    { type: "btree", fields: [{ name: "product_id" }] },
  ],
});
