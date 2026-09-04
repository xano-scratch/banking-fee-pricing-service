import { table, f } from "@xanots/sdk";

/** The fee-bearing products a quote is issued against. */
export const products = table({
  name: "products",
  schema: {
    code: f.text({ required: true }),
    name: f.text({ required: true }),
    product_type: f.enum(["checking", "savings", "wire_transfer"], { required: true }),
    active: f.bool({ required: true, default: true }),
  },
  index: [{ type: "unique", fields: [{ name: "code" }] }],
});
