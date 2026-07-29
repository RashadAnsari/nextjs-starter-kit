import type { Pool } from "pg";

/**
 * The Postgres connection a repository operates through. Repositories take it
 * as a constructor argument so tests and scripts can pass their own pool.
 * There is no per-user database role, so row scoping is not enforced by the
 * database: every read is written with an explicit user_id filter.
 */
export type DbClient = Pool;

/**
 * Runs a write and converts a thrown driver error into the { error } shape the
 * route handlers already branch on, so a failed write is reported rather than
 * crashing the request.
 */
export async function runWrite<T>(
  query: () => Promise<T>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    return { data: await query(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
