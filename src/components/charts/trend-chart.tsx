"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateLabel } from "@/lib/dates";
import { formatNumber } from "@/lib/format";

export function TrendChart({ data }: { data: { date: string; leads: number; sessions: number }[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatDateLabel(d)}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="leads"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="sessions"
            orientation="right"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => formatNumber(v)}
          />
          <Tooltip
            labelFormatter={(d) => formatDateLabel(String(d), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            formatter={(v, name) => [formatNumber(Number(v)), name]}
            contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="leads" type="monotone" dataKey="leads" name="Leads" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
          <Line yAxisId="sessions" type="monotone" dataKey="sessions" name="Sessions" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
