import { query, s, ref } from "@xanots/sdk";
import { seedGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { products } from "../tables/products.js";
import { accounts } from "../tables/accounts.js";
import { quote_log } from "../tables/quote_log.js";

/**
 * Row counts, so the frontend can self-seed on first load (call seed/run when the
 * store is empty). Public — no auth, so the app can check before anyone signs in.
 * Each count is wrapped in a response key (a bare count of 0 serializes empty).
 */
export const seedStatusQuery = query({
  name: "status",
  verb: "GET",
  apiGroup: seedGroup,
  stack: [
    s.db.query({ table: users, returnType: "count", as: "users" }),
    s.db.query({ table: products, returnType: "count", as: "products" }),
    s.db.query({ table: accounts, returnType: "count", as: "accounts" }),
    s.db.query({ table: quote_log, returnType: "count", as: "quotes" }),
  ],
  response: {
    users: ref("users"),
    products: ref("products"),
    accounts: ref("accounts"),
    quotes: ref("quotes"),
  },
});
