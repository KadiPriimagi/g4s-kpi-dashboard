"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { apiRequest } from "@/lib/client-api";
import { CHANNELS, TARGET_METRICS, TARGET_METRIC_LABELS, type TargetMetric } from "@/lib/constants";
import { addMonths, formatMonthLabel, monthOf, todayTallinn } from "@/lib/dates";
import { formatCPL, formatEUR, formatNumber, formatPercent } from "@/lib/format";
import type { TargetDTO } from "@/lib/records";

function formatTargetValue(metric: string, value: number) {
  switch (metric) {
    case "cost":
      return formatEUR(value);
    case "cpl":
      return formatCPL(value);
    case "conversionRate":
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}

type FormState = { id?: number; metric: TargetMetric; channel: string; month: string; value: string };

export function TargetsManager({ targets }: { targets: TargetDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");

  const months = [...new Set(targets.map((t) => t.month))].sort().reverse();
  const visible = monthFilter === "all" ? targets : targets.filter((t) => t.month === monthFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[200px] bg-card" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setForm({ metric: "leads", channel: "All", month: monthOf(todayTallinn()), value: "" })}>
          <Plus />
          Add target
        </Button>
      </div>

      <Card className="py-0 shadow-sm">
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No targets yet. Add the first one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Month</TableHead>
                  <TableHead className="px-4">Metric</TableHead>
                  <TableHead className="px-4">Channel</TableHead>
                  <TableHead className="px-4 text-right">Target</TableHead>
                  <TableHead className="w-24 px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="px-4">{formatMonthLabel(t.month)}</TableCell>
                    <TableCell className="px-4 font-medium">{TARGET_METRIC_LABELS[t.metric as TargetMetric] ?? t.metric}</TableCell>
                    <TableCell className="px-4">
                      {t.channel === "All" ? <Badge variant="secondary">All channels</Badge> : t.channel}
                    </TableCell>
                    <TableCell className="px-4 text-right tabular-nums">{formatTargetValue(t.metric, t.value)}</TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit"
                          className="text-muted-foreground"
                          onClick={() => setForm({ id: t.id, metric: t.metric as TargetMetric, channel: t.channel, month: t.month, value: String(t.value) })}
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDelete
                          title="Delete target?"
                          description={`${TARGET_METRIC_LABELS[t.metric as TargetMetric]} · ${t.channel === "All" ? "All channels" : t.channel} · ${formatMonthLabel(t.month)}`}
                          onConfirm={async () => {
                            await apiRequest("DELETE", `/api/targets/${t.id}`);
                            router.refresh();
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {form && (
        <TargetDialog
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function TargetDialog({ initial, onClose, onSaved }: { initial: FormState; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thisMonth = monthOf(todayTallinn());
  // Offer the last 6 and next 12 months (plus the edited month if it's outside that window).
  const monthOptions = Array.from({ length: 19 }, (_, i) => addMonths(thisMonth, 12 - i));
  if (!monthOptions.includes(f.month)) monthOptions.push(f.month);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { metric: f.metric, channel: f.channel, month: f.month, value: f.value };
      if (f.id) await apiRequest("PUT", `/api/targets/${f.id}`, body);
      else await apiRequest("POST", "/api/targets", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  const unit = f.metric === "cost" || f.metric === "cpl" ? "EUR" : f.metric === "conversionRate" ? "%" : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{f.id ? "Edit target" : "Add target"}</DialogTitle>
            <DialogDescription>Monthly target for one metric and channel.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Metric</Label>
              <Select value={f.metric} onValueChange={(v) => setF({ ...f, metric: v as TargetMetric })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {TARGET_METRIC_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={f.channel} onValueChange={(v) => setF({ ...f, channel: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All channels</SelectItem>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={f.month} onValueChange={(v) => setF({ ...f, month: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.sort().reverse().map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="target-value">Target value {unit && <span className="text-muted-foreground">({unit})</span>}</Label>
              <Input
                id="target-value"
                inputMode="decimal"
                value={f.value}
                onChange={(e) => setF({ ...f, value: e.target.value })}
                placeholder={f.metric === "conversionRate" ? "e.g. 2.0" : f.metric === "cpl" ? "e.g. 15" : "e.g. 750"}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
