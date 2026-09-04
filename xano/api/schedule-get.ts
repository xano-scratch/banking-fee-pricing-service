import { query, input, s, ref, inp, c, col, expr, obj } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { products } from "../tables/products.js";
import { fee_schedules } from "../tables/fee_schedules.js";
import { rate_tiers } from "../tables/rate_tiers.js";

/**
 * The "show the schedule behind it" view: a product's active schedule with its
 * ordered rate tiers, plus any draft version waiting to be published. Returns a
 * null `active` (with empty tiers) when the product has no active schedule.
 *
 * Tiers are fetched inside an s.conditional guarded on the schedule existing, so
 * the where clause always gets a plain (non-null) id. A null-safe ref in a
 * db.query where compiles to a get-filter operand the SQL parser rejects.
 */
export const scheduleGetQuery = query({
  name: "schedule/{product_id}",
  verb: "GET",
  apiGroup: pricingGroup,
  auth: users,
  input: { product_id: input.int() },
  stack: [
    s.db.get_by_id({ table: products, id: inp("product_id"), as: "product" }),
    s.precondition({
      expr: expr(ref("product", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Product not found."),
    }),
    s.db.query({
      table: fee_schedules,
      where: [expr(col("product_id"), "=", inp("product_id")), expr(col("status"), "=", c.text("active"))],
      returnType: "single",
      as: "active",
    }),
    s.db.query({
      table: fee_schedules,
      where: [expr(col("product_id"), "=", inp("product_id")), expr(col("status"), "=", c.text("draft"))],
      returnType: "single",
      as: "draft",
    }),
    s.set_var("active_tiers", c.array([])),
    s.set_var("draft_tiers", c.array([])),
    s.conditional({
      when: expr(ref("active", { safe: true }), "!=", c.null()),
      then: [
        s.db.query({
          table: rate_tiers,
          where: expr(col("fee_schedule_id"), "=", ref("active.id")),
          sort: [{ sortBy: "min_balance", dir: "asc" }],
          as: "active_tiers",
        }),
      ],
    }),
    s.conditional({
      when: expr(ref("draft", { safe: true }), "!=", c.null()),
      then: [
        s.db.query({
          table: rate_tiers,
          where: expr(col("fee_schedule_id"), "=", ref("draft.id")),
          sort: [{ sortBy: "min_balance", dir: "asc" }],
          as: "draft_tiers",
        }),
      ],
    }),
  ],
  response: {
    product: obj({
      id: ref("product.id"),
      code: ref("product.code"),
      name: ref("product.name"),
      product_type: ref("product.product_type"),
    }),
    active: ref("active"),
    active_tiers: ref("active_tiers"),
    draft: ref("draft"),
    draft_tiers: ref("draft_tiers"),
  },
});
