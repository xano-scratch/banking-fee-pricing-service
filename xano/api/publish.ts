import { query, input, s, ref, inp, c, col, expr, auth, obj } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { fee_schedules } from "../tables/fee_schedules.js";

/**
 * The governance state machine: activate a draft schedule and retire the product's
 * current active one, so exactly one version is active. pricing_admin only — this
 * is the "define once, version it" control the whole play rests on.
 */
export const publishQuery = query({
  name: "schedule/publish",
  verb: "POST",
  apiGroup: pricingGroup,
  auth: users,
  input: { fee_schedule_id: input.int({ required: true }) },
  stack: [
    // API-layer RBAC: read the caller's role and gate on it.
    s.db.get_by_id({ table: users, id: auth("id"), as: "caller" }),
    s.precondition({
      expr: expr(ref("caller.role"), "=", c.text("pricing_admin")),
      error_type: "accessdenied",
      error: c.text("Only a pricing_admin can publish a schedule."),
    }),
    // The draft to activate must exist and actually be a draft.
    s.db.get_by_id({ table: fee_schedules, id: inp("fee_schedule_id"), as: "draft" }),
    s.precondition({
      expr: expr(ref("draft", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Schedule not found."),
    }),
    s.precondition({
      expr: expr(ref("draft.status"), "=", c.text("draft")),
      error_type: "badrequest",
      error: c.text("Only a draft schedule can be published."),
    }),
    // Retire the product's current active schedule, if there is one.
    s.db.query({
      table: fee_schedules,
      where: [expr(col("product_id"), "=", ref("draft.product_id")), expr(col("status"), "=", c.text("active"))],
      returnType: "single",
      as: "current",
    }),
    s.conditional({
      when: expr(ref("current", { safe: true }), "!=", c.null()),
      then: [
        s.db.edit({
          table: fee_schedules,
          fieldName: "id",
          fieldValue: ref("current.id"),
          row: { status: "retired" },
        }),
      ],
    }),
    // Activate the draft — now the single active version for its product.
    s.db.edit({
      table: fee_schedules,
      fieldName: "id",
      fieldValue: ref("draft.id"),
      row: { status: "active" },
      as: "activated",
    }),
  ],
  response: {
    activated: ref("activated"),
    retired_schedule_id: ref("current.id", { safe: true }),
  },
});
