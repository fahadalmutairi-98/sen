import type { QuestionDef, QuestionPublic } from "@seen/shared";

export {
  assignTeam,
  createRoom,
  gameAwardPoints,
  gameContinue,
  gameRevealAnswer,
  gameSelectCell,
  gameUsePowerUp,
  getGame,
  getQuestion,
  getRoom,
  joinRoom,
  persistGame,
  renameTeam,
  startGameSession,
} from "../services/game-room";

export function toPublicFromCache(q: QuestionDef, reveal: boolean): QuestionPublic {
  const pub: QuestionPublic = {
    id: q.id,
    categoryId: q.categoryId,
    difficulty: q.difficulty,
    points: q.points,
    type: q.type,
    language: q.language,
    questionText: q.questionText,
    options: q.options,
    media: q.media,
    hint: q.hint,
  };
  if (reveal) {
    pub.answer = q.answer;
    pub.acceptedAnswers = q.acceptedAnswers;
    pub.explanation = q.explanation;
  }
  return pub;
}
