# G4S Marketing KPI Dashboard

Marketing KPI dashboard for G4S Eesti, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts,
Prisma + PostgreSQL and Google Gemini. It runs on **Railway** and uses **demo data only**.

See [SPEC.md](SPEC.md) for the full specification and the decisions behind the cost, target and demo-data logic.

## Pages

Overview · Channels · Funnel · Traffic Sources · Targets · Costs · AI Summary

## Railway setup

1. Create a Railway project from this GitHub repo (`main` branch is deployed automatically).
2. Add a **PostgreSQL** database to the project.
3. In the web service, set these variables:

| Variable | Required | Value |
| --- | --- | --- |
| `DATABASE_URL` | yes | Reference the Postgres service: `${{Postgres.DATABASE_URL}}` |
| `APP_PASSWORD` | yes | The dashboard login password |
| `GEMINI_API_KEY` | no | Google AI Studio API key. Without it, AI summaries are labelled mock summaries. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |

4. Generate a public domain for the web service (Settings → Networking).

Railway runs `npm run build` (`prisma generate && next build`) and then `npm start`, which applies migrations
(`prisma migrate deploy`), creates or tops up the demo data, and starts Next.js on `PORT`.

## Demo data

On every start the seed step checks the database: if it is empty it creates 120 days of data up to yesterday; otherwise it
adds the missing days. User-created costs, targets and AI summaries are never changed.
