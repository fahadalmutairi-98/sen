"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button, Card } from "@/components/ui";
import type { AdminCategory } from "../categories/page";

type QuestionRow = {
  id: string;
  categoryId: string;
  points: number;
  type: string;
  questionTextAr: string;
  answerAr: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  category?: { id: string; nameAr: string; nameEn: string; color: string };
};

export default function AdminAllQuestionsPage() {
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [items, setItems] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [points, setPoints] = useState<number | "">("");
  const [hasMedia, setHasMedia] = useState<"" | "true" | "false">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<AdminCategory[]>("/admin/categories", { token })
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, [token]);

  const load = useCallback(
    async (p = 1) => {
      if (!token) return;
      const qs = new URLSearchParams({
        page: String(p),
        pageSize: "25",
      });
      if (search.trim()) qs.set("search", search.trim());
      if (categoryId) qs.set("categoryId", categoryId);
      if (points) qs.set("points", String(points));
      if (hasMedia) qs.set("hasMedia", hasMedia);
      const res = await api<{ total: number; items: QuestionRow[] }>(
        `/admin/questions?${qs}`,
        { token }
      );
      setItems(res.items);
      setTotal(res.total);
      setPage(p);
    },
    [token, search, categoryId, points, hasMedia]
  );

  useEffect(() => {
    load(1).catch((e) => setError(e.message));
  }, [load]);

  async function removeQuestion(id: string) {
    if (!token) return;
    const ok =
      typeof window === "undefined" ||
      window.confirm(ar ? "حذف هذا السؤال؟" : "Delete this question?");
    if (!ok) return;
    await api(`/admin/questions/${id}`, { method: "DELETE", token });
    await load(page);
  }

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-black">
          {ar ? "كل الأسئلة" : "All questions"}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {ar
            ? "ابحث عبر كل الفئات — للتعديل الكامل افتح الفئة"
            : "Search across categories — open a category for full editing"}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ar ? "بحث..." : "Search..."}
          className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)] sm:col-span-2"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
        >
          <option value="">{ar ? "كل الفئات" : "All categories"}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {ar ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>
        <select
          value={points}
          onChange={(e) => setPoints(e.target.value ? Number(e.target.value) : "")}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
        >
          <option value="">{ar ? "كل النقاط" : "All points"}</option>
          {[200, 400, 600].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={hasMedia}
          onChange={(e) => setHasMedia(e.target.value as "" | "true" | "false")}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
        >
          <option value="">{ar ? "وسائط: الكل" : "Media: all"}</option>
          <option value="true">{ar ? "مع وسائط" : "With media"}</option>
          <option value="false">{ar ? "بدون وسائط" : "No media"}</option>
        </select>
      </div>

      <Card>
        <div className="mb-3 text-sm text-white/50">
          {total} {ar ? "نتيجة" : "results"}
        </div>
        <div className="space-y-2">
          {items.map((q) => (
            <div
              key={q.id}
              className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{q.questionTextAr}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/45">
                  <Link
                    href={`/admin/categories/${q.categoryId}`}
                    className="rounded-full px-2 py-0.5 font-bold text-white"
                    style={{
                      backgroundColor: q.category?.color ?? "#333",
                    }}
                  >
                    {ar ? q.category?.nameAr : q.category?.nameEn ?? q.categoryId}
                  </Link>
                  <span>{q.points}</span>
                  <span>{q.type}</span>
                  {q.mediaUrl && <span className="text-[var(--sj-gold)]">{q.mediaType}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/admin/categories/${q.categoryId}`}>
                  <button
                    type="button"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/10"
                  >
                    {ar ? "فتح الفئة" : "Open category"}
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300"
                >
                  {ar ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              {ar ? "السابق" : "Prev"}
            </Button>
            <span className="text-sm text-white/50">
              {page} / {pages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= pages}
              onClick={() => load(page + 1)}
            >
              {ar ? "التالي" : "Next"}
            </Button>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
