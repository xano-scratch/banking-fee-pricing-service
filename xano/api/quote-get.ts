import { query, input, s, ref, inp, c, expr, obj } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { quote_log } from "../tables/quote_log.js";
import { products } from "../tables/products.js";
import { accounts } from "../tables/accounts.js";
import { rate_tiers } from "../tables/rate_tiers.js";

/**
 * Replay one past quote with the schedule version and tier that were applied at
 * quote time — the reproducibility / single-decision audit view.
 */
export const quoteGetQuery = query({
  name: "quote/{id}",
  verb: "GET",
  apiGroup: pricingGroup,
  auth: users,
  input: { id: input.int() },
  stack: [
    s.db.get_by_id({ table: quote_log, id: inp("id"), as: "q" }),
    s.precondition({
      expr: expr(ref("q", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Quote not found."),
    }),
    s.db.get_by_id({ table: products, id: ref("q.product_id"), as: "product" }),
    s.db.get_by_id({ table: accounts, id: ref("q.account_id"), as: "account" }),
    // Field-match (not get_by_id) so a 0 sentinel binds null instead of 400ing.
    s.db.get({ table: rate_tiers, fieldName: "id", fieldValue: ref("q.rate_tier_id"), as: "tier" }),
  ],
  response: {
    quote: ref("q"),
    product: obj({ id: ref("product.id"), code: ref("product.code"), name: ref("product.name") }),
    account: obj({
      id: ref("account.id"),
      account_number: ref("account.account_number"),
      holder_name: ref("account.holder_name"),
    }),
    tier: ref("tier"),
  },
});
