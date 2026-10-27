# G4S Marketing KPI Dashboard

Marketing KPI dashboard for G4S Eesti, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts,
Prisma + PostgreSQL and Google Gemini. It runs on **Render** and uses **demo data only**.

See [SPEC.md](SPEC.md) for the full specification and the decisions behind the cost, target and demo-data logic.

## Pages

Overview · Channels · Funnel · Traffic Sources · Targets · Costs · AI Summary

## Render setup

The app is deployed on Render: https://g4s-kpi-dashboard.onrender.com

1. Create a Render **Web Service** from this GitHub repo; the `main` branch is deployed automatically.
2. Create a Render **PostgreSQL** database.
3. Configure the web service:

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |

4. Set these environment variables on the web service:

| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | yes | The Render PostgreSQL connection string (Internal Database URL) |
| `APP_PASSWORD` | yes | The dashboard login password |
| `GEMINI_API_KEY` | no | Google AI Studio API key. Without it, AI summaries are labelled mock summaries. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |

`npm run build` runs `prisma generate && next build`. `npm start` applies migrations (`prisma migrate deploy`), creates
or tops up the demo data, and starts Next.js on `PORT`. The database is available only through `DATABASE_URL` on Render.

The free Render instance sleeps after 15 minutes of inactivity, so the first request after a pause can take about a
minute.

## Demo data

On every start the seed step checks the database: if it is empty it creates 120 days of data up to yesterday; otherwise it
adds the missing days. User-created costs, targets and AI summaries are never changed.
