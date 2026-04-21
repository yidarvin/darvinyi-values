# darvinyi-values

A personal values sorting tool. Rate 107 values by importance, save progress across sessions, and track how your priorities shift over time.

## Local development

### API

```bash
cd api
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
npm install
npm start   # migrates, seeds, then starts server on :3001
```

### Web

```bash
cd web
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001
npm install
npm run dev   # starts on :5173
```

## Deploy (Railway)

1. Push repo to GitHub
2. Create a new Railway project → "Deploy from GitHub repo"
3. Add a PostgreSQL plugin to the project
4. Create two services:
   - **values-api** → root directory: `api`, start: `node index.js`
   - **values-web** → root directory: `web`, build: `npm run build`, start: `npx vite preview --host --port $PORT`
5. Set env vars on `values-api`:
   - `DATABASE_URL` (auto-set by Railway Postgres plugin)
   - `JWT_SECRET` (any long random string)
   - `FRONTEND_URL` (Railway URL for the web service, or `https://values.darvinyi.com`)
   - `NODE_ENV=production`
6. Set env vars on `values-web`:
   - `VITE_API_URL` (Railway URL for the API service)
7. Add custom domain `values.darvinyi.com` to the web service in Railway settings

The `start` script in `api/package.json` runs migrations and seeding automatically on every deploy — no manual steps needed.
