# CI runs these same targets, so a check that passes locally passes there too.
#
# Every target is phony: `test` and `build` would otherwise collide with the
# test/ directory and the build output, which make would consider up to date
# and silently skip.
.PHONY: up down migrate db-shell dev local lint format typecheck test coverage build

# ---------- Development ----------

up:
	docker compose up -d

down:
	docker compose down

migrate:
	bun scripts/migrate.ts

db-shell:
	docker compose exec postgres psql -U app -d app

dev:
	bun run dev

build:
	bun run build

# --------- Code quality ----------

local: format lint typecheck test

lint:
	bun run lint
	bunx prettier --check "**/*.{ts,tsx,css,json,md}" --ignore-path .gitignore

format:
	bunx prettier --write "**/*.{ts,tsx,css,json,md}" --ignore-path .gitignore
	bun run lint --fix

typecheck:
	bun run typecheck

test:
	bun test

coverage:
	bun test --coverage
