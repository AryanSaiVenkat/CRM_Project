"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Ticket, Contact } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

type TicketWithContact = Ticket & { contact: Contact };

const SENTIMENT_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
};

export default function TicketListClient({ initialTickets }: { initialTickets: TicketWithContact[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contactId: "", subject: "", body: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && contacts.length === 0) {
      fetch("/api/contacts?take=200")
        .then((r) => r.json())
        .then((d) => setContacts(d.items));
    }
  }, [open, contacts.length]);

  async function refresh() {
    const res = await fetch("/api/tickets");
    setTickets(await res.json());
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create ticket");
      return;
    }
    setOpen(false);
    setForm({ contactId: "", subject: "", body: "" });
    await refresh();
  }

  async function onResolve(id: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Tickets ({tickets.length})</h1>
        <a href="/api/tickets?format=csv">
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        </a>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus size={14} />
              New ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreate} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Select value={form.contactId} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Button type="submit" disabled={!form.contactId}>
                Submit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="max-w-xs truncate font-medium">{t.subject}</TableCell>
              <TableCell>
                <Link href={`/dashboard/contacts/${t.contact.id}`} className="text-primary hover:underline">
                  {t.contact.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={t.status === "OPEN" ? "warning" : "success"}>{t.status}</Badge>
              </TableCell>
              <TableCell>
                {t.sentiment && <Badge variant={SENTIMENT_VARIANT[t.sentiment]}>{t.sentiment}</Badge>}
              </TableCell>
              <TableCell className="text-right">
                {t.status === "OPEN" && (
                  <Button variant="ghost" size="sm" onClick={() => onResolve(t.id)}>
                    Resolve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No tickets yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
