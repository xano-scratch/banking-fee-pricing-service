import { table, f } from "@xanots/sdk";
import { products } from "./products.js";

/**
 * A versioned rule set for one product — the governance surface. At most one
 * `active` schedule per product at a time; publishing a `draft` retires the
 * current `active` one (see api/publish.ts). `base_fee` is the starting fee a
 * rate tier then adjusts.
 */
export const fee_schedules = table({
  name: "fee_schedules",
  schema: {
    product_id: f.tableRef(products, { required: true }),
    version: f.int({ required: true }),
    status: f.enum(["draft", "active", "retired"], { required: true }),
    base_fee: f.decimal({ required: true }),
    currency: f.text({ required: true, default: "USD" }),
    effective_date: f.date(),
    note: f.text(),
  },
  index: [{ type: "btree", fields: [{ name: "product_id" }] }],
});
