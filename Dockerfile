FROM oven/bun:1.3 AS builder
WORKDIR /app

# Anything Next.js inlines into the client bundle must be present at build time
# (see the `env` block in next.config.ts). These are public values, not secrets.
ARG GIT_SHA
ARG NODE_ENV
ARG ANALYTICS_GA_MEASUREMENT_ID
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=$NODE_ENV
ENV ANALYTICS_GA_MEASUREMENT_ID=$ANALYTICS_GA_MEASUREMENT_ID

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Debian-based Node rather than Alpine, so glibc native addons keep working if
# you add one later (sharp, onnxruntime, canvas, …).
FROM node:24-slim AS runner
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# bun comes along so `bun scripts/migrate.ts` can run inside the container.
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder --chown=nextjs:nodejs /app ./

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0

CMD ["node_modules/.bin/next", "start"]
