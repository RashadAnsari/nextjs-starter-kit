import { Pool } from "pg";

// Single connection pool shared by the repositories and by Better Auth, so the
// whole app uses one set of connections against DATABASE_URL.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
