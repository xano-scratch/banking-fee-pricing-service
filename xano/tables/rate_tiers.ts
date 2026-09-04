import { table, f } from "@xanots/sdk";
import { fee_schedules } from "./fee_schedules.js";

/**
 * The balance bands inside a schedule that adjust the base fee. Tiers within a
 * schedule cover contiguous, non-overlapping bands: the matching tier is the one
 * with the greatest `min_balance` at or below the account balance.
 * `max_balance` is null on the open-ended top band. `fee_adjustment` is added to
 * the base fee (negative = a waiver/discount, positive = a surcharge).
 */
export const rate_tiers = table({
  name: "rate_tiers",
  schema: {
    fee_schedule_id: f.tableRef(fee_schedules, { required: true }),
    tier_name: f.text({ required: true }),
    min_balance: f.decimal({ required: true }),
    max_balance: f.decimal({ nullable: true }),
    fee_adjustment: f.decimal({ required: true }),
  },
  index: [{ type: "btree", fields: [{ name: "fee_schedule_id" }] }],
});
