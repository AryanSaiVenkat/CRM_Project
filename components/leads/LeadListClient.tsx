"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@prisma/client";
import { Plus, Upload, Download, ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import AiScoreBadge from "@/components/shared/AiScoreBadge";

const STATUS_VARIANT: Record<string, "secondary" | "default" | "success" | "destructive"> = {
  NEW: "secondary",
  CONTACTED: "default",
  CONVERTED: "success",
  LOST: "destructive",
};

export default function LeadListClient({ initialItems, initialTotal }: { initialItems: Lead[]; initialTotal: number }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "Website Inbound" });
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh(status: string) {
    const qs = status === "ALL" ? "" : `?status=${status}`;
    const res = await fetch(`/api/leads${qs}`);
    const data = await res.json();
    setItems(data.items);
  }

  async function onStatusFilterChange(v: string) {
    setStatusFilter(v);
    await refresh(v);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create lead");
      return;
    }
    setCreateOpen(false);
    setForm({ name: "", email: "", phone: "", source: "Website Inbound" });
    await refresh(statusFilter);
  }

  async function onConvert(id: string) {
    const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      startTransition(() => router.push(`/dashboard/contacts/${body.contact.id}`));
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to convert lead");
    }
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) await refresh(statusFilter);
    else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete lead");
    }
  }

  async function onImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/leads/import", { method: "POST", body: fd });
    const body = await res.json();
    setImportResult(`Imported ${body.successCount} of ${body.successCount + body.failureCount} rows.`);
    if (fileRef.current) fileRef.current.value = "";
    await refresh(statusFilter);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Leads ({initialTotal})</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="CONVERTED">Converted</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>

          <a href="/api/leads?format=csv" className="inline-block">
            <Button variant="outline" size="sm">
              <Download size={14} />
              Export CSV
            </Button>
          </a>

          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onImport} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            Import CSV
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={14} />
                New lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {importResult && <p className="text-xs text-muted-foreground">{importResult}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>AI score</TableHead>
            <TableHead>Top driver</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((lead) => {
            const drivers = Array.isArray(lead.aiTopDrivers) ? (lead.aiTopDrivers as string[]) : [];
            return (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{lead.email || lead.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{lead.source || "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[lead.status] ?? "secondary"}>{lead.status}</Badge>
                </TableCell>
                <TableCell>
                  <AiScoreBadge score={lead.aiScore} />
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {drivers[0] ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {lead.status !== "CONVERTED" && (
                      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => onConvert(lead.id)}>
                        <ArrowRightCircle size={14} />
                        Convert
                      </Button>
                    )}
                    {lead.status !== "CONVERTED" && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(lead.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No leads match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
