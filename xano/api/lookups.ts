import { query, s, ref } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { products } from "../tables/products.js";
import { accounts } from "../tables/accounts.js";

/** Products + accounts for the UI's selectors and id-to-label mapping. */
export const lookupsQuery = query({
  name: "lookups",
  verb: "GET",
  apiGroup: pricingGroup,
  auth: users,
  stack: [
    s.db.query({ table: products, sort: [{ sortBy: "code", dir: "asc" }], as: "products" }),
    s.db.query({ table: accounts, sort: [{ sortBy: "account_number", dir: "asc" }], as: "accounts" }),
  ],
  response: {
    products: ref("products"),
    accounts: ref("accounts"),
  },
});
