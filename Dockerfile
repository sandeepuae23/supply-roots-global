# syntax=docker/dockerfile:1

# ---------- Stage 1: build ----------
# This project is a bun project: it ships bun.lock + bunfig.toml and no
# package-lock.json. `npm install` fails here — npm floats react to >=19.3,
# which violates the react@">=19 <19.3" peer range of @react-three/fiber@9.7.0.
# bun.lock pins react@19.2.8, so installing from the lockfile resolves cleanly
# and reproducibly.
FROM oven/bun:1-debian AS builder
WORKDIR /app

# Install dependencies first so this layer caches across source-only changes.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .

# Origin of the FastAPI backend, baked into the client bundle at build time.
# Vite statically replaces `import.meta.env.VITE_API_BASE_URL` (see
# src/lib/api/config.ts), so it must be present in the environment before the
# build runs. Empty by default keeps requests same-origin/relative; compose
# passes http://localhost:8000 for local acceptance.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# The project's vite config defaults Nitro to the "cloudflare" target, which
# emits a Workers bundle that plain Node cannot execute. Override it so the
# build emits a standalone Node HTTP server at .output/server/index.mjs.
ENV NITRO_PRESET=node-server
RUN bun run build

# ---------- Stage 2: runtime ----------
# The node-server preset emits a Node program, so the runtime image is Node,
# not bun — and it needs no package manager at all.
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# The Nitro node-server output is self-contained: its dependencies are bundled,
# so there is no install step in the runtime image.
COPY --from=builder /app/.output ./.output

# Run unprivileged using the image's built-in `node` user.
USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
