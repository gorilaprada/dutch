# Dutch: one Node process serves the React client and the Socket.IO server.
# The server runs TypeScript directly (Node type stripping): only the client is built.

# ---------- build: install everything, build client/dist ----------
FROM node:26-slim AS build
WORKDIR /app
# Node 26 no longer ships corepack: install the pinned pnpm (package.json packageManager)
RUN npm install -g pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src src
COPY server server
COPY client client
RUN pnpm build

# ---------- deps: production dependencies of the server only ----------
FROM node:26-slim AS deps
WORKDIR /app
RUN npm install -g pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --prod --filter dutch-server

# ---------- runtime: no pnpm, no store, only what the server runs ----------
FROM node:26-slim
WORKDIR /app
COPY package.json ./
COPY server/package.json server/
# pnpm links server/node_modules into the root node_modules/.pnpm: copy both
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/server/node_modules server/node_modules
# The server imports the rules library from ../../src at runtime
COPY src src
COPY server/src server/src
COPY --from=build /app/client/dist client/dist

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 CLIENT_DIR=client/dist
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server/src/index.ts"]
