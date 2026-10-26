# CLAUDE.md

## Deployment

- This web app runs on **Railway**, not on the local computer.
- Railway deploys the app automatically from the `main` branch of this GitHub repo (`KadiPriimagi/g4s-kpi-dashboard`).
- **Note:** The Railway project is not connected yet because Railway sign-ups are temporarily paused. For now, pushing to GitHub is enough.

## Database

- The database is a **Railway PostgreSQL** database.
- It is available only through the `DATABASE_URL` environment variable on Railway.

## Rules

- Do **not** set up a local database.
- Do **not** run a local server.
- Before every push, run `npm run build` to make sure the app builds.
- After each finished task, commit and push to GitHub so that Railway deploys the new version.
