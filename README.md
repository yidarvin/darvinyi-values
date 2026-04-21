# darvinyi-values

A personal values sorting tool. Rate 107 values by importance, save progress across sessions, and track how your priorities shift over time.

## How it works

Express serves both the API (`/api/*`) and the built React frontend as static files — one process, one port, one Railway service.

## Local development

```bash
# 1. Install everything
npm install
npm run build        # builds the React app into web/dist

# 2. Set env vars
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

# 3. Start
npm start            # migrates DB, seeds values, starts server on :3001
```

For frontend hot-reload during development, run in two terminals:

```bash
# Terminal 1 — API server
node index.js

# Terminal 2 — Vite dev server (proxies /api to :3001)
cd web && npm run dev
```

Then open http://localhost:5173.

## Deploy to Railway

1. Push this repo to GitHub
2. Go to Railway → New Project → Deploy from GitHub repo → select this repo
3. Add a **PostgreSQL** plugin to the project
4. Railway auto-detects the root `package.json` and `railway.toml`
5. Set two environment variables on the service:
   - `JWT_SECRET` — any long random string
   - `DATABASE_URL` — auto-filled by the Postgres plugin (copy the value from the plugin's "Connect" tab if not auto-linked)
6. Deploy — Railway runs `npm run build` then `npm start`
7. (Optional) Add a custom domain in the Railway service settings → `values.darvinyi.com`

Every `git push` to your main branch triggers an automatic redeploy.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (set by Railway Postgres plugin) |
| `JWT_SECRET` | Yes | Secret for signing JWTs — any random string |
| `PORT` | No | Defaults to 3001 |
| `NODE_ENV` | No | Set to `production` in Railway |
