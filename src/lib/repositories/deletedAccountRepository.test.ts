import { beforeEach, describe, expect, test } from "bun:test";
import { StubPool } from "../../../test/stubPool";
import { DeletedAccountRepository } from "./deletedAccountRepository";

/**
 * The point of this table is that it answers "was this address deleted?"
 * without holding the address, so the tests are mostly about what does NOT
 * reach the database. The digest itself is not recomputed here: that would
 * only restate the implementation. What matters is that the address never
 * appears, and that two spellings of the same address agree.
 */

process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long";

const pool = new StubPool();
const repo = new DeletedAccountRepository(pool);

beforeEach(() => {
  pool.reset();
});

describe("DeletedAccountRepository", () => {
  test("never sends the address to the database", async () => {
    await repo.record("someone@example.com");
    const [call] = pool.calls;
    expect(call.params).toHaveLength(1);
    expect(call.params[0]).not.toContain("someone");
    expect(call.params[0]).toMatch(/^[0-9a-f]{64}$/);
  });

  test("treats case and surrounding space as the same address", async () => {
    await repo.record("  USER@Example.COM ");
    await repo.record("user@example.com");
    const [first, second] = pool.calls;
    expect(first.params[0]).toBe(second.params[0]);
  });

  test("collapses the Gmail spellings that reach one mailbox", async () => {
    for (const spelling of [
      "john.doe@gmail.com",
      "johndoe+newsletter@gmail.com",
      "J.o.h.n.D.o.e@googlemail.com",
    ]) {
      await repo.record(spelling);
    }
    const [plain, ...variants] = pool.calls.map((call) => call.params[0]);
    expect(variants).toEqual([plain, plain]);
  });

  test("strips a +tag at providers that treat it as a subaddress", async () => {
    await repo.record("someone@outlook.com");
    await repo.record("someone+shopping@outlook.com");
    const [plain, tagged] = pool.calls.map((call) => call.params[0]);
    expect(tagged).toBe(plain);
  });

  test("keeps a dot outside Gmail, where it identifies a different mailbox", async () => {
    await repo.record("john.doe@outlook.com");
    await repo.record("johndoe@outlook.com");
    const [dotted, plain] = pool.calls.map((call) => call.params[0]);
    expect(dotted).not.toBe(plain);
  });

  test("keeps a hyphenated Yahoo name whole", async () => {
    // The library's Yahoo rule drops the last "-" component, which would put
    // jan-willem@ and jan@ on one digest. Turned off, so they stay apart.
    await repo.record("jan-willem@yahoo.com");
    await repo.record("jan@yahoo.com");
    const [hyphenated, plain] = pool.calls.map((call) => call.params[0]);
    expect(hyphenated).not.toBe(plain);
  });

  test("leaves an unknown domain alone apart from case", async () => {
    // A + is a legal local-part character, so at a domain with no stated
    // subaddress rule these are two different people.
    await repo.record("someone+tag@self-hosted.example");
    await repo.record("someone@self-hosted.example");
    const [tagged, plain] = pool.calls.map((call) => call.params[0]);
    expect(tagged).not.toBe(plain);
  });

  test("gives different addresses different digests", async () => {
    await repo.record("one@example.com");
    await repo.record("two@example.com");
    const [first, second] = pool.calls;
    expect(first.params[0]).not.toBe(second.params[0]);
  });

  test("recording the same address twice keeps the first row", async () => {
    await repo.record("someone@example.com");
    expect(pool.calls[0].sql).toContain("on conflict do nothing");
  });

  test("isDeleted reports a match", async () => {
    pool.on(/from deleted_accounts/, () => ({ rowCount: 1, rows: [{ deleted: true }] }));
    expect(await repo.isDeleted("someone@example.com")).toBe(true);
  });

  test("isDeleted reports no match", async () => {
    pool.on(/from deleted_accounts/, () => ({ rowCount: 1, rows: [{ deleted: false }] }));
    expect(await repo.isDeleted("someone@example.com")).toBe(false);
  });

  test("isDeleted lets nobody through when the row is missing entirely", async () => {
    // exists() always returns a row, so this is defence against a future
    // rewrite of the query rather than a case the current one can produce.
    pool.on(/from deleted_accounts/, () => ({ rowCount: 0, rows: [] }));
    expect(await repo.isDeleted("someone@example.com")).toBe(false);
  });

  test("refuses to derive a digest without the signing secret", async () => {
    const secret = process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
    try {
      // An unkeyed fallback would silently make the table brute-forceable.
      await expect(repo.isDeleted("someone@example.com")).rejects.toThrow(
        /BETTER_AUTH_SECRET is not set/
      );
      expect(pool.calls).toHaveLength(0);
    } finally {
      process.env.BETTER_AUTH_SECRET = secret;
    }
  });
});
