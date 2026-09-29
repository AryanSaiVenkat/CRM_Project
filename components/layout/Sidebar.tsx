"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, GitBranch, LifeBuoy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/deals", label: "Pipeline", icon: GitBranch },
  { href: "/dashboard/tickets", label: "Tickets", icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutGrid size={18} />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">Nexus CRM Lite</div>
          <div className="font-mono text-[10px] text-muted-foreground">v3.0</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
