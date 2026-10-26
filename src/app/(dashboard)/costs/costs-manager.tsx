"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { apiRequest } from "@/lib/client-api";
import { LANGUAGE_LABELS, MANUAL_COST_CAMPAIGNS, MANUAL_COST_CHANNELS } from "@/lib/constants";
import { daysBetween, formatDateLabel, yesterdayTallinn } from "@/lib/dates";
import { formatEUR } from "@/lib/format";
import type { CostDTO } from "@/lib/records";

type FormState = {
  id?: number;
  dateFrom: string;
  dateTo: string;
  channel: string;
  campaign: string;
  language: string;
  amount: string;
  note: string;
};

const fullDate = { day: "numeric", month: "short", year: "numeric" } as const;

function periodLabel(from: string, to: string) {
  if (from === to) return formatDateLabel(from, fullDate);
  return `${formatDateLabel(from, from.slice(0, 4) === to.slice(0, 4) ? undefined : fullDate)} – ${formatDateLabel(to, fullDate)}`;
}

export function CostsManager({ costs }: { costs: CostDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const total = costs.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex max-w-2xl items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          Google PMax and Google Search costs are imported automatically. Only Meta costs are entered here. If the agency
          reports one amount for both languages, choose “Both” and it is split by each language’s share of Meta sessions.
        </p>
        <Button
          onClick={() =>
            setForm({
              dateFrom: yesterdayTallinn(),
              dateTo: yesterdayTallinn(),
              channel: MANUAL_COST_CHANNELS[0],
              campaign: MANUAL_COST_CAMPAIGNS[0],
              language: "BOTH",
              amount: "",
              note: "",
            })
          }
        >
          <Plus />
          Add cost
        </Button>
      </div>

      <Card className="py-0 shadow-sm">
        <CardContent className="p-0">
          {costs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No manual costs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Period</TableHead>
                  <TableHead className="px-4">Channel</TableHead>
                  <TableHead className="px-4">Campaign</TableHead>
                  <TableHead className="px-4">Language</TableHead>
                  <TableHead className="px-4 text-right">Amount</TableHead>
                  <TableHead className="px-4">Note</TableHead>
                  <TableHead className="w-24 px-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="px-4 whitespace-nowrap">
                      {periodLabel(c.dateFrom, c.dateTo)}
                      <span className="block text-xs text-muted-foreground">
                        {daysBetween(c.dateFrom, c.dateTo)} day{daysBetween(c.dateFrom, c.dateTo) === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">{c.channel}</TableCell>
                    <TableCell className="px-4">{c.campaign}</TableCell>
                    <TableCell className="px-4">
                      <Badge variant="secondary">{LANGUAGE_LABELS[c.language] ?? c.language}</Badge>
                    </TableCell>
                    <TableCell className="px-4 text-right font-medium tabular-nums">{formatEUR(c.amount, 2)}</TableCell>
                    <TableCell className="max-w-[240px] truncate px-4 text-muted-foreground" title={c.note ?? undefined}>
                      {c.note ?? "–"}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit"
                          className="text-muted-foreground"
                          onClick={() =>
                            setForm({
                              id: c.id,
                              dateFrom: c.dateFrom,
                              dateTo: c.dateTo,
                              channel: c.channel,
                              campaign: c.campaign,
                              language: c.language,
                              amount: String(c.amount),
                              note: c.note ?? "",
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDelete
                          title="Delete cost entry?"
                          description={`${c.campaign} · ${periodLabel(c.dateFrom, c.dateTo)} · ${formatEUR(c.amount, 2)}`}
                          onConfirm={async () => {
                            await apiRequest("DELETE", `/api/costs/${c.id}`);
                            router.refresh();
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="px-4" colSpan={4}>
                    Total ({costs.length} entries)
                  </TableCell>
                  <TableCell className="px-4 text-right tabular-nums">{formatEUR(total, 2)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {form && (
        <CostDialog
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

function CostDialog({ initial, onClose, onSaved }: { initial: FormState; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id, ...body } = f;
      if (id) await apiRequest("PUT", `/api/costs/${id}`, body);
      else await apiRequest("POST", "/api/costs", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{f.id ? "Edit cost" : "Add cost"}</DialogTitle>
            <DialogDescription>For a single day, use the same start and end date.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cost-from">From</Label>
              <Input
                id="cost-from"
                type="date"
                value={f.dateFrom}
                onChange={(e) => setF({ ...f, dateFrom: e.target.value, dateTo: f.dateTo < e.target.value ? e.target.value : f.dateTo })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-to">To</Label>
              <Input id="cost-to" type="date" value={f.dateTo} min={f.dateFrom} onChange={(e) => setF({ ...f, dateTo: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={f.channel} onValueChange={(v) => setF({ ...f, channel: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_COST_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={f.language} onValueChange={(v) => setF({ ...f, language: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOTH">Both (split by sessions)</SelectItem>
                  <SelectItem value="ET">Estonian</SelectItem>
                  <SelectItem value="RU">Russian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Campaign</Label>
              <Select value={f.campaign} onValueChange={(v) => setF({ ...f, campaign: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_COST_CAMPAIGNS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cost-amount">Amount (EUR)</Label>
              <Input
                id="cost-amount"
                inputMode="decimal"
                placeholder="e.g. 1250.00"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cost-note">Note</Label>
              <Textarea
                id="cost-note"
                rows={2}
                maxLength={500}
                placeholder="e.g. Invoice no. 2026-118 from the media agency"
                value={f.note}
                onChange={(e) => setF({ ...f, note: e.target.value })}
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
