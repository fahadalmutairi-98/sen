"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button, Card } from "@/components/ui";
import { CategoryCard } from "@/components/CategoryCard";

type CatDetail = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  color: string;
  accentColor: string;
  imageUrl?: string | null;
  isActive: boolean;
  questionCount: number;
  stats: {
    byPoints: Record<string, number>;
    byType: Record<string, number>;
  };
};

type QuestionRow = {
  id: string;
  points: number;
  type: string;
  difficulty: string;
  questionTextAr: string;
  questionTextEn: string;
  answerAr: string;
  answerEn: string;
  hintAr?: string | null;
  hintEn?: string | null;
  acceptedAnswers: string[];
  mediaType?: string | null;
  mediaUrl?: string | null;
  isActive: boolean;
};

type MediaKind = "image" | "audio" | "video" | "";

const emptyQuestion = {
  questionTextAr: "",
  questionTextEn: "",
  answerAr: "",
  answerEn: "",
  acceptedExtra: "",
  hintAr: "",
  points: 200,
  mediaType: "" as MediaKind,
  mediaUrl: "",
};

export default function AdminCategoryDetailPage() {
  const params = useParams();
  const categoryId = params.id as string;
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";

  const [cat, setCat] = useState<CatDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pointsFilter, setPointsFilter] = useState<number | "">("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyQuestion);
  const [saving, setSaving] = useState(false);
  const [editCat, setEditCat] = useState(false);
  const [catForm, setCatForm] = useState({
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    color: "#FFB7CE",
    accentColor: "#D4B8F0",
    imageUrl: "",
  });

  const loadCat = useCallback(async () => {
    if (!token) return;
    const data = await api<CatDetail>(`/admin/categories/${categoryId}`, {
      token,
    });
    setCat(data);
    setCatForm({
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      color: data.color,
      accentColor: data.accentColor,
      imageUrl: data.imageUrl ?? "",
    });
  }, [token, categoryId]);

  const loadQuestions = useCallback(
    async (p = 1) => {
      if (!token) return;
      const qs = new URLSearchParams({
        page: String(p),
        pageSize: "20",
        categoryId,
      });
      if (search.trim()) qs.set("search", search.trim());
      if (pointsFilter) qs.set("points", String(pointsFilter));
      const res = await api<{ total: number; items: QuestionRow[] }>(
        `/admin/questions?${qs}`,
        { token }
      );
      setQuestions(res.items);
      setTotal(res.total);
      setPage(p);
    },
    [token, categoryId, search, pointsFilter]
  );

  useEffect(() => {
    loadCat().catch((e) => setError(e.message));
  }, [loadCat]);

  useEffect(() => {
    loadQuestions(1).catch((e) => setError(e.message));
  }, [loadQuestions]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyQuestion);
    setShowForm(true);
  }

  function startEdit(q: QuestionRow) {
    setEditingId(q.id);
    setForm({
      questionTextAr: q.questionTextAr,
      questionTextEn: q.questionTextEn,
      answerAr: q.answerAr,
      answerEn: q.answerEn,
      acceptedExtra: q.acceptedAnswers
        .filter((a) => a !== q.answerAr && a !== q.answerEn)
        .join("، "),
      hintAr: q.hintAr ?? "",
      points: q.points,
      mediaType: (q.mediaType as MediaKind) || "",
      mediaUrl: q.mediaUrl ?? "",
    });
    setShowForm(true);
  }

  async function saveQuestion(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    try {
      const acceptedAnswers = [
        form.answerAr,
        form.answerEn,
        ...form.acceptedExtra
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
      ];
      const difficulty =
        form.points <= 200 ? "EASY" : form.points <= 400 ? "MEDIUM" : "HARD";
      const type = form.mediaType
        ? form.mediaType === "image"
          ? "IMAGE"
          : form.mediaType === "audio"
            ? "AUDIO"
            : "VIDEO"
        : "TEXT";

      const payload = {
        categoryId,
        points: form.points,
        difficulty,
        type,
        language: "ar",
        questionTextAr: form.questionTextAr,
        questionTextEn: form.questionTextEn || form.questionTextAr,
        answerAr: form.answerAr,
        answerEn: form.answerEn || form.answerAr,
        acceptedAnswers,
        hintAr: form.hintAr || undefined,
        mediaType: form.mediaType || null,
        mediaUrl: form.mediaUrl || null,
      };

      if (editingId) {
        await api(`/admin/questions/${editingId}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(payload),
        });
      } else {
        await api("/admin/questions", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyQuestion);
      await Promise.all([loadQuestions(1), loadCat()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!token) return;
    const ok =
      typeof window === "undefined" ||
      window.confirm(ar ? "حذف هذا السؤال؟" : "Delete this question?");
    if (!ok) return;
    await api(`/admin/questions/${id}`, { method: "DELETE", token });
    await Promise.all([loadQuestions(page), loadCat()]);
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    await api(`/admin/categories/${categoryId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        ...catForm,
        imageUrl: catForm.imageUrl || null,
      }),
    });
    setEditCat(false);
    await loadCat();
  }

  const pages = useMemo(() => Math.max(1, Math.ceil(total / 20)), [total]);

  return (
    <AdminShell>
      <div className="mb-4">
        <Link
          href="/admin/categories"
          className="text-sm text-white/50 hover:text-[var(--sj-gold)]"
        >
          ← {ar ? "كل الفئات" : "All categories"}
        </Link>
      </div>

      {cat && (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-28 shrink-0">
              <CategoryCard
                category={{
                  id: cat.id,
                  slug: cat.slug,
                  name: { ar: cat.nameAr, en: cat.nameEn },
                  description: {
                    ar: cat.descriptionAr,
                    en: cat.descriptionEn,
                  },
                  icon: "folder",
                  color: cat.color,
                  accentColor: cat.accentColor,
                  image: cat.imageUrl || `/categories/${cat.id}.svg`,
                }}
                locale={locale}
                as="div"
                compact
              />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black">
                {ar ? cat.nameAr : cat.nameEn}
              </h1>
              <p className="text-sm text-white/50">
                {cat.questionCount} {ar ? "سؤال" : "questions"} · {categoryId}
              </p>
              {!cat.imageUrl && (
                <p className="mt-1 text-xs text-[var(--sj-primary)]">
                  {ar
                    ? "أضف صورة غلاف من «تعديل الفئة»"
                    : "Add a cover image via Edit category"}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setEditCat((v) => !v)}>
              {ar ? "تعديل الفئة" : "Edit category"}
            </Button>
            <Button variant="gold" onClick={startCreate}>
              {ar ? "سؤال جديد" : "New question"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
          {error}
        </div>
      )}

      {editCat && (
        <Card className="mb-5">
          <h2 className="mb-3 font-display text-lg font-bold">
            {ar ? "تعديل بيانات الفئة" : "Edit category"}
          </h2>
          <form onSubmit={saveCategory} className="grid gap-3 md:grid-cols-2">
            <input
              value={catForm.nameAr}
              onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
              placeholder={ar ? "الاسم بالعربي" : "Arabic name"}
            />
            <input
              value={catForm.nameEn}
              onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
              placeholder={ar ? "الاسم بالإنجليزي" : "English name"}
            />
            <textarea
              value={catForm.descriptionAr}
              onChange={(e) =>
                setCatForm({ ...catForm, descriptionAr: e.target.value })
              }
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 md:col-span-2"
              rows={2}
              placeholder={ar ? "الوصف" : "Description"}
            />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs text-white/50">
                {ar ? "صورة غلاف البطاقة" : "Card cover image"}
              </label>
              <ImageUploader
                value={catForm.imageUrl}
                onChange={(imageUrl) => setCatForm({ ...catForm, imageUrl })}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
              />
              <input
                type="color"
                value={catForm.accentColor}
                onChange={(e) =>
                  setCatForm({ ...catForm, accentColor: e.target.value })
                }
              />
            </div>
            <Button type="submit" variant="primary">
              {ar ? "حفظ" : "Save"}
            </Button>
          </form>
        </Card>
      )}

      {showForm && (
        <Card className="mb-5 border-[var(--sj-gold)]/30">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">
              {editingId
                ? ar
                  ? "تعديل سؤال"
                  : "Edit question"
                : ar
                  ? "إضافة سؤال"
                  : "Add question"}
            </h2>
            <Button
              variant="ghost"
              className="text-sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              {ar ? "إغلاق" : "Close"}
            </Button>
          </div>

          <form onSubmit={saveQuestion} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-white/50">
                {ar ? "نص السؤال (عربي)" : "Question (Arabic)"}
              </label>
              <textarea
                required
                value={form.questionTextAr}
                onChange={(e) =>
                  setForm({ ...form, questionTextAr: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg outline-none focus:border-[var(--sj-gold)]"
                placeholder={ar ? "اكتب السؤال هنا..." : "Write the question..."}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">
                {ar ? "السؤال بالإنجليزي (اختياري)" : "Question (English, optional)"}
              </label>
              <input
                value={form.questionTextEn}
                onChange={(e) =>
                  setForm({ ...form, questionTextEn: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/50">
                  {ar ? "الجواب" : "Answer"}
                </label>
                <input
                  required
                  value={form.answerAr}
                  onChange={(e) => setForm({ ...form, answerAr: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-white/50">
                  {ar ? "الجواب بالإنجليزي (اختياري)" : "Answer EN (optional)"}
                </label>
                <input
                  value={form.answerEn}
                  onChange={(e) => setForm({ ...form, answerEn: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">
                {ar
                  ? "إجابات مقبولة إضافية (افصل بفاصلة)"
                  : "Extra accepted answers (comma-separated)"}
              </label>
              <input
                value={form.acceptedExtra}
                onChange={(e) =>
                  setForm({ ...form, acceptedExtra: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
                placeholder={ar ? "مثال: الكويت، دوله الكويت" : "e.g. Kuwait City"}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/50">
                  {ar ? "النقاط" : "Points"}
                </label>
                <div className="flex gap-2">
                  {[200, 400, 600].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, points: p })}
                      className={`flex-1 rounded-xl py-2.5 font-display font-bold transition ${
                        form.points === p
                          ? "bg-[var(--sj-gold)] text-[var(--sj-navy)]"
                          : "border border-white/15 bg-black/30 text-white/70"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-white/50">
                  {ar ? "تلميح (اختياري)" : "Hint (optional)"}
                </label>
                <input
                  value={form.hintAr}
                  onChange={(e) => setForm({ ...form, hintAr: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">
                {ar ? "وسائط السؤال" : "Question media"}
              </label>
              <MediaUploader
                mediaType={form.mediaType}
                mediaUrl={form.mediaUrl}
                onChange={(next) =>
                  setForm({
                    ...form,
                    mediaType: next.mediaType,
                    mediaUrl: next.mediaUrl,
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving
                  ? "..."
                  : editingId
                    ? ar
                      ? "تحديث السؤال"
                      : "Update question"
                    : ar
                      ? "حفظ السؤال"
                      : "Save question"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                {ar ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ar ? "بحث في أسئلة هذه الفئة..." : "Search in this category..."}
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 outline-none focus:border-[var(--sj-gold)]"
        />
        <select
          value={pointsFilter}
          onChange={(e) =>
            setPointsFilter(e.target.value ? Number(e.target.value) : "")
          }
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5"
        >
          <option value="">{ar ? "كل النقاط" : "All points"}</option>
          {[200, 400, 600].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <Button variant="ghost" onClick={() => loadQuestions(1)}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {ar ? `الأسئلة (${total})` : `Questions (${total})`}
          </h2>
        </div>

        <div className="space-y-2">
          {questions.length === 0 && (
            <p className="py-8 text-center text-white/40">
              {ar ? "لا توجد أسئلة بعد — أضف أول سؤال" : "No questions yet"}
            </p>
          )}
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-relaxed">{q.questionTextAr}</div>
                <div className="mt-1 text-sm text-[var(--sj-gold)]">
                  {ar ? "الجواب:" : "Answer:"} {q.answerAr}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-white/45">
                  <span className="rounded-full bg-white/10 px-2 py-0.5">
                    {q.points}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">
                    {q.type}
                  </span>
                  {q.mediaUrl && (
                    <span className="rounded-full bg-[var(--sj-gold)]/20 px-2 py-0.5 text-[var(--sj-gold)]">
                      {q.mediaType}
                    </span>
                  )}
                </div>
                {q.mediaUrl && q.mediaType === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.mediaUrl}
                    alt=""
                    className="mt-2 max-h-24 rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(q)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
                >
                  {ar ? "تعديل" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
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
              onClick={() => loadQuestions(page - 1)}
            >
              {ar ? "السابق" : "Prev"}
            </Button>
            <span className="text-sm text-white/50">
              {page} / {pages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= pages}
              onClick={() => loadQuestions(page + 1)}
            >
              {ar ? "التالي" : "Next"}
            </Button>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
