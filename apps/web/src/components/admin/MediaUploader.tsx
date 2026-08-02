"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/api";
import { useApp } from "@/lib/store";

type MediaKind = "image" | "audio" | "video";

export function MediaUploader({
  mediaType,
  mediaUrl,
  onChange,
  /** Limit which media kinds can be chosen (questions: all; never use for category covers) */
  allowed = ["image", "audio", "video"],
}: {
  mediaType: MediaKind | "";
  mediaUrl: string;
  onChange: (next: { mediaType: MediaKind | ""; mediaUrl: string }) => void;
  allowed?: MediaKind[];
}) {
  const token = useApp((s) => s.token);
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const kinds: (MediaKind | "")[] = ["", ...allowed];

  const accept =
    mediaType === "image"
      ? "image/*"
      : mediaType === "audio"
        ? "audio/*"
        : mediaType === "video"
          ? "video/*"
          : allowed.map((k) => `${k}/*`).join(",");

  async function onFile(file: File | undefined) {
    if (!file || !token) return;
    setError("");
    setUploading(true);
    try {
      const res = await uploadFile(file, token);
      const kind =
        (res.mediaType as MediaKind | null) ??
        (file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
            ? "audio"
            : file.type.startsWith("video/")
              ? "video"
              : "");
      if (kind && !allowed.includes(kind)) {
        setError(ar ? "نوع الملف غير مسموح هنا" : "File type not allowed here");
        return;
      }
      onChange({ mediaType: kind || mediaType || "image", mediaUrl: res.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {kinds.map((k) => (
          <button
            key={k || "none"}
            type="button"
            onClick={() =>
              onChange({
                mediaType: k,
                mediaUrl: k ? mediaUrl : "",
              })
            }
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              mediaType === k
                ? "bg-[var(--sj-gold)] text-[var(--sj-navy)]"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
          >
            {k === ""
              ? ar
                ? "بدون وسائط"
                : "No media"
              : k === "image"
                ? ar
                  ? "صورة"
                  : "Image"
                : k === "audio"
                  ? ar
                    ? "صوت"
                    : "Audio"
                  : ar
                    ? "فيديو"
                    : "Video"}
          </button>
        ))}
      </div>

      {mediaType && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {uploading
              ? ar
                ? "جاري الرفع..."
                : "Uploading..."
              : ar
                ? "رفع ملف من الجهاز"
                : "Upload from device"}
          </button>
          <input
            value={mediaUrl}
            onChange={(e) => onChange({ mediaType, mediaUrl: e.target.value })}
            placeholder={ar ? "أو الصق رابط الوسائط" : "Or paste media URL"}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--sj-gold)]"
          />
        </>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}

      {mediaUrl && mediaType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt=""
          className="mx-auto max-h-48 rounded-xl object-contain"
        />
      )}
      {mediaUrl && mediaType === "audio" && (
        <audio controls src={mediaUrl} className="w-full" />
      )}
      {mediaUrl && mediaType === "video" && (
        <video controls src={mediaUrl} className="mx-auto max-h-48 rounded-xl" />
      )}
    </div>
  );
}
