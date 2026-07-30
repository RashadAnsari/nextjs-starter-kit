/**
 * The Postgres connection a repository operates through. Repositories take it
 * as a constructor argument so tests and scripts can pass their own pool.
 * There is no per-user database role, so row scoping is not enforced by the
 * database: every read is written with an explicit user_id filter.
 *
 * Narrowed to the two fields the repositories actually read rather than typed
 * as pg's Pool, so a test double does not have to implement a connection pool
 * to stand in for one. The real pool satisfies it structurally.
 */
export interface DbClient {
  query<R = never>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

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
