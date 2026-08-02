import type { Question as DbQuestion } from "@prisma/client";
import type { QuestionDef, QuestionPublic, LocalizedString } from "@seen/shared";

export function toQuestionDef(q: DbQuestion): QuestionDef {
  const options = q.optionsJson as QuestionDef["options"] | null;
  return {
    id: q.id,
    categoryId: q.categoryId,
    difficulty: q.difficulty,
    points: q.points,
    type: q.type,
    language: (q.language as "ar" | "en") ?? "ar",
    questionText: { ar: q.questionTextAr, en: q.questionTextEn },
    answer: { ar: q.answerAr, en: q.answerEn },
    acceptedAnswers: q.acceptedAnswers,
    options: options ?? undefined,
    explanation:
      q.explanationAr || q.explanationEn
        ? { ar: q.explanationAr ?? "", en: q.explanationEn ?? "" }
        : undefined,
    hint:
      q.hintAr || q.hintEn
        ? { ar: q.hintAr ?? "", en: q.hintEn ?? "" }
        : undefined,
    media: q.mediaUrl
      ? {
          type: (q.mediaType as "image" | "audio" | "video") ?? "image",
          url: q.mediaUrl,
          thumbnailUrl: q.mediaThumbnail ?? undefined,
        }
      : undefined,
  };
}

export function toPublicQuestion(q: DbQuestion, revealAnswer = false): QuestionPublic {
  const def = toQuestionDef(q);
  const pub: QuestionPublic = {
    id: def.id,
    categoryId: def.categoryId,
    difficulty: def.difficulty,
    points: def.points,
    type: def.type,
    language: def.language,
    questionText: def.questionText,
    options: def.options,
    media: def.media,
    hint: def.hint,
  };
  if (revealAnswer) {
    pub.answer = def.answer;
    pub.acceptedAnswers = def.acceptedAnswers;
    pub.explanation = def.explanation;
  }
  return pub;
}

export function loc(ar: string, en: string): LocalizedString {
  return { ar, en };
}
