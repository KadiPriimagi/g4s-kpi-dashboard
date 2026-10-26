# G4S Eesti Marketing KPI Dashboard — Specification

## Project

A fully functional, responsive marketing KPI dashboard web application for G4S Eesti, a security services company. The app runs on Railway (cloud hosting) with a Railway PostgreSQL database. Users open the app through its public Railway URL in desktop and mobile browsers; nothing runs on the developer's computer. The app uses realistic demo data (no real company data). The user interface language is English.

## Tech stack

- Framework: Next.js (App Router) with TypeScript.
- Styling: Tailwind CSS. Icons: Lucide-React. Components: shadcn/ui. Charts: Recharts.
- Database: PostgreSQL (hosted on Railway), accessed with the Prisma ORM.
- AI: Google Gemini API for written summaries. Key from `GEMINI_API_KEY`, model from `GEMINI_MODEL` (default `gemini-2.5-flash`). If the key is missing, return a clearly labelled mock summary instead of failing.
- Configuration: database connection string from `DATABASE_URL` (set in Railway). Never hard-code credentials. Provide `.env.example`; `.env` is in `.gitignore`.
- Access: simple password protection. Password from `APP_PASSWORD`. Login page; the user stays logged in with a secure cookie.
- `npm run build` must succeed **without** `DATABASE_URL`: every page and API route that reads the database is dynamic and nothing touches the database at build time.

## 1. Layout

- Sidebar (left, ~240px): Overview, Channels, Funnel, Traffic Sources, Targets, Costs, AI Summary. Collapsible hamburger menu on mobile.
- Main panel: top bar with global filters (date range presets: last 7 / 30 / 90 days, custom; campaign; language: All / Estonian / Russian) and the page content.

## 2. Pages

### A. Overview
- KPI cards: Leads, Conversion rate, Cost per lead (CPL), Total cost, Sessions. Each shows value, change vs. previous period (green/red arrow) and progress toward target if one exists.
- Line chart: daily leads and sessions for the selected period.

### B. Channels
- Table and bar chart by channel (Google PMax, Google Search, Meta, Organic Search, Direct, Email, Referral): sessions, leads, conversion rate, cost, CPL. Sortable columns.
- Highlight best and worst channel by CPL (only channels with cost).

### C. Funnel
- Stages: Sessions → Service page views → Form views → Form starts → Form submits (leads). Count and drop-off % between stages. Filterable by channel.

### D. Traffic Sources
- Donut chart and table of sessions by source/medium.

### E. Targets
- Manage monthly targets (metric, channel or "All", month, value). Add/edit/delete in a modal. Stored in DB and used on Overview.

### F. Costs
- Form to manually enter Meta ad costs (period, channel, campaign, language, amount EUR, note). List with edit and delete. Included in cost/CPL calculations.

### G. AI Summary
- "Generate summary" sends aggregated KPI data for the selected filters to Gemini: short performance summary, 3 most important findings, recommendations on which channels to invest more/less in.
- Each summary saved with its date range and filters; list of previous summaries.

## 3. Backend & database

Prisma models:
- `DailyMetric { id, date, channel, campaign, language, sessions, servicePageViews, formViews, formStarts, leads, cost }`
- `CostEntry { id, dateFrom, dateTo, channel, campaign, language, amount, note, isSeed, createdAt }`
- `Target { id, metric, channel, month, value, isSeed, createdAt }`
- `AiSummary { id, dateFrom, dateTo, filters (JSON), content, isMock, createdAt }`

- Campaigns: "Always-on PMax", "Always-on Search", "Autumn image campaign" (4 weeks, higher Meta and PMax activity). Languages: Estonian, Russian.
- API routes for metrics (aggregated by filters), costs, targets and AI summaries.
- `build` = `prisma generate && next build`; `start` = `prisma migrate deploy && <seed check> && next start`. Server listens on `PORT`.
- If the database or Gemini is unreachable, show a friendly error in the UI instead of crashing.

## 4. Design

Modern, clean business dashboard. Slate neutrals, dark red primary accent, green/red up/down indicators. Rounded corners, subtle shadows and borders. Numbers: thousand separators, EUR format, percentages with one decimal.

---

## Decisions (from the planning interview, 2026-10-26)

### Costs
- **Google PMax** and **Google Search**: cost comes from `DailyMetric.cost` (as if imported automatically).
- **Meta**: cost comes **only** from `CostEntry` (agency invoices). `DailyMetric.cost` is 0 for Meta.
- **Email, Organic Search, Direct, Referral**: no cost. CPL is shown as "–" whenever cost is 0.
- Total cost = Σ `DailyMetric.cost` + Σ allocated `CostEntry.amount` — the sources never overlap by channel, so there is no double counting.
- `CostEntry` covers a period (`dateFrom`–`dateTo`, equal for a single day). The amount is spread evenly per day; a filter period includes only overlapping days.
- `CostEntry.language` = `ET` | `RU` | `BOTH` (default `BOTH`). Language-specific entries count only for that language. `BOTH` entries are split per day by that language's share of Meta sessions for the same campaign (fallback: all Meta sessions that day; fallback 50/50).

### Targets
- Monthly targets are prorated per day for any date range: Σ over months (target ÷ days in month × days of range in that month) for count metrics (leads, sessions, cost).
- Rate metrics (conversion rate, CPL) use the day-weighted average of monthly target values.
- When a campaign or language filter is active, target progress is hidden with the note "Targets apply to all campaigns and languages".

### Demo data
- At startup (after `prisma migrate deploy`), a check-and-seed step runs: if the DB is empty, it generates 120 days up to yesterday; otherwise it tops up missing days up to yesterday. User-created costs, targets and summaries are never touched.
- Generation is deterministic per date (seeded random), so restarts give the same numbers.
- The Autumn image campaign has fixed dates set on first seed (inside the initial 120-day window).
- The seed also creates monthly Meta cost entries (`isSeed = true`) and example targets.

### Smaller details
- Conversion rate = leads ÷ sessions.
- Previous period = the same number of days immediately before the selected range.
- Auth: signed httpOnly secure cookie (HMAC of `APP_PASSWORD`), 30 days, checked in middleware; logout button.
- Only aggregated numbers are sent to Gemini.

### Implementation notes (additions made while building)
- `DailyMetric` also has `source` and `medium` columns, needed for the Traffic Sources page.
- Campaigns: besides the three in the spec, Meta has a baseline campaign **"Always-on Meta"**, and non-paid traffic uses the campaign `(none)` (shown as "No campaign (organic)").
- The cost form only allows channel **Meta** and the campaigns "Always-on Meta" / "Autumn image campaign", so manual costs can never double-count Google costs.
- Change vs. previous period is hidden ("No comparison data") when the previous period starts before the first day of demo data.
- Targets are shown on Overview for channel "All"; channel-specific targets are stored and managed on the Targets page.
