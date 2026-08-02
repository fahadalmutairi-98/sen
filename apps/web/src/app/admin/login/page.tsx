"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { Button, Card, Logo } from "@/components/ui";
import Link from "next/link";

export default function AdminLoginPage() {
  const setAuth = useApp((s) => s.setAuth);
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const router = useRouter();
  const ar = locale === "ar";

  const [email, setEmail] = useState("admin@seenjeem.local");
  const [password, setPassword] = useState("admin123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) router.replace("/admin");
  }, [token, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{
        token: string;
        user: { id: string; displayName: string; role: string };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(res.token, res.user);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sj-gradient sj-pattern flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold">
            {ar ? "لوحة التحكم" : "Admin"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {ar ? "إدارة الفئات والأسئلة" : "Manage categories & questions"}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
            {error}
          </div>
        )}

        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-[var(--sj-gold)]"
              placeholder="Email"
              autoComplete="username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-[var(--sj-gold)]"
              placeholder="Password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? (ar ? "..." : "...") : ar ? "دخول" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
