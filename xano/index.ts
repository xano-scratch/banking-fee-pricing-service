import { workspace } from "@xanots/sdk";

// Tables
import { users } from "./tables/users.js";
import { products } from "./tables/products.js";
import { fee_schedules } from "./tables/fee_schedules.js";
import { rate_tiers } from "./tables/rate_tiers.js";
import { accounts } from "./tables/accounts.js";
import { quote_log } from "./tables/quote_log.js";

// API groups
import { authGroup, pricingGroup, seedGroup } from "./api/groups.js";

// Shared logic
import { computeQuote } from "./functions/compute-quote.js";

// Endpoints
import { loginQuery } from "./api/login.js";
import { meQuery } from "./api/me.js";
import { quoteQuery } from "./api/quote.js";
import { scheduleGetQuery } from "./api/schedule-get.js";
import { quoteGetQuery } from "./api/quote-get.js";
import { auditQuery } from "./api/audit.js";
import { publishQuery } from "./api/publish.js";
import { lookupsQuery } from "./api/lookups.js";
import { seedRunQuery } from "./api/seed-run.js";
import { seedStatusQuery } from "./api/seed-status.js";

/**
 * Banking Fee & Pricing Service — a governed pricing service that computes bank
 * account fees from one versioned rule set (Play 1: Business Logic Centralization).
 * The fee math lives in a single compute_quote function every caller shares, so
 * every system quotes the same number and can see the exact schedule version and
 * rate tier behind it.
 */
export default workspace("banking-fee-pricing-service")
  .registerTables([users, products, fee_schedules, rate_tiers, accounts, quote_log])
  .registerApiGroups([authGroup, pricingGroup, seedGroup])
  .registerFunctions([computeQuote])
  .registerQueries([
    loginQuery,
    meQuery,
    quoteQuery,
    scheduleGetQuery,
    quoteGetQuery,
    auditQuery,
    publishQuery,
    lookupsQuery,
    seedRunQuery,
    seedStatusQuery,
  ]);
