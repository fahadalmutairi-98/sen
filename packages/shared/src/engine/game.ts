import type {
  AnswerResult,
  BoardColumn,
  GameSettings,
  GameState,
  PointValue,
  PowerUpType,
  QuestionDef,
  TeamId,
  TeamState,
} from "../types";
import { POINT_VALUES } from "../types";
import {
  BEFORE_QUESTION_POWERUPS,
  DEFAULT_SETTINGS,
  emptyPowerUps,
} from "../constants";
import { oppositeTeam, shuffle } from "./utils";

function createTeam(id: TeamId, name: string, color: string): TeamState {
  return {
    id,
    name,
    color,
    score: 0,
    players: [],
    powerUps: emptyPowerUps(),
    chosenPowerUps: [],
    scoreHistory: [],
    stats: {
      correct: 0,
      wrong: 0,
      powerUpsUsed: 0,
      highestStreak: 0,
      currentStreak: 0,
    },
    frozenTurns: 0,
  };
}

export function createInitialGame(params: {
  id: string;
  roomCode: string;
  hostId: string;
  settings?: Partial<GameSettings>;
  teamAName?: string;
  teamBName?: string;
}): GameState {
  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...params.settings };
  const now = Date.now();
  return {
    id: params.id,
    roomCode: params.roomCode,
    phase: "LOBBY",
    settings,
    teams: {
      A: createTeam("A", params.teamAName ?? "الفريق الأول", "#7EB8D4"),
      B: createTeam("B", params.teamBName ?? "الفريق الثاني", "#E8A87C"),
    },
    board: [],
    currentTurn: "A",
    activeQuestion: null,
    armedPowerUps: [],
    selectedCategoryIds: [],
    winner: null,
    createdAt: now,
    updatedAt: now,
    hostId: params.hostId,
  };
}

/**
 * Build board: each category gets exactly POINT_VALUES slots
 * (2×200, 2×400, 2×600) with distinct questions.
 */
export function buildBoard(
  categoryIds: string[],
  questionsByCategory: Record<string, QuestionDef[]>,
  selectedBy: Record<string, TeamId>
): BoardColumn[] {
  return categoryIds.map((categoryId) => {
    const pool = shuffle(questionsByCategory[categoryId] ?? []);
    const usedIds = new Set<string>();
    const byPoints: Record<number, QuestionDef[]> = { 200: [], 400: [], 600: [] };

    for (const q of pool) {
      const p = q.points;
      if (p !== 200 && p !== 400 && p !== 600) continue;
      if (byPoints[p].length >= 2) continue;
      if (usedIds.has(q.id)) continue;
      byPoints[p].push(q);
      usedIds.add(q.id);
    }

    // Fill missing slots from leftover pool (force points)
    const leftovers = pool.filter((q) => !usedIds.has(q.id));
    for (const points of [200, 400, 600] as const) {
      while (byPoints[points].length < 2 && leftovers.length) {
        const q = leftovers.shift()!;
        byPoints[points].push({ ...q, points });
        usedIds.add(q.id);
      }
    }

    const cells = POINT_VALUES.map((points, slotIndex) => {
      const bucket = byPoints[points];
      // For duplicate points, take next from bucket (slot 0/1 for 200, etc.)
      const occurrence = POINT_VALUES.slice(0, slotIndex + 1).filter((p) => p === points).length - 1;
      const q = bucket[occurrence];
      return {
        slotIndex,
        categoryId,
        points: points as PointValue,
        questionId: q?.id ?? `missing-${categoryId}-${slotIndex}`,
        answered: false,
      };
    });

    return {
      categoryId,
      selectedBy: selectedBy[categoryId] ?? "A",
      cells,
    };
  });
}

export function selectCell(
  state: GameState,
  categoryId: string,
  slotIndex: number
): GameState {
  if (state.phase !== "BOARD") throw new Error("Not on board phase");
  if (state.teams[state.currentTurn].frozenTurns > 0) {
    throw new Error("Team is frozen this turn");
  }

  const col = state.board.find((c) => c.categoryId === categoryId);
  if (!col) throw new Error("Category not on board");
  const cell = col.cells.find((c) => c.slotIndex === slotIndex);
  if (!cell || cell.answered) throw new Error("Cell unavailable");

  const team = state.currentTurn;
  const armed = [...state.armedPowerUps];

  let next: GameState = {
    ...state,
    phase: "QUESTION",
    armedPowerUps: [],
    activeQuestion: {
      questionId: cell.questionId,
      categoryId,
      slotIndex,
      points: cell.points,
      askedBy: team,
      answeringTeam: team,
      startedAt: Date.now(),
      timerSeconds: state.settings.timerSeconds,
      activePowerUps: [],
      removedOptionIds: [],
      hintRevealed: false,
      answerRevealed: false,
      twoAnswersActive: false,
      doubleActive: false,
      trapActive: false,
      pitActive: false,
      stealAvailable: false,
      restActive: false,
    },
    updatedAt: Date.now(),
  };

  // Apply armed before-question power-ups onto the active question
  for (const pu of armed) {
    if (pu === "PIT" && next.activeQuestion) {
      next = {
        ...next,
        activeQuestion: {
          ...next.activeQuestion,
          pitActive: true,
          activePowerUps: [...next.activeQuestion.activePowerUps, "PIT"],
        },
      };
    }
    if (pu === "DOUBLE_POINTS" && next.activeQuestion) {
      next = {
        ...next,
        activeQuestion: {
          ...next.activeQuestion,
          doubleActive: true,
          activePowerUps: [...next.activeQuestion.activePowerUps, "DOUBLE_POINTS"],
        },
      };
    }
    if (pu === "TRAP" && next.activeQuestion) {
      const opp = oppositeTeam(team);
      next = {
        ...next,
        activeQuestion: {
          ...next.activeQuestion,
          answeringTeam: opp,
          trapActive: true,
          activePowerUps: [...next.activeQuestion.activePowerUps, "TRAP"],
        },
      };
    }
  }

  return next;
}

function consumePowerUp(state: GameState, teamId: TeamId, powerUp: PowerUpType): GameState {
  const team = state.teams[teamId];
  if ((team.powerUps[powerUp] ?? 0) <= 0) throw new Error("No power-up left");
  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...team,
        powerUps: { ...team.powerUps, [powerUp]: team.powerUps[powerUp] - 1 },
        stats: { ...team.stats, powerUpsUsed: team.stats.powerUpsUsed + 1 },
      },
    },
    updatedAt: Date.now(),
  };
}

export function applyPowerUp(
  state: GameState,
  teamId: TeamId,
  powerUp: PowerUpType,
  question?: QuestionDef
): GameState {
  const onBoard = state.phase === "BOARD";
  const onQuestion = state.phase === "QUESTION" && !!state.activeQuestion;

  // Timing validation
  if (onBoard && !BEFORE_QUESTION_POWERUPS.includes(powerUp)) {
    throw new Error("This power-up can only be used after the question appears");
  }
  if (onQuestion && BEFORE_QUESTION_POWERUPS.includes(powerUp)) {
    throw new Error("This power-up must be used before selecting the question");
  }
  if (!onBoard && !onQuestion) {
    throw new Error("Cannot use power-up now");
  }

  // Arm before-question power-ups on the board
  if (onBoard && (powerUp === "PIT" || powerUp === "DOUBLE_POINTS" || powerUp === "TRAP")) {
    if (state.armedPowerUps.includes(powerUp)) {
      throw new Error("Already armed");
    }
    let next = consumePowerUp(state, teamId, powerUp);
    next = {
      ...next,
      armedPowerUps: [...next.armedPowerUps, powerUp],
    };
    return next;
  }

  if (onBoard && powerUp === "FREEZE") {
    let next = consumePowerUp(state, teamId, powerUp);
    const opp = oppositeTeam(teamId);
    next = {
      ...next,
      teams: {
        ...next.teams,
        [opp]: { ...next.teams[opp], frozenTurns: next.teams[opp].frozenTurns + 1 },
      },
    };
    return next;
  }

  // After-question power-ups
  const aq = state.activeQuestion;
  if (!aq) throw new Error("No active question");

  let next = consumePowerUp(state, teamId, powerUp);

  switch (powerUp) {
    case "CALL_FRIEND": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          hintRevealed: true,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "TWO_ANSWERS": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          twoAnswersActive: true,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "TRAP": {
      throw new Error("Trap must be armed before selecting the question");
    }
    case "DOUBLE_POINTS": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          doubleActive: true,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "PIT": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          pitActive: true,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "STEAL": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          answeringTeam: teamId,
          stealAvailable: false,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "REST": {
      next = {
        ...next,
        activeQuestion: {
          ...aq,
          restActive: true,
          activePowerUps: [...aq.activePowerUps, powerUp],
        },
      };
      break;
    }
    case "FREEZE": {
      const opp = oppositeTeam(teamId);
      next = {
        ...next,
        teams: {
          ...next.teams,
          [opp]: { ...next.teams[opp], frozenTurns: next.teams[opp].frozenTurns + 1 },
        },
      };
      break;
    }
  }

  return next;
}

export function revealAnswer(state: GameState): GameState {
  if (!state.activeQuestion) throw new Error("No active question");
  if (state.phase !== "QUESTION") throw new Error("Not in question phase");
  return {
    ...state,
    phase: "REVEAL",
    activeQuestion: {
      ...state.activeQuestion,
      answerRevealed: true,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Host awards the question points to Team A, Team B, or neither.
 * Seen Jeem party flow — no typed/MC auto-grading.
 */
export function awardPoints(
  state: GameState,
  question: QuestionDef,
  awardedTo: TeamId | null
): { state: GameState; result: AnswerResult } {
  if (!state.activeQuestion) throw new Error("No active question");
  const aq = state.activeQuestion;
  const base = aq.points * (aq.doubleActive ? 2 : 1);

  let pointsDelta = 0;
  let opponentDelta = 0;
  const teams = { ...state.teams };

  if (awardedTo === "A" || awardedTo === "B") {
    pointsDelta = base;
    const winner = { ...teams[awardedTo] };
    winner.score = Math.max(0, winner.score + pointsDelta);
    winner.scoreHistory = [
      ...winner.scoreHistory,
      {
        questionId: question.id,
        points: pointsDelta,
        correct: true,
        powerUp: aq.activePowerUps[0],
        timestamp: Date.now(),
      },
    ];
    winner.stats = {
      ...winner.stats,
      correct: winner.stats.correct + 1,
      currentStreak: winner.stats.currentStreak + 1,
      highestStreak: Math.max(
        winner.stats.highestStreak,
        winner.stats.currentStreak + 1
      ),
    };
    teams[awardedTo] = winner;

    // The Pit: if the asking team scored, deduct from opponent
    if (aq.pitActive && awardedTo === aq.askedBy) {
      opponentDelta = -base;
      const opp = oppositeTeam(awardedTo);
      teams[opp] = {
        ...teams[opp],
        score: Math.max(0, teams[opp].score + opponentDelta),
      };
    }
  } else {
    // Neither — trap failure: answering team loses the points
    if (aq.trapActive) {
      const trapped = aq.answeringTeam;
      pointsDelta = -aq.points;
      teams[trapped] = {
        ...teams[trapped],
        score: Math.max(0, teams[trapped].score + pointsDelta),
        stats: {
          ...teams[trapped].stats,
          wrong: teams[trapped].stats.wrong + 1,
          currentStreak: 0,
        },
        scoreHistory: [
          ...teams[trapped].scoreHistory,
          {
            questionId: question.id,
            points: pointsDelta,
            correct: false,
            powerUp: "TRAP",
            timestamp: Date.now(),
          },
        ],
      };
    } else {
      // Mark answering team as missed (no score change)
      const answering = aq.answeringTeam;
      teams[answering] = {
        ...teams[answering],
        stats: {
          ...teams[answering].stats,
          wrong: teams[answering].stats.wrong + 1,
          currentStreak: 0,
        },
      };
    }
  }

  const board = state.board.map((col) => {
    if (col.categoryId !== aq.categoryId) return col;
    return {
      ...col,
      cells: col.cells.map((cell) =>
        cell.slotIndex === aq.slotIndex
          ? {
              ...cell,
              answered: true,
              answeredBy: awardedTo ?? undefined,
              correct: awardedTo !== null,
            }
          : cell
      ),
    };
  });

  const allAnswered = board.every((col) => col.cells.every((c) => c.answered));

  let nextTurn = oppositeTeam(state.currentTurn);
  if (teams[nextTurn].frozenTurns > 0) {
    teams[nextTurn] = {
      ...teams[nextTurn],
      frozenTurns: teams[nextTurn].frozenTurns - 1,
    };
    nextTurn = oppositeTeam(nextTurn);
  }

  let winner: GameState["winner"] = null;
  let phase: GameState["phase"] = "BOARD";
  if (allAnswered) {
    phase = "FINISHED";
    if (teams.A.score > teams.B.score) winner = "A";
    else if (teams.B.score > teams.A.score) winner = "B";
    else winner = "DRAW";
  }

  const result: AnswerResult = {
    correct: awardedTo !== null,
    pointsDelta: awardedTo ? base : pointsDelta,
    opponentDelta,
    answer: question.answer,
    explanation: question.explanation,
    answeringTeam: aq.answeringTeam,
    stealAvailable: false,
    awardedTo,
  };

  return {
    state: {
      ...state,
      teams,
      board,
      phase,
      winner,
      currentTurn: allAnswered ? state.currentTurn : nextTurn,
      activeQuestion: null,
      armedPowerUps: [],
      updatedAt: Date.now(),
    },
    result,
  };
}

/** @deprecated Prefer revealAnswer + awardPoints for host-judged flow */
export function resolveAnswer(
  state: GameState,
  question: QuestionDef,
  _submitted: { answer: string; optionId?: string },
  forcedCorrect?: boolean
): { state: GameState; result: AnswerResult } {
  let next = state;
  if (!next.activeQuestion?.answerRevealed) {
    next = revealAnswer(next);
  }
  if (forcedCorrect === true) {
    return awardPoints(next, question, next.activeQuestion!.answeringTeam);
  }
  if (forcedCorrect === false) {
    return awardPoints(next, question, null);
  }
  // Default: award to answering team (legacy auto-correct path unused in UI)
  return awardPoints(next, question, next.activeQuestion!.answeringTeam);
}

export function continueAfterReveal(state: GameState): GameState {
  if (state.phase === "FINISHED") return state;
  return {
    ...state,
    phase: "BOARD",
    activeQuestion: null,
    armedPowerUps: [],
    updatedAt: Date.now(),
  };
}

export function assignPowerUps(
  state: GameState,
  teamId: TeamId,
  selected: PowerUpType[]
): GameState {
  const max = state.settings.maxPowerUpsPerTeam;
  if (selected.length > max) throw new Error(`Max ${max} power-ups`);
  const inventory = emptyPowerUps();
  for (const p of selected) inventory[p] = (inventory[p] ?? 0) + 1;
  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...state.teams[teamId],
        powerUps: inventory,
        chosenPowerUps: [...selected],
      },
    },
    updatedAt: Date.now(),
  };
}

/** Host/manual score adjust (±100 typical). Score never goes below 0. */
export function adjustScore(
  state: GameState,
  teamId: TeamId,
  delta: number
): GameState {
  if (state.phase === "FINISHED") throw new Error("Game already finished");
  const team = state.teams[teamId];
  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...team,
        score: Math.max(0, team.score + delta),
        scoreHistory: [
          ...team.scoreHistory,
          {
            questionId: "manual",
            points: delta,
            correct: delta > 0,
            timestamp: Date.now(),
          },
        ],
      },
    },
    updatedAt: Date.now(),
  };
}

/** End the game early and declare winner from current scores. */
export function finishGame(state: GameState): GameState {
  if (state.phase === "FINISHED") return state;
  let winner: GameState["winner"] = "DRAW";
  if (state.teams.A.score > state.teams.B.score) winner = "A";
  else if (state.teams.B.score > state.teams.A.score) winner = "B";
  return {
    ...state,
    phase: "FINISHED",
    winner,
    activeQuestion: null,
    armedPowerUps: [],
    updatedAt: Date.now(),
  };
}

export function getWinnerStats(state: GameState) {
  return {
    winner: state.winner,
    teams: {
      A: {
        name: state.teams.A.name,
        score: state.teams.A.score,
        stats: state.teams.A.stats,
      },
      B: {
        name: state.teams.B.name,
        score: state.teams.B.score,
        stats: state.teams.B.stats,
      },
    },
  };
}
