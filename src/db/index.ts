import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "@/db/schema";

if (typeof window !== "undefined") {
  throw new Error("O banco só pode ser usado no servidor");
}

export const db = drizzle(process.env.DATABASE_URL!, { schema });
