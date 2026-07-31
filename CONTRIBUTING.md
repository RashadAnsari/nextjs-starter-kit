# Contributing

Thanks for taking the time. This is a starter kit, so the bar for what belongs here is a little different from a normal library: a change is in scope if it is something most people building a SaaS would need, and out of scope if it is specific to one product.

## In scope

- Fixes to anything that is broken, insecure, or misleading
- Keeping dependencies and framework APIs current
- Documentation that saves someone an hour of confusion
- Making an existing piece simpler without making it less capable

## Usually out of scope

- New payment providers beyond a reference implementation, unless you are also willing to maintain it
- Feature-specific code (a blog, a CMS, an admin panel): fork it instead
- Swapping a core choice (Postgres for Mongo, Better Auth for something else) rather than adding an option

## Before you open a pull request

```bash
bun install
make local        # format, lint, typecheck, test
make build
```

All five must pass. CI runs the same targets, so a green run here is a green run there. `make local` also formats, so run it rather than fighting the formatter.

Read `AGENTS.md` first. It carries the conventions this codebase actually follows: where SQL lives, how forms report errors, why some modules are server-only, and what must never be trusted from a request. A change that ignores those will get review comments about them.

[docs/TECHNICAL.md](docs/TECHNICAL.md) is the companion: how each piece works and why it works that way.

## Commit messages

A single imperative sentence, no type prefix:

```
Derive CSP media origins from the storage configuration
```

If a change needs explanation, put it in the body as plain prose, not bullet points.

## Reporting a security issue

Please do not open a public issue. Use GitHub's private vulnerability reporting on the [Security tab](https://github.com/RashadAnsari/nextjs-starter-kit/security/advisories/new), which keeps the report private until a fix is out, and allow a reasonable window before disclosing.

The support address in `src/config/site.ts` is a placeholder for your own product. It is not monitored for reports about this template.
