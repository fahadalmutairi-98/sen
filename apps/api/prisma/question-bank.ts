/**
 * Loads the curated bilingual question bank (50+ real questions per category).
 * Source of truth: ./questions/bank.json (+ optional media_bank.json)
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { expandYearAnswers } from "@seen/shared";

export type SeedQuestion = {
  categoryId: string;
  points: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  type:
    | "MULTIPLE_CHOICE"
    | "TEXT"
    | "IMAGE"
    | "AUDIO"
    | "VIDEO"
    | "TRUE_FALSE";
  language: string;
  questionTextAr: string;
  questionTextEn: string;
  answerAr: string;
  answerEn: string;
  acceptedAnswers: string[];
  optionsJson?: { id: string; text: { ar: string; en: string } }[];
  explanationAr?: string;
  explanationEn?: string;
  hintAr?: string;
  hintEn?: string;
  mediaType?: "image" | "audio" | "video" | null;
  mediaUrl?: string | null;
  mediaThumbnail?: string | null;
};

type RawQuestion = SeedQuestion & { yearTolerance?: number; yearAnswer?: number };

function normalize(q: RawQuestion): SeedQuestion {
  const accepted = new Set<string>([
    ...(q.acceptedAnswers ?? []),
    q.answerAr,
    q.answerEn,
  ]);

  const year =
    q.yearAnswer ??
    (/^\d{4}$/.test(String(q.answerEn).trim())
      ? Number(q.answerEn)
      : /^\d{4}$/.test(String(q.answerAr).trim())
        ? Number(q.answerAr)
        : null);

  if (year && year >= 1000 && year <= 2100) {
    for (const y of expandYearAnswers(year, q.yearTolerance ?? 3)) {
      accepted.add(y);
    }
  }

  const mediaType = q.mediaType ?? null;
  const mediaUrl = q.mediaUrl ?? null;
  let type: SeedQuestion["type"] = q.type;
  if (mediaUrl && mediaType === "image") type = "IMAGE";
  if (mediaUrl && mediaType === "audio") type = "AUDIO";
  if (mediaUrl && mediaType === "video") type = "VIDEO";
  if (!mediaUrl && (type === "IMAGE" || type === "AUDIO" || type === "VIDEO")) {
    type = "TEXT";
  }

  return {
    categoryId: q.categoryId,
    points: q.points,
    difficulty: q.difficulty,
    type,
    language: q.language || "ar",
    questionTextAr: q.questionTextAr,
    questionTextEn: q.questionTextEn,
    answerAr: q.answerAr,
    answerEn: q.answerEn,
    acceptedAnswers: [...accepted],
    optionsJson: q.type === "MULTIPLE_CHOICE" ? q.optionsJson : undefined,
    hintAr: q.hintAr,
    hintEn: q.hintEn,
    explanationAr: q.explanationAr,
    explanationEn: q.explanationEn,
    mediaType: mediaUrl ? mediaType : null,
    mediaUrl: mediaUrl || null,
    mediaThumbnail: q.mediaThumbnail ?? null,
  };
}

function loadJsonBank(filename: string): RawQuestion[] {
  const bankPath = path.join(__dirname, "questions", filename);
  if (!existsSync(bankPath)) return [];
  return JSON.parse(readFileSync(bankPath, "utf8")) as RawQuestion[];
}

function loadBank(): SeedQuestion[] {
  const main = loadJsonBank("bank.json").map(normalize);
  const media = loadJsonBank("media_bank.json").map(normalize);
  return [...main, ...media];
}

/** Generate >= 1000 real questions (50 per category + media extras). */
export function generateAllQuestions(): SeedQuestion[] {
  const questions = loadBank();
  if (questions.length < 1000) {
    throw new Error(
      `Question bank too small (${questions.length}). Run generate_bank.py first.`
    );
  }
  return questions;
}
