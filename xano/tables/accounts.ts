import { table, f } from "@xanots/sdk";
import { products } from "./products.js";

/** The accounts a fee is quoted for. `balance` selects the rate tier. */
export const accounts = table({
  name: "accounts",
  schema: {
    account_number: f.text({ required: true }),
    product_id: f.tableRef(products, { required: true }),
    holder_name: f.text({ required: true }),
    balance: f.decimal({ required: true }),
    status: f.enum(["open", "closed"], { required: true, default: "open" }),
  },
  index: [{ type: "unique", fields: [{ name: "account_number" }] }],
});
