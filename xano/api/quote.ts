import { query, input, s, ref, inp, auth } from "@xanots/sdk";
import { pricingGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { computeQuote } from "../functions/compute-quote.js";

/**
 * Quote a fee for an account + product. Any authenticated role. The whole
 * calculation is delegated to the shared compute_quote function, so this endpoint
 * and every other caller quote the identical governed number.
 */
export const quoteQuery = query({
  name: "quote",
  verb: "POST",
  apiGroup: pricingGroup,
  auth: users,
  input: {
    account_id: input.int({ required: true }),
    product_id: input.int({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), as: "caller" }),
    s.function.run({
      fn: computeQuote,
      input: {
        account_id: inp("account_id"),
        product_id: inp("product_id"),
        requested_by: ref("caller.email"),
      },
      as: "quote",
    }),
  ],
  response: ref("quote"),
});
