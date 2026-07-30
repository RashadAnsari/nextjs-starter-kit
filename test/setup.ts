import { mock } from "bun:test";

// The server-only package throws when imported outside a React Server
// Components build. Tests run under plain bun, so replace it with an empty
// module; the boundary it enforces is a build-time concern, not a test one.
mock.module("server-only", () => ({}));
