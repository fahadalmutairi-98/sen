import type { LocalizedString } from "../types";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Eastern Arabic / Persian digits to Western 0-9 */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_DIGITS.indexOf(d);
    if (i >= 0) return String(i);
    const j = PERSIAN_DIGITS.indexOf(d);
    return j >= 0 ? String(j) : d;
  });
}

/** Normalize Arabic/English trivia answers for comparison */
export function normalizeAnswer(input: string): string {
  return normalizeDigits(input)
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "") // harakat / tatweel-adjacent marks
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function withWithoutAl(s: string): string[] {
  const out = [s];
  if (s.startsWith("ال") && s.length > 3) out.push(s.slice(2));
  else out.push(`ال${s}`);
  return out;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j]
          ? row[j]
          : 1 + Math.min(row[j], row[j + 1], prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function fuzzyClose(a: string, b: string): boolean {
  if (!a || !b) return false;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 2) return a === b;
  const allowed = maxLen <= 5 ? 1 : maxLen <= 10 ? 2 : 3;
  return levenshtein(a, b) <= allowed;
}

function extractYears(s: string): number[] {
  const digits = normalizeDigits(s);
  const years: number[] = [];
  const re = /\b(?:1[0-9]{3}|20[0-9]{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(digits))) years.push(Number(m[0]));
  // bare 2–4 digit if whole string is a year-like number
  if (/^\d{3,4}$/.test(digits.trim())) {
    const n = Number(digits.trim());
    if (n >= 1000 && n <= 2100) years.push(n);
  }
  return years;
}

export interface AnswerMatchConfig {
  /** Accept answers within ±N years of a year answer (Seen Jeem style). Default 3. */
  yearTolerance?: number;
}

/**
 * Flexible answer checking:
 * - Arabic/English digit equivalence
 * - Spelling / diacritic normalization
 * - First or last name (token overlap)
 * - Near spelling (Levenshtein)
 * - Year ranges (± yearTolerance, default 3)
 */
export function answersMatch(
  submitted: string,
  accepted: string[],
  primary: LocalizedString,
  config: AnswerMatchConfig = {}
): boolean {
  const yearTolerance = config.yearTolerance ?? 3;
  const normalized = normalizeAnswer(submitted);
  if (!normalized) return false;

  const pool = [...accepted, primary.ar, primary.en]
    .filter(Boolean)
    .map((s) => s.trim())
    .filter(Boolean);

  const normPool = pool
    .flatMap((s) => withWithoutAl(normalizeAnswer(s)))
    .filter(Boolean);

  const normalizedVariants = withWithoutAl(normalized);

  // Exact / contains
  for (const nv of normalizedVariants) {
    for (const a of normPool) {
      if (a === nv) return true;
      if (a.length >= 3 && nv.length >= 3) {
        if (a.includes(nv) || nv.includes(a)) return true;
      }
    }
  }

  // Year range (± tolerance) — Seen Jeem style
  const subYears = extractYears(submitted);
  if (subYears.length) {
    for (const target of pool) {
      const tYears = extractYears(target);
      for (const sy of subYears) {
        for (const ty of tYears) {
          if (Math.abs(sy - ty) <= yearTolerance) return true;
        }
      }
    }
  }

  // Name / multi-token: any meaningful token match (len >= 3)
  const subTokens = normalized.split(" ").filter((t) => t.length >= 3);
  for (const a of normPool) {
    const tokens = a.split(" ").filter((t) => t.length >= 3);
    if (!tokens.length) continue;
    // submitted is a single name that matches any part
    if (subTokens.length === 1) {
      if (tokens.some((t) => t === subTokens[0] || fuzzyClose(t, subTokens[0]))) {
        return true;
      }
    }
    // majority of tokens match
    const hits = subTokens.filter((st) =>
      tokens.some((t) => t === st || fuzzyClose(t, st))
    ).length;
    if (subTokens.length >= 2 && hits >= Math.ceil(subTokens.length * 0.6)) {
      return true;
    }
  }

  // Fuzzy full-string
  for (const a of normPool) {
    if (fuzzyClose(normalized, a)) return true;
  }

  return false;
}

/** Expand a year into accepted string variants (± tolerance) for seeding */
export function expandYearAnswers(year: number, tolerance = 3): string[] {
  const out: string[] = [];
  for (let y = year - tolerance; y <= year + tolerance; y++) {
    out.push(String(y));
    // Eastern Arabic digits variant
    out.push(
      String(y).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)] ?? d)
    );
  }
  return out;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateRoomCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function oppositeTeam(team: "A" | "B"): "A" | "B" {
  return team === "A" ? "B" : "A";
}

export function t(str: LocalizedString, locale: "ar" | "en"): string {
  return str[locale] || str.ar || str.en;
}
