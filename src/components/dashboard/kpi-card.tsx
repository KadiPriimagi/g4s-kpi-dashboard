import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatSignedPercent, formatSignedPoints } from "@/lib/format";

export interface KpiChange {
  value: number | null;
  /** "points" = percentage points (for rates shown in %). */
  unit: "percent" | "points";
  /** Whether an increase is good (green) or bad (red). */
  goodWhen: "up" | "down";
}

export interface KpiTarget {
  /** "progress" shows a bar (counts / budget); "threshold" shows only the status (rates). */
  kind: "progress" | "threshold";
  actual: number | null;
  target: number;
  targetLabel: string;
  goodWhen: "up" | "down";
}

export function KpiCard({
  title,
  icon: Icon,
  value,
  change,
  previousLabel,
  target,
}: {
  title: string;
  icon: LucideIcon;
  value: string;
  change: KpiChange;
  previousLabel: string;
  target?: KpiTarget | null;
}) {
  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <ChangeLine change={change} previousLabel={previousLabel} />
        {target && <TargetLine target={target} />}
      </CardContent>
    </Card>
  );
}

function ChangeLine({ change, previousLabel }: { change: KpiChange; previousLabel: string }) {
  if (change.value == null) {
    return <p className="mt-1 text-xs text-muted-foreground">No comparison data</p>;
  }
  const flat = Math.abs(change.value) < 0.05;
  const up = change.value > 0;
  const good = flat ? null : (up && change.goodWhen === "up") || (!up && change.goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
          good === null && "bg-muted text-muted-foreground",
          good === true && "bg-positive/10 text-positive",
          good === false && "bg-negative/10 text-negative",
        )}
      >
        <Icon className="size-3.5" />
        {change.unit === "points" ? formatSignedPoints(change.value) : formatSignedPercent(change.value)}
      </span>
      {previousLabel}
    </p>
  );
}

function TargetLine({ target }: { target: KpiTarget }) {
  const { actual, goodWhen } = target;
  if (actual == null) {
    return <p className="mt-auto pt-4 text-xs text-muted-foreground">Target {target.targetLabel}</p>;
  }
  const ratio = target.target > 0 ? actual / target.target : 0;
  const good = goodWhen === "up" ? ratio >= 1 : ratio <= 1;

  if (target.kind === "threshold") {
    return (
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        <span className="text-muted-foreground">Target {target.targetLabel}</span>
        <span className={cn("font-medium", good ? "text-positive" : "text-negative")}>
          {good ? "On target" : goodWhen === "up" ? "Below target" : "Above target"}
        </span>
      </div>
    );
  }

  const pct = Math.round(ratio * 1000) / 10;
  return (
    <div className="mt-auto pt-4">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          {goodWhen === "down" ? "Budget" : "Target"} {target.targetLabel}
        </span>
        <span className={cn("font-medium tabular-nums", goodWhen === "down" ? (good ? "text-foreground" : "text-negative") : good ? "text-positive" : "text-foreground")}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            goodWhen === "down" ? (good ? "bg-slate-500" : "bg-negative") : good ? "bg-positive" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
