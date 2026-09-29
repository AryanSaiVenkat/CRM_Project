"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Mail, Lock } from "lucide-react";

const C = { primary: "#1E3A8A", ink: "#0F172A", sub: "#64748B", faint: "#94A3B8", line: "#E6E9F0", panel: "#fff" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@nexuscrmlite.test");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password.");
    else router.push("/dashboard");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg,#EEF3FC 0%,#F5F7FB 60%,#E8EEFA 100%)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: C.primary }}
          >
            <LayoutGrid size={30} color="#fff" />
          </div>
          <div className="text-3xl font-extrabold" style={{ color: C.primary }}>
            Nexus CRM Lite
          </div>
          <div className="mt-3 text-xl font-bold" style={{ color: C.ink }}>
            Platform Access
          </div>
          <div className="mt-1 text-sm" style={{ color: C.sub }}>
            Sign in to manage your leads and pipeline
          </div>
          <div
            className="mt-1 text-xs tracking-wide"
            style={{ color: C.faint, fontFamily: "'JetBrains Mono', monospace" }}
          >
            PRD v3.0
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="overflow-hidden rounded-xl"
          style={{ background: C.panel, border: `1px solid ${C.line}` }}
        >
          <div style={{ height: 6, background: C.primary }} />
          <div className="p-8">
            <label className="mb-1.5 block text-xs font-semibold tracking-wide" style={{ color: C.sub }}>
              WORK EMAIL
            </label>
            <div className="relative mb-5">
              <Mail size={16} color={C.faint} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none"
                style={{ border: `1px solid ${C.line}`, color: C.ink }}
              />
            </div>
            <label className="mb-1.5 block text-xs font-semibold tracking-wide" style={{ color: C.sub }}>
              PASSWORD
            </label>
            <div className="relative mb-2">
              <Lock size={16} color={C.faint} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none"
                style={{ border: `1px solid ${C.line}`, color: C.ink }}
              />
            </div>
            {error && (
              <p className="mb-3 text-xs font-medium" style={{ color: "#B42318" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: C.primary }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <p className="mt-4 text-center text-xs" style={{ color: C.faint }}>
              Demo login is pre-filled. Passwords are bcrypt-hashed — never stored in plaintext.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
