# --- Stage 1: build the shared package ---
FROM node:20-alpine AS shared-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared ./shared
RUN npm install --workspace shared --include-workspace-root
RUN npm run build --workspace shared

# --- Stage 2: build the client (Vite) SPA ---
FROM node:20-alpine AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared ./shared
COPY client ./client
COPY --from=shared-build /app/shared/dist ./shared/dist
RUN npm install --workspace client --workspace shared --include-workspace-root
RUN npm run build --workspace client

# --- Stage 3: build the server (TypeScript) ---
FROM node:20-alpine AS server-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared ./shared
COPY server ./server
COPY --from=shared-build /app/shared/dist ./shared/dist
RUN npm install --workspace server --workspace shared --include-workspace-root
RUN npm run build --workspace server

# --- Stage 4: slim runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json
RUN npm install --workspace server --workspace shared --include-workspace-root --omit=dev
COPY --from=shared-build /app/shared/dist ./shared/dist
COPY --from=server-build /app/server/dist ./server/dist
COPY server/src/db/migrations ./server/dist/db/migrations
COPY --from=client-build /app/client/dist ./server/dist/public

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
