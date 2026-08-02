"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button, Card } from "@/components/ui";
import { CategoryCard } from "@/components/CategoryCard";
import type { CategoryDef } from "@seen/shared";

export type AdminCategory = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  color: string;
  accentColor: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
};

const emptyForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  color: "#FFB7CE",
  accentColor: "#D4B8F0",
  icon: "folder",
  imageUrl: "",
};

export default function AdminCategoriesPage() {
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    if (!token) return;
    const rows = await api<AdminCategory[]>("/admin/categories", { token });
    setItems(rows);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      await api("/admin/categories", {
        method: "POST",
        token,
        body: JSON.stringify({
          ...form,
          imageUrl: form.imageUrl || null,
        }),
      });
      setForm(emptyForm);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat: AdminCategory) {
    if (!token) return;
    await api(`/admin/categories/${cat.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    await load();
  }

  const filtered = items.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.nameAr.includes(query.trim()) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.id.includes(q)
    );
  });

  function toCard(cat: AdminCategory): CategoryDef {
    return {
      id: cat.id,
      slug: cat.slug,
      name: { ar: cat.nameAr, en: cat.nameEn },
      description: { ar: cat.descriptionAr, en: cat.descriptionEn },
      icon: cat.icon,
      color: cat.color,
      accentColor: cat.accentColor,
      image: cat.imageUrl || `/categories/${cat.id}.svg`,
    };
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">
            {ar ? "الفئات" : "Categories"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {ar
              ? "الاسم بالعربي والإنجليزي + صورة الغلاف — تظهر كبطاقات مثل تحداني"
              : "Arabic/English titles + cover image — shown as Tahdani-style cards"}
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowCreate((v) => !v)}>
          {showCreate
            ? ar
              ? "إلغاء"
              : "Cancel"
            : ar
              ? "فئة جديدة"
              : "New category"}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
          {error}
        </div>
      )}

      {showCreate && (
        <Card className="mb-5">
          <h2 className="mb-3 font-display text-xl font-bold">
            {ar ? "إنشاء فئة" : "Create category"}
          </h2>
          <form onSubmit={createCategory} className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              placeholder={ar ? "الاسم بالعربي" : "Arabic name"}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 outline-none focus:border-[var(--sj-gold)]"
            />
            <input
              required
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              placeholder={ar ? "الاسم بالإنجليزي" : "English name"}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 outline-none focus:border-[var(--sj-gold)]"
            />
            <input
              value={form.descriptionAr}
              onChange={(e) =>
                setForm({ ...form, descriptionAr: e.target.value })
              }
              placeholder={ar ? "وصف عربي" : "Arabic description"}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 md:col-span-2 outline-none focus:border-[var(--sj-gold)]"
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs text-white/50">
                {ar ? "صورة غلاف الفئة" : "Category cover image"}
              </label>
              <ImageUploader
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-white/50">
                {ar ? "اللون" : "Color"}
              </label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) =>
                  setForm({ ...form, accentColor: e.target.value })
                }
                className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"
              />
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "..." : ar ? "حفظ الفئة" : "Save category"}
            </Button>
          </form>
          {(form.nameAr || form.nameEn) && (
            <div className="mx-auto mt-5 max-w-[180px]">
              <p className="mb-2 text-center text-xs text-white/45">
                {ar ? "معاينة البطاقة" : "Card preview"}
              </p>
              <CategoryCard
                category={{
                  id: "preview",
                  slug: "preview",
                  name: {
                    ar: form.nameAr || "سؤال",
                    en: form.nameEn || "Question",
                  },
                  description: { ar: "", en: "" },
                  icon: "folder",
                  color: form.color,
                  accentColor: form.accentColor,
                  image: form.imageUrl || "/categories/general.svg",
                }}
                locale={locale}
                as="div"
              />
            </div>
          )}
        </Card>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={ar ? "بحث في الفئات..." : "Search categories..."}
        className="mb-4 w-full max-w-md rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
      />

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {filtered.map((cat) => (
          <div key={cat.id} className="space-y-2">
            <CategoryCard category={toCard(cat)} locale={locale} as="div" />
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="min-w-0 text-xs text-white/45">
                <span className="truncate">{cat.id}</span>
                <span className="mx-1">·</span>
                {cat.questionCount} {ar ? "سؤال" : "q"}
                {!cat.imageUrl && (
                  <span className="ms-1 text-[var(--sj-primary)]">
                    ({ar ? "بدون صورة" : "no image"})
                  </span>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  cat.isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {cat.isActive ? (ar ? "نشطة" : "Active") : ar ? "متوقفة" : "Off"}
              </span>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/categories/${cat.id}`} className="flex-1">
                <Button variant="gold" className="w-full text-sm">
                  {ar ? "إدارة" : "Manage"}
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => toggleActive(cat)}
              >
                {cat.isActive ? (ar ? "إيقاف" : "Off") : ar ? "تفعيل" : "On"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
