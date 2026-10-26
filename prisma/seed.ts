// Check-and-seed step, run at startup after `prisma migrate deploy`.
// - Empty database: generate DEMO_DAYS days of demo data up to yesterday.
// - Otherwise: top up missing days up to yesterday.
// User-created costs, targets and summaries are never touched.
import { PrismaClient } from "@prisma/client";
import { DEMO_DAYS, type Language } from "../src/lib/constants";
import {
  addDays,
  addMonths,
  daysInMonth,
  eachDay,
  monthEnd,
  monthOf,
  monthStart,
  overlap,
  parseISODate,
  toISODate,
  yesterdayTallinn,
} from "../src/lib/dates";
import { autumnWindow, generateDay } from "./demo-data";

const prisma = new PrismaClient();

async function insertDays(firstDay: string, from: string, to: string) {
  const days = eachDay(from, to);
  let batch: ReturnType<typeof generateDay>["rows"] = [];
  let total = 0;
  const flush = async () => {
    if (!batch.length) return;
    await prisma.dailyMetric.createMany({
      data: batch.map((r) => ({ ...r, date: parseISODate(r.date) })),
    });
    total += batch.length;
    batch = [];
  };
  for (const day of days) {
    batch.push(...generateDay(day, firstDay).rows);
    if (batch.length >= 2000) await flush();
  }
  await flush();
  return total;
}

function metaSpend(firstDay: string, campaign: string, from: string, to: string, language: Language | "BOTH") {
  let sum = 0;
  for (const day of eachDay(from, to)) {
    const spend = generateDay(day, firstDay).metaSpend[campaign];
    if (!spend) continue;
    sum += language === "BOTH" ? spend.ET + spend.RU : spend[language];
  }
  return Math.round(sum * 100) / 100;
}

/** (Re)creates the seed Meta cost entries for every month from `fromMonth` up to yesterday's month. */
async function seedCosts(firstDay: string, fromMonth: string, yesterday: string) {
  const [aStart, aEnd] = autumnWindow(firstDay);
  const plans: { campaign: string; window: [string, string]; languages: (Language | "BOTH")[]; note: string }[] = [
    { campaign: "Always-on Meta", window: [firstDay, yesterday], languages: ["BOTH"], note: "Monthly invoice from media agency" },
    { campaign: "Autumn image campaign", window: [aStart, aEnd], languages: ["ET", "RU"], note: "Agency report, split by language" },
  ];

  for (let m = fromMonth; m <= monthOf(yesterday); m = addMonths(m, 1)) {
    for (const plan of plans) {
      const period = overlap(monthStart(m), monthEnd(m), plan.window[0], plan.window[1]);
      const clipped = period && overlap(period[0], period[1], firstDay, yesterday);
      if (!clipped) continue;
      const [from, to] = clipped;

      // Respect user-entered (or user-edited) costs for this campaign and month.
      const userEntries = await prisma.costEntry.count({
        where: {
          isSeed: false,
          channel: "Meta",
          campaign: plan.campaign,
          dateFrom: { lte: parseISODate(monthEnd(m)) },
          dateTo: { gte: parseISODate(monthStart(m)) },
        },
      });
      if (userEntries > 0) continue;

      await prisma.costEntry.deleteMany({
        where: {
          isSeed: true,
          campaign: plan.campaign,
          dateFrom: { gte: parseISODate(monthStart(m)), lte: parseISODate(monthEnd(m)) },
        },
      });
      for (const language of plan.languages) {
        await prisma.costEntry.create({
          data: {
            dateFrom: parseISODate(from),
            dateTo: parseISODate(to),
            channel: "Meta",
            campaign: plan.campaign,
            language,
            amount: metaSpend(firstDay, plan.campaign, from, to, language),
            note: plan.note,
            isSeed: true,
          },
        });
      }
    }
  }
}

/** Adds example targets for months (up to next month) that have no targets at all. */
async function seedTargets(firstDay: string, yesterday: string) {
  const [aStart, aEnd] = autumnWindow(firstDay);
  const lastMonth = addMonths(monthOf(yesterday), 1);
  for (let m = monthOf(firstDay); m <= lastMonth; m = addMonths(m, 1)) {
    if ((await prisma.target.count({ where: { month: m } })) > 0) continue;
    const days = daysInMonth(m);
    const season = [0.95, 0.97, 1, 1, 0.98, 0.93, 0.88, 0.95, 1.03, 1.06, 1.04, 0.92][Number(m.slice(5, 7)) - 1];
    const autumnDays = (() => {
      const o = overlap(monthStart(m), monthEnd(m), aStart, aEnd);
      return o ? eachDay(o[0], o[1]).length : 0;
    })();
    const targets: { metric: string; channel: string; value: number }[] = [
      { metric: "leads", channel: "All", value: Math.round(days * 26 * season + autumnDays * 6) },
      { metric: "sessions", channel: "All", value: Math.round((days * 1250 * season + autumnDays * 600) / 100) * 100 },
      { metric: "cost", channel: "All", value: Math.round((days * 390 + autumnDays * 230) / 100) * 100 },
      { metric: "cpl", channel: "All", value: 15 },
      { metric: "conversionRate", channel: "All", value: 2.0 },
      { metric: "leads", channel: "Google Search", value: Math.round(days * 7 * season) },
    ];
    await prisma.target.createMany({
      data: targets.map((t) => ({ ...t, month: m, isSeed: true })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[seed] DATABASE_URL is not set, skipping demo data check.");
    return;
  }
  const yesterday = yesterdayTallinn();
  const agg = await prisma.dailyMetric.aggregate({ _min: { date: true }, _max: { date: true } });

  let firstDay: string;
  let fromDay: string;
  if (!agg._max.date || !agg._min.date) {
    firstDay = addDays(yesterday, -(DEMO_DAYS - 1));
    fromDay = firstDay;
    console.log(`[seed] Empty database, generating demo data ${firstDay} → ${yesterday}`);
  } else {
    firstDay = toISODate(agg._min.date);
    fromDay = addDays(toISODate(agg._max.date), 1);
  }

  if (fromDay > yesterday) {
    console.log("[seed] Demo data is up to date.");
  } else {
    const rows = await insertDays(firstDay, fromDay, yesterday);
    console.log(`[seed] Inserted ${rows} daily metric rows (${fromDay} → ${yesterday}).`);
    await seedCosts(firstDay, monthOf(fromDay), yesterday);
    console.log("[seed] Meta cost entries updated.");
  }
  await seedTargets(firstDay, yesterday);
}

main()
  .catch((err) => {
    // Never block the app from starting because of the demo data step.
    console.error("[seed] Demo data step failed:", err);
  })
  .finally(() => prisma.$disconnect());
