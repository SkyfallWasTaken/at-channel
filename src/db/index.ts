import { drizzle } from "drizzle-orm/libsql";
import { env } from "../util";

export const db = drizzle({
  connection: {
    url: env.TURSO_CONNECTION_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  },
});

export { adminsTable, webhooksTable } from "./schema";
