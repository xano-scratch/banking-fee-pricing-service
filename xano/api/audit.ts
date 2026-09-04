import { query, input, s, ref, inp, col, cmp } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { quote_log } from "../tables/quote_log.js";

/**
 * The audit trail over quote_log, filterable by account, product, and a
 * created_at range. Each filter uses ignoreEmpty, so an omitted input simply
 * drops that predicate (the operand is a dynamic input, never statically empty).
 * Every row carries the fee, schedule version, and tier that was applied — the
 * same governed number every calling system would have received.
 */
export const auditQuery = query({
  name: "audit",
  verb: "GET",
  apiGroup: pricingGroup,
  auth: users,
  input: {
    account_id: input.int(),
    product_id: input.int(),
    from_ms: input.int(),
    to_ms: input.int(),
  },
  stack: [
    s.db.query({
      table: quote_log,
      where: [
        cmp(col("account_id"), "=", inp("account_id"), { ignoreEmpty: true }),
        cmp(col("product_id"), "=", inp("product_id"), { ignoreEmpty: true }),
        cmp(col("created_at"), ">=", inp("from_ms"), { ignoreEmpty: true }),
        cmp(col("created_at"), "<=", inp("to_ms"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
