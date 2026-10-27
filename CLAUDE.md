# CLAUDE.md

## Deployment

- This web app runs on **Render**, not on the local computer: https://g4s-kpi-dashboard.onrender.com
- Render deploys the app automatically from the `main` branch of this GitHub repo (`KadiPriimagi/g4s-kpi-dashboard`).
- Build command: `npm install && npm run build`. Start command: `npm start`.
- The free Render instance sleeps after 15 minutes of inactivity, so the first request can take about a minute.

## Database

- The database is a **Render PostgreSQL** database.
- It is available only through the `DATABASE_URL` environment variable on Render.

## Rules

- Do **not** set up a local database.
- Do **not** run a local server.
- Before every push, run `npm run build` to make sure the app builds.
- After each finished task, commit and push to GitHub so that Render deploys the new version.
