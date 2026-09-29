"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Deal, Contact } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type DealWithContact = Deal & { contact: Contact };

const STAGES = ["NEW", "CONTACTED", "PROPOSAL", "WON", "LOST"] as const;
const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  PROPOSAL: "Proposal",
  WON: "Won",
  LOST: "Lost",
};

export default function DealPipelineClient({ initialDeals }: { initialDeals: DealWithContact[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const [dragId, setDragId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const grouped: Record<string, DealWithContact[]> = Object.fromEntries(STAGES.map((s) => [s, []]));
    for (const d of deals) grouped[d.stage]?.push(d);
    return grouped;
  }, [deals]);

  async function moveStage(id: string, stage: string) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: stage as Deal["stage"] } : d)));
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      // revert on failure
      setDeals((prev) => prev.map((d) => (d.id === id ? (initialDeals.find((o) => o.id === id) ?? d) : d)));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-foreground">Deal pipeline ({deals.length})</h1>
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <div
            key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && moveStage(dragId, stage)}
            className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {STAGE_LABEL[stage]}
              </span>
              <span className="text-xs text-muted-foreground">{byStage[stage]?.length ?? 0}</span>
            </div>
            <div className="flex flex-col gap-2">
              {byStage[stage]?.map((deal) => (
                <Card
                  key={deal.id}
                  draggable
                  onDragStart={() => setDragId(deal.id)}
                  onDragEnd={() => setDragId(null)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <CardContent className="flex flex-col gap-2 p-3">
                    <Link
                      href={`/dashboard/contacts/${deal.contact.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{deal.contact.name}</div>
                    {deal.amount > 0 && (
                      <div className="text-xs font-semibold text-foreground">${deal.amount.toLocaleString()}</div>
                    )}
                    <Select value={deal.stage} onValueChange={(v) => moveStage(deal.id, v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
