"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHANNELS } from "@/lib/constants";

export function ChannelSelect({ value }: { value: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "all") next.delete("channel");
    else next.set("channel", v);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] bg-card" aria-label="Channel">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All channels</SelectItem>
        {CHANNELS.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
