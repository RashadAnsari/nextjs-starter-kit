/**
 * Lets an admin script import the app's server modules.
 *
 * The "server-only" package throws on import outside a React Server Components
 * build, which is the point: it stops a module holding a secret from being
 * pulled into the browser bundle. Scripts run under plain bun, so importing
 * anything guarded that way, the payment provider and the S3 client among them,
 * would abort before the script starts.
 *
 * Replacing it with an empty module here rather than dropping the guard from
 * those modules keeps the build-time protection where it is worth having, and
 * confines the exception to the one command that needs it. `test/setup.ts` does
 * the same thing for the test runtime, with `mock.module`, which only exists
 * under `bun test`.
 *
 * Loaded through --preload in the package.json script, so run admin scripts as
 * `bun run <name>` rather than `bun scripts/<name>.ts`.
 */
import { plugin } from "bun";

plugin({
  name: "allow-server-only",
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
