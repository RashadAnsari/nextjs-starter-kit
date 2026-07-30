/**
 * A scripted stand-in for the Postgres pool, so route and repository tests can
 * assert which statements ran and force a driver error on any one of them.
 *
 * It matches on the SQL text rather than parsing it: the point is to pin the
 * control flow around a query, not to reimplement Postgres. Anything that
 * depends on real SQL semantics (the conditional upsert, the claim insert)
 * has to be proven against a live database instead.
 */

export interface QueryOutcome {
  rowCount: number;
  rows: unknown[];
}

export class StubPool {
  calls: { sql: string; params: unknown[] }[] = [];
  private handlers: [RegExp, (params: unknown[]) => QueryOutcome | Error][] = [];

  /** Script the outcome for queries matching the pattern. */
  on(pattern: RegExp, handler: (params: unknown[]) => QueryOutcome | Error) {
    this.handlers.push([pattern, handler]);
  }

  reset() {
    this.calls = [];
    this.handlers = [];
  }

  matched(pattern: RegExp) {
    return this.calls.filter((c) => pattern.test(c.sql));
  }

  // Generic in the row type so the stub satisfies DbClient. Scripted rows are
  // plain objects, so the cast is the test author's assertion that each one
  // matches the shape the caller reads.
  async query<R = never>(
    sql: string,
    params: unknown[] = []
  ): Promise<{ rows: R[]; rowCount: number | null }> {
    this.calls.push({ sql, params });
    for (const [pattern, handler] of this.handlers) {
      if (pattern.test(sql)) {
        const outcome = handler(params);
        if (outcome instanceof Error) {
          throw outcome;
        }
        return { rowCount: outcome.rowCount, rows: outcome.rows as R[] };
      }
    }
    return { rowCount: 1, rows: [] };
  }
}
