"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead, Contact } from "@prisma/client";
import { ArrowLeft, ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AiScoreBadge from "@/components/shared/AiScoreBadge";

type LeadWithContact = Lead & { contact: Contact | null };

export default function LeadDetailClient({ lead }: { lead: LeadWithContact }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const drivers = Array.isArray(lead.aiTopDrivers) ? (lead.aiTopDrivers as string[]) : [];

  async function onConvert() {
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      router.push(`/dashboard/contacts/${body.contact.id}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to convert lead");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Link
        href="/dashboard/leads"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to leads
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">{lead.name}</h1>
        <div className="flex items-center gap-2">
          <Badge>{lead.status}</Badge>
          {lead.contact ? (
            <Link href={`/dashboard/contacts/${lead.contact.id}`}>
              <Button size="sm" variant="outline">
                View contact
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onConvert}>
              <ArrowRightCircle size={14} />
              Convert to contact
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div>{lead.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Phone</div>
            <div>{lead.phone || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Source</div>
            <div>{lead.source || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Created</div>
            <div>{new Date(lead.createdAt).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FR-AI-01 / FR-AI-03 — AI lead score</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <AiScoreBadge score={lead.aiScore} />
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top drivers</div>
            {drivers.length ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {drivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No drivers available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
