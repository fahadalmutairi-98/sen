"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, Card } from "@/components/ui";

type Stats = {
  questions: number;
  categories: number;
  games: number;
  finished: number;
  users: number;
  withMedia: number;
  byPoints: Record<string, number>;
};

export default function AdminDashboardPage() {
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<Stats>("/admin/stats", { token })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">
            {ar ? "نظرة عامة" : "Overview"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {ar
              ? "إدارة محتوى اللعبة من الفئات والأسئلة والوسائط"
              : "Manage game content: categories, questions, and media"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/categories">
            <Button variant="gold">{ar ? "الفئات" : "Categories"}</Button>
          </Link>
          <Link href="/admin/questions">
            <Button variant="ghost">{ar ? "كل الأسئلة" : "All questions"}</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {(
            [
              ["questions", ar ? "الأسئلة" : "Questions", stats.questions],
              ["categories", ar ? "الفئات" : "Categories", stats.categories],
              ["withMedia", ar ? "بوسائط" : "With media", stats.withMedia],
              ["games", ar ? "الألعاب" : "Games", stats.games],
              ["finished", ar ? "منتهية" : "Finished", stats.finished],
              ["users", ar ? "المستخدمون" : "Users", stats.users],
            ] as const
          ).map(([key, label, value]) => (
            <Card key={key} className="text-center">
              <div className="text-xs uppercase tracking-wide text-white/45">
                {label}
              </div>
              <div className="mt-1 font-display text-3xl font-black text-[var(--sj-gold)]">
                {value}
              </div>
            </Card>
          ))}
        </div>
      )}

      {stats && (
        <Card className="mt-4">
          <h2 className="mb-3 font-display text-lg font-bold">
            {ar ? "توزيع النقاط" : "Points distribution"}
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byPoints)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([p, n]) => (
                <div
                  key={p}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center"
                >
                  <div className="font-display text-xl font-bold text-[var(--sj-gold)]">
                    {p}
                  </div>
                  <div className="text-xs text-white/50">{n}</div>
                </div>
              ))}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Link href="/admin/categories" className="block">
          <Card className="h-full transition hover:border-[var(--sj-gold)]/40">
            <h3 className="font-display text-xl font-bold">
              {ar ? "إدارة الفئات" : "Manage categories"}
            </h3>
            <p className="mt-2 text-sm text-white/55">
              {ar
                ? "أنشئ فئة جديدة، عدّل الأسماء والألوان، وادخل لإضافة أسئلتها"
                : "Create categories, edit names/colors, open one to add questions"}
            </p>
          </Card>
        </Link>
        <Link href="/admin/questions" className="block">
          <Card className="h-full transition hover:border-[var(--sj-gold)]/40">
            <h3 className="font-display text-xl font-bold">
              {ar ? "بحث في الأسئلة" : "Search questions"}
            </h3>
            <p className="mt-2 text-sm text-white/55">
              {ar
                ? "ابحث وعدّل واحذف عبر كل الفئات"
                : "Search, edit, and delete across all categories"}
            </p>
          </Card>
        </Link>
      </div>
    </AdminShell>
  );
}
