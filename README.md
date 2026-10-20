# estim8.com

Distributed planning poker, written with assistance from Claude.

A felt-table-style planning poker app: facilitators create accounts, set up sessions with
discussion topics (and reference documents), invite up to 10 players per session via email or
a shared link, and run live estimation rounds with real-time reveal, consensus tracking, and a
saved `Results.md` per topic. Sessions are not meant as permanent storage — they auto-delete 7
days after completion (or after 30 days of inactivity on an unfinished session).

## Stack

- **Client**: React + TypeScript (Vite), React Router, TanStack Query, Socket.IO client
- **Server**: Node.js + Express + TypeScript, Socket.IO, `mysql2` (no ORM), Nodemailer
- **Database**: MariaDB
- **Deployment**: Docker Compose (app container + MariaDB + nginx + certbot) on a single VPS

## Repository layout

```
estim8.com/
├── shared/   # TS types/constants shared between client and server (socket events, deck types)
├── server/   # Express + Socket.IO API, migrations, business logic
├── client/   # React SPA
└── docker/   # nginx + certbot config for production deployment
```

## Local development

Requires Node 20+, npm, and a MariaDB instance (local, Docker, or remote).

1. Copy `.env.example` to `.env` (repo root) **and** to `server/.env`, and fill in real values —
   at minimum `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` for your MariaDB instance.
   Leave `SMTP_HOST` blank during development: emails are logged to the server console instead
   of sent, which is enough to grab verification links/codes while testing.
2. Install dependencies and build the shared package:
   ```
   npm install
   npm run build:shared
   ```
3. Run database migrations:
   ```
   npm run migrate
   ```
   (Migrations also run automatically every time the server starts.)
4. Start the backend and frontend in separate terminals:
   ```
   npm run dev:server   # http://localhost:4100 (or whatever PORT you set)
   npm run dev:client   # http://localhost:5173
   ```
   The Vite dev server proxies `/api` and `/socket.io` to the backend (see `client/vite.config.ts`,
   `VITE_DEV_API_TARGET` env var if your backend isn't on the default port), so just open
   `http://localhost:5173`.

## Setting up in IntelliJ IDEA

Node.js run/debug configurations require **IntelliJ IDEA Ultimate** or **WebStorm** (the Node.js
plugin isn't available in Community edition — you can still browse/edit the code there, just
without the run configs below).

1. **Open the repo root** (`estim8.com/`) as the project — it's an npm workspaces monorepo, and
   IntelliJ will detect `package.json` in the root, `client/`, `server/`, and `shared/` as
   separate npm contexts automatically.
2. **Enable the Node.js plugin**: `Settings/Preferences → Plugins → Marketplace`, search
   "Node.js", install it if it isn't already bundled, and restart.
3. **Point IntelliJ at your Node interpreter**: `Settings/Preferences → Languages & Frameworks →
   JavaScript Runtime` (in some IntelliJ versions this is under a separate "Node.js" page instead
   — look for whichever one has the Node interpreter dropdown) — it should auto-detect your
   system Node (20+); if not, browse to it manually.
4. **Env files**: make sure `.env` exists in both the repo root and `server/` (see
   [Local development](#local-development) above) — `dotenv/config` loads `server/.env` from the
   server's working directory automatically, so you don't need to duplicate variables inside the
   run configuration itself.
5. Install dependencies and build the shared package once from a terminal (Settings don't cover
   this step): `npm install && npm run build:shared`.

### Run configurations

Create these via `Run → Edit Configurations… → + → npm`:

| Name | package.json | Command | Scripts |
| --- | --- | --- | --- |
| Server: dev | `server/package.json` | `run` | `dev` |
| Client: dev | `client/package.json` | `run` | `dev` |

Each of these gets independent ▶ Run, ■ Stop, and 🐞 Debug buttons in the Run tool window —
clicking Debug on "Server: dev" attaches IntelliJ's Node debugger directly to the `tsx`-run
server (breakpoints in `.ts` files work as-is, no source-map setup needed).

To start/stop/debug **both at once** with one button: `Run → Edit Configurations… → + →
Compound`, name it something like "estim8: full stack", and add both "Server: dev" and "Client:
dev" to it. Running/stopping/debugging the compound config starts or stops both together.

Optional: for breakpoints in the React app itself (not just the server), add a `JavaScript
Debug` run configuration pointing at `http://localhost:5173` — this launches a debuggable browser
tab wired up to the Vite dev server's source maps.

### Database tool window (optional)

`View → Tool Windows → Database → +  → Data Source → MariaDB`, pointing at whatever
`DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` you set in `server/.env`, gives you a GUI
for inspecting/querying the schema while developing.

## Deploying to a Hostinger VPS with EasyPanel (Nixpacks)

`nixpacks.toml` at the repo root builds the whole monorepo into a single Node process: it runs
`npm run build`, copies the SQL migrations and the built client into `server/dist`, and starts
`node server/dist/index.js`. Express serves `/api`, Socket.IO, and the SPA from that one process,
and the server applies pending DB migrations automatically on startup. EasyPanel's proxy handles
HTTPS, so nginx/certbot are not used.

1. **Database**: in your EasyPanel project, create a **MariaDB** (or MySQL) service. Note its
   internal host name, database, user and password.
2. **App service**: create an App service, set the source to the GitLab repo (add an SSH
   deploy key or token) and the builder to **Nixpacks**.
3. **Environment** (App → Environment):
   ```
   NODE_ENV=production
   PORT=4000
   PUBLIC_URL=https://estim8.com
   CLIENT_ORIGIN=https://estim8.com
   DB_HOST=<mariadb service host>
   DB_PORT=3306
   DB_USER=...
   DB_PASSWORD=...
   DB_NAME=...
   COOKIE_SECRET=<openssl rand -hex 32>
   VERIFICATION_TICKET_SECRET=<openssl rand -hex 32>
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=noreply@estim8.com
   SMTP_PASSWORD=...
   SMTP_FROM="estim8 <noreply@estim8.com>"
   UPLOAD_ROOT=/app/uploads
   MAX_UPLOAD_MB=20
   ```
   `SMTP_FROM`'s address must match `SMTP_USER`'s mailbox or Hostinger rejects the mail.
4. **Volume**: add a persistent volume mounted at `/app/uploads` (topic files and generated
   `Results.md` files). Without it, uploads are lost on every redeploy.
5. **Domain**: App → Domains → add `estim8.com` (and `www`), proxy port `4000`, HTTPS on.
   Point the DNS A record at the VPS first.
6. Deploy. Later pushes redeploy via the EasyPanel Deploy button or a webhook.

The Docker Compose / nginx / certbot files (`docker-compose.yml`, `server/Dockerfile`,
`docker/`) are an alternative self-managed setup and aren't used by EasyPanel/Nixpacks.

## Brand assets

Favicons and logos in `repo_files/` are the source brand assets; the in-use copies live under
`client/public/` (favicons) and `client/src/assets/` (logos referenced by the app).
