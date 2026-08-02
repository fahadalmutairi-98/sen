import { describe, it, expect } from "vitest";
import {
  createInitialGame,
  buildBoard,
  selectCell,
  revealAnswer,
  awardPoints,
  assignPowerUps,
  applyPowerUp,
  type QuestionDef,
} from "../index";

const sampleQ = (id: string, points: number, categoryId = "general"): QuestionDef => ({
  id,
  categoryId,
  difficulty: points <= 200 ? "EASY" : points <= 400 ? "MEDIUM" : "HARD",
  points,
  type: "TEXT",
  language: "ar",
  questionText: { ar: "سؤال؟", en: "Question?" },
  answer: { ar: "جواب", en: "Answer" },
  acceptedAnswers: ["جواب", "answer"],
  hint: { ar: "تلميح", en: "Hint" },
});

function poolFor(cat: string): QuestionDef[] {
  return [
    sampleQ(`${cat}-200a`, 200, cat),
    sampleQ(`${cat}-200b`, 200, cat),
    sampleQ(`${cat}-400a`, 400, cat),
    sampleQ(`${cat}-400b`, 400, cat),
    sampleQ(`${cat}-600a`, 600, cat),
    sampleQ(`${cat}-600b`, 600, cat),
  ];
}

describe("game engine", () => {
  it("builds board with 2×200, 2×400, 2×600", () => {
    const cats = ["a", "b", "c", "d", "e", "f"];
    const pool: Record<string, QuestionDef[]> = {};
    for (const c of cats) pool[c] = poolFor(c);
    const board = buildBoard(
      cats,
      pool,
      Object.fromEntries(cats.map((c, i) => [c, i < 3 ? "A" : "B"]))
    );
    expect(board).toHaveLength(6);
    expect(board[0].cells).toHaveLength(6);
    const points = board[0].cells.map((c) => c.points).sort((a, b) => a - b);
    expect(points).toEqual([200, 200, 400, 400, 600, 600]);
    expect(new Set(board[0].cells.map((c) => c.slotIndex)).size).toBe(6);
  });

  it("awards points to a team after revealing the answer", () => {
    let game = createInitialGame({
      id: "g1",
      roomCode: "ABC123",
      hostId: "h1",
    });
    game = assignPowerUps(game, "A", ["CALL_FRIEND", "TRAP", "PIT"]);
    const q = sampleQ("q1", 400);
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    const slot = game.board[0].cells.find((c) => c.points === 400)!.slotIndex;
    game = selectCell(game, "general", slot);
    game = revealAnswer(game);
    expect(game.phase).toBe("REVEAL");
    expect(game.activeQuestion?.answerRevealed).toBe(true);
    const { state, result } = awardPoints(game, q, "A");
    expect(result.awardedTo).toBe("A");
    expect(result.correct).toBe(true);
    expect(state.teams.A.score).toBe(400);
    expect(state.phase).toBe("BOARD");
  });

  it("awards neither with no score change", () => {
    let game = createInitialGame({ id: "g0", roomCode: "N", hostId: "h" });
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    game = selectCell(game, "general", 0);
    const q = sampleQ(game.activeQuestion!.questionId, game.activeQuestion!.points);
    game = revealAnswer(game);
    const { state, result } = awardPoints(game, q, null);
    expect(result.awardedTo).toBeNull();
    expect(state.teams.A.score).toBe(0);
    expect(state.teams.B.score).toBe(0);
  });

  it("arms PIT on board and deducts opponent when asking team scores", () => {
    let game = createInitialGame({
      id: "g2",
      roomCode: "ABC124",
      hostId: "h1",
    });
    game = assignPowerUps(game, "A", ["PIT", "TRAP", "CALL_FRIEND"]);
    game.teams.B.score = 500;
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    game = applyPowerUp(game, "A", "PIT");
    expect(game.armedPowerUps).toContain("PIT");
    const slot = game.board[0].cells.find((c) => c.points === 200)!.slotIndex;
    game = selectCell(game, "general", slot);
    expect(game.activeQuestion?.pitActive).toBe(true);
    const q = sampleQ("q2", 200);
    game = revealAnswer(game);
    const { state, result } = awardPoints(game, q, "A");
    expect(result.correct).toBe(true);
    expect(state.teams.A.score).toBe(200);
    expect(state.teams.B.score).toBe(300);
  });

  it("arms TRAP on board and assigns opponent to answer", () => {
    let game = createInitialGame({ id: "g4", roomCode: "T", hostId: "h" });
    game = assignPowerUps(game, "A", ["TRAP", "PIT", "CALL_FRIEND"]);
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    game = applyPowerUp(game, "A", "TRAP");
    expect(game.armedPowerUps).toContain("TRAP");
    game = selectCell(game, "general", 0);
    expect(game.activeQuestion?.trapActive).toBe(true);
    expect(game.activeQuestion?.answeringTeam).toBe("B");
  });

  it("reveals hint with CALL_FRIEND after question", () => {
    let game = createInitialGame({ id: "g3", roomCode: "X", hostId: "h" });
    game = assignPowerUps(game, "A", ["CALL_FRIEND", "TRAP", "TWO_ANSWERS"]);
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    game = selectCell(game, "general", 0);
    const q = sampleQ(game.activeQuestion!.questionId, game.activeQuestion!.points);
    game = applyPowerUp(game, "A", "CALL_FRIEND", q);
    expect(game.activeQuestion?.hintRevealed).toBe(true);
  });

  it("rejects TRAP after question is revealed", () => {
    let game = createInitialGame({ id: "g5", roomCode: "Z", hostId: "h" });
    game = assignPowerUps(game, "A", ["TRAP", "PIT", "CALL_FRIEND"]);
    game.phase = "BOARD";
    game.board = buildBoard(["general"], { general: poolFor("general") }, { general: "A" });
    game = selectCell(game, "general", 0);
    expect(() => applyPowerUp(game, "A", "TRAP")).toThrow(/before/i);
  });
});
