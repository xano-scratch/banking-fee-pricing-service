import { table, f } from "@xanots/sdk";

/**
 * Staff who call the pricing service. Auth is API-layer RBAC: this table backs
 * the auth token, and each protected endpoint names it as `auth:` and reads the
 * caller's row with `auth("id")`. Two roles:
 *   - pricing_admin  — read + quote, AND publish/retire schedules
 *   - pricing_viewer — read + quote only
 * There is no row-level security anywhere; access is enforced at the endpoint.
 */
export const users = table({
  name: "users",
  auth: true, // backs authentication (mints the token this workspace verifies)
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    email: f.email({ required: true }),
    // Plaintext in, hashed on write. Login reads it via `output` (access:internal)
    // and compares with s.security.check_password — never returned to a client.
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(["pricing_admin", "pricing_viewer"], { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
