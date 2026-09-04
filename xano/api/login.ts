import { query, input, s, ref, inp, c, expr, obj } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { users } from "../tables/users.js";

/**
 * Exchange email + password for a bearer token. Public (no `auth:`). The password
 * is taken as text (not input.password) so it is not double-hashed before
 * check_password does its own comparison hash.
 */
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authGroup,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      // `output` naming password is required — the column is access:internal.
      output: ["id", "email", "password", "name", "role"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    user: obj({
      id: ref("u.id"),
      email: ref("u.email"),
      name: ref("u.name"),
      role: ref("u.role"),
    }),
  },
});
