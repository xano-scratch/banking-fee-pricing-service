import { query, s, ref, auth } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { users } from "../tables/users.js";

/** The authenticated caller and role. Requires a valid bearer token. */
export const meQuery = query({
  name: "me",
  verb: "GET",
  apiGroup: authGroup,
  auth: users,
  stack: [s.db.get_by_id({ table: users, id: auth("id"), as: "u" })],
  response: {
    id: ref("u.id"),
    email: ref("u.email"),
    name: ref("u.name"),
    role: ref("u.role"),
  },
});
