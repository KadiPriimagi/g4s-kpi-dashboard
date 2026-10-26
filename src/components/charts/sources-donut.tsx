"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.62 0.12 25)",
  "oklch(0.55 0.08 230)",
  "oklch(0.85 0.01 250)",
];

export function SourcesDonut({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={1.5} stroke="none">
              {data.map((d, i) => (
                <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [`${formatNumber(Number(v))} (${formatPercent((Number(v) / total) * 100)})`, name]}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{formatNumber(total)}</span>
          <span className="text-xs text-muted-foreground">sessions</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{formatPercent((d.value / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
