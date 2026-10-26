"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CAMPAIGNS, campaignLabel } from "@/lib/constants";
import { formatDateLabel, yesterdayTallinn } from "@/lib/dates";
import { parseFilters } from "@/lib/filters";

/** Pages that manage records and don't use the global filters. */
const PAGES_WITHOUT_FILTERS = ["/targets", "/costs"];

export function FilterBar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const filters = parseFilters(Object.fromEntries(params.entries()));
  const [customOpen, setCustomOpen] = useState(filters.range === "custom");
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);

  if (PAGES_WITHOUT_FILTERS.some((p) => pathname.startsWith(p))) return null;

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function onRangeChange(value: string) {
    if (value === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    update({ range: value, from: null, to: null });
  }

  const maxDate = yesterdayTallinn();
  const sameYear = filters.from.slice(0, 4) === filters.to.slice(0, 4);
  const periodLabel = `${formatDateLabel(filters.from, sameYear ? undefined : { day: "numeric", month: "short", year: "numeric" })} – ${formatDateLabel(filters.to, { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <Select value={customOpen ? "custom" : filters.range} onValueChange={onRangeChange}>
        <SelectTrigger className="w-[150px] bg-card" aria-label="Date range">
          <CalendarDays className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {customOpen && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to && from <= to) update({ range: "custom", from, to });
          }}
        >
          <Input type="date" value={from} max={to || maxDate} onChange={(e) => setFrom(e.target.value)} className="w-[150px] bg-card" aria-label="From date" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={to} min={from} max={maxDate} onChange={(e) => setTo(e.target.value)} className="w-[150px] bg-card" aria-label="To date" />
          <Button type="submit" size="sm" disabled={!from || !to || from > to}>
            Apply
          </Button>
        </form>
      )}

      <Select value={filters.campaign ?? "all"} onValueChange={(v) => update({ campaign: v === "all" ? null : v })}>
        <SelectTrigger className="w-[200px] bg-card" aria-label="Campaign">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All campaigns</SelectItem>
          {CAMPAIGNS.map((c) => (
            <SelectItem key={c} value={c}>
              {campaignLabel(c)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.language ?? "all"} onValueChange={(v) => update({ lang: v === "all" ? null : v })}>
        <SelectTrigger className="w-[140px] bg-card" aria-label="Language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All languages</SelectItem>
          <SelectItem value="ET">Estonian</SelectItem>
          <SelectItem value="RU">Russian</SelectItem>
        </SelectContent>
      </Select>

      <span className="ml-auto hidden text-sm text-muted-foreground md:inline">{periodLabel}</span>
    </div>
  );
}
