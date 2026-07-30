# The test target collides with the test/ directory, which make would
# otherwise consider up to date and silently skip.
.PHONY: test

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
