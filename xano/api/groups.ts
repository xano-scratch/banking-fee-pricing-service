import { apiGroup } from "@xanots/sdk";

// Pinned canonical slugs keep the public paths stable and let getPath() resolve
// in the browser bundle without a lock file.

/** Native auth: login + me. */
export const authGroup = apiGroup({ name: "auth", canonical: "auth" });

/** The governed pricing surface: quote, schedule, audit, publish, lookups. */
export const pricingGroup = apiGroup({ name: "pricing", canonical: "pricing" });

/** Demo seeding so a fresh ephemeral is browsable immediately. */
export const seedGroup = apiGroup({ name: "seed", canonical: "seed" });
