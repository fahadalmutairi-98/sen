"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/api";
import { useApp } from "@/lib/store";

/** Image-only uploader for category cover thumbnails. */
export function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setError(ar ? "يُسمح بالصور فقط" : "Images only");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await uploadFile(file, token);
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[var(--sj-primary)]/40 bg-black/30 p-4">
      <p className="text-xs text-white/50">
        {ar
          ? "صورة غلاف البطاقة (JPG / PNG / WebP) — بدون صوت أو فيديو"
          : "Card cover image (JPG / PNG / WebP) — no audio or video"}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <button
        type="button"
        disabled={uploading || !token}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-white/15 bg-[var(--sj-primary)]/15 px-4 py-3 text-sm font-bold text-[var(--sj-primary)] transition hover:bg-[var(--sj-primary)]/25 disabled:opacity-50"
      >
        {uploading
          ? ar
            ? "جاري الرفع..."
            : "Uploading..."
          : value
            ? ar
              ? "استبدال الصورة"
              : "Replace image"
            : ar
              ? "رفع صورة من الجهاز"
              : "Upload image"}
      </button>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ar ? "أو الصق رابط الصورة" : "Or paste image URL"}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--sj-primary)]"
        dir="ltr"
      />

      {value && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="mx-auto max-h-48 rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-full rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10"
          >
            {ar ? "إزالة الصورة" : "Remove image"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
