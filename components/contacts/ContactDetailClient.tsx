"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact, Lead, Deal, Ticket } from "@prisma/client";
import { ArrowLeft, GitBranch, LifeBuoy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AiScoreBadge from "@/components/shared/AiScoreBadge";

type UnifiedContact = Contact & { lead: Lead | null; deals: Deal[]; tickets: Ticket[] };
type TimelineItem =
  | { type: "deal"; id: string; createdAt: Date; data: Deal }
  | { type: "ticket"; id: string; createdAt: Date; data: Ticket };

const SENTIMENT_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
};

export default function ContactDetailClient({ view }: { view: { contact: UnifiedContact; timeline: TimelineItem[] } }) {
  const router = useRouter();
  const { contact, timeline } = view;
  const drivers = Array.isArray(contact.lead?.aiTopDrivers) ? (contact.lead!.aiTopDrivers as string[]) : [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "" });
  const [error, setError] = useState<string | null>(null);

  async function onLogTicket(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, ...form }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to log ticket");
      return;
    }
    setOpen(false);
    setForm({ subject: "", body: "" });
    router.refresh();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Link
        href="/dashboard/leads"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{contact.name}</h1>
          <p className="text-sm text-muted-foreground">{contact.email || contact.phone || "No contact info on file"}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={14} />
              Log ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a ticket for {contact.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onLogTicket} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  required
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit">Submit</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contact.lead && (
        <Card>
          <CardHeader>
            <CardTitle>AI outputs — FR-AI-01 / FR-AI-03</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <AiScoreBadge score={contact.lead.aiScore} />
              <span className="text-sm text-muted-foreground">
                lead score, from source lead &ldquo;{contact.lead.source ?? "—"}&rdquo;
              </span>
            </div>
            {drivers.length > 0 && (
              <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                {drivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Unified timeline — Deals &amp; Tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {timeline.length === 0 && <p className="text-sm text-muted-foreground">Nothing logged yet.</p>}
          {timeline.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                {item.type === "deal" ? <GitBranch size={14} /> : <LifeBuoy size={14} />}
              </div>
              <div className="flex-1">
                {item.type === "deal" ? (
                  <>
                    <div className="text-sm font-medium">{item.data.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary">{item.data.stage}</Badge>
                      {item.data.amount > 0 && (
                        <span className="text-xs text-muted-foreground">${item.data.amount.toLocaleString()}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium">{item.data.subject}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.data.body}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={item.data.status === "OPEN" ? "warning" : "success"}>{item.data.status}</Badge>
                      {item.data.sentiment && (
                        <Badge variant={SENTIMENT_VARIANT[item.data.sentiment]}>{item.data.sentiment}</Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
