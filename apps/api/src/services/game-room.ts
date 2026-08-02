import { randomUUID } from "crypto";
import {
  buildBoard,
  createInitialGame,
  generateRoomCode,
  selectCell,
  applyPowerUp,
  revealAnswer,
  awardPoints,
  continueAfterReveal,
  assignPowerUps,
  adjustScore,
  finishGame,
  type GameState,
  type GameSettings,
  type PowerUpType,
  type TeamId,
  type RoomState,
  type PlayerSession,
  type QuestionDef,
} from "@seen/shared";
import { prisma } from "../lib/prisma";
import { toQuestionDef } from "../lib/mappers";

/** In-memory realtime store (persisted snapshots to Postgres). */
const rooms = new Map<string, RoomState>();
const games = new Map<string, GameState>();
const questionCache = new Map<string, QuestionDef>();

export function getRoom(code: string) {
  return rooms.get(code.toUpperCase());
}

export function getGame(id: string) {
  return games.get(id);
}

export function getQuestion(id: string) {
  return questionCache.get(id);
}

export async function createRoom(params: {
  displayName: string;
  isLocal?: boolean;
  userId?: string;
}): Promise<{ room: RoomState; player: PlayerSession }> {
  let code = generateRoomCode();
  while (rooms.has(code) || (await prisma.room.findUnique({ where: { code } }))) {
    code = generateRoomCode();
  }

  const player: PlayerSession = {
    id: randomUUID(),
    displayName: params.displayName,
    teamId: null,
    isHost: true,
    isGuest: !params.userId,
    connected: true,
  };

  const room: RoomState = {
    code,
    gameId: null,
    players: [player],
    isLocal: !!params.isLocal,
    createdAt: Date.now(),
  };
  rooms.set(code, room);

  await prisma.room.create({
    data: {
      code,
      isLocal: room.isLocal,
      players: {
        create: {
          id: player.id,
          displayName: player.displayName,
          isHost: true,
          userId: params.userId,
        },
      },
    },
  });

  return { room, player };
}

export async function joinRoom(params: {
  code: string;
  displayName: string;
  userId?: string;
}): Promise<{ room: RoomState; player: PlayerSession }> {
  const code = params.code.toUpperCase();
  let room = rooms.get(code);

  if (!room) {
    const dbRoom = await prisma.room.findUnique({
      where: { code },
      include: { players: true, games: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!dbRoom) throw new Error("الغرفة غير موجودة / Room not found");
    room = {
      code,
      gameId: dbRoom.games[0]?.id ?? null,
      players: dbRoom.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        teamId: (p.teamId as TeamId) ?? null,
        isHost: p.isHost,
        isGuest: !p.userId,
        connected: p.connected,
      })),
      isLocal: dbRoom.isLocal,
      createdAt: dbRoom.createdAt.getTime(),
    };
    rooms.set(code, room);
    if (dbRoom.games[0]) {
      games.set(dbRoom.games[0].id, dbRoom.games[0].stateJson as unknown as GameState);
    }
  }

  const player: PlayerSession = {
    id: randomUUID(),
    displayName: params.displayName,
    teamId: null,
    isHost: false,
    isGuest: !params.userId,
    connected: true,
  };
  room.players.push(player);
  rooms.set(code, room);

  await prisma.roomPlayer.create({
    data: {
      id: player.id,
      roomId: (await prisma.room.findUniqueOrThrow({ where: { code } })).id,
      displayName: player.displayName,
      userId: params.userId,
    },
  });

  return { room, player };
}

export function assignTeam(code: string, playerId: string, teamId: TeamId) {
  const room = getRoom(code);
  if (!room) throw new Error("Room not found");
  room.players = room.players.map((p) =>
    p.id === playerId ? { ...p, teamId } : p
  );
  rooms.set(code, room);
  return room;
}

export async function startGameSession(params: {
  code: string;
  hostId: string;
  settings?: Partial<GameSettings>;
  teamAName?: string;
  teamBName?: string;
  categoryIds: string[];
  selectedBy: Record<string, TeamId>;
  powerUpsA: PowerUpType[];
  powerUpsB: PowerUpType[];
}): Promise<GameState> {
  const room = getRoom(params.code);
  if (!room) throw new Error("Room not found");

  const questionsByCategory: Record<string, QuestionDef[]> = {};
  for (const catId of params.categoryIds) {
    const rows = await prisma.question.findMany({
      where: { categoryId: catId, isActive: true },
    });
    const defs = rows.map(toQuestionDef);
    questionsByCategory[catId] = defs;
    for (const d of defs) questionCache.set(d.id, d);
  }

  let game = createInitialGame({
    id: randomUUID(),
    roomCode: params.code,
    hostId: params.hostId,
    settings: params.settings,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
  });

  game.phase = "BOARD";
  game.selectedCategoryIds = params.categoryIds;
  game.board = buildBoard(params.categoryIds, questionsByCategory, params.selectedBy);
  game = assignPowerUps(game, "A", params.powerUpsA);
  game = assignPowerUps(game, "B", params.powerUpsB);

  // Assign players to teams in game state
  for (const p of room.players) {
    if (p.teamId) {
      game.teams[p.teamId].players.push(p.displayName);
    }
  }

  const dbRoom = await prisma.room.findUniqueOrThrow({ where: { code: params.code } });
  await prisma.game.create({
    data: {
      id: game.id,
      roomId: dbRoom.id,
      hostId: params.hostId.match(/^[a-z]/) ? undefined : undefined,
      mode: game.settings.mode,
      status: "ACTIVE",
      stateJson: game as object,
      categoryIds: params.categoryIds,
      timerSeconds: game.settings.timerSeconds,
      language: game.settings.language,
    },
  });

  room.gameId = game.id;
  rooms.set(params.code, room);
  games.set(game.id, game);
  return game;
}

export function persistGame(game: GameState) {
  games.set(game.id, game);
  void prisma.game
    .update({
      where: { id: game.id },
      data: {
        stateJson: game as object,
        teamAScore: game.teams.A.score,
        teamBScore: game.teams.B.score,
        status: game.phase === "FINISHED" ? "FINISHED" : "ACTIVE",
        winner: game.winner,
        finishedAt: game.phase === "FINISHED" ? new Date() : undefined,
      },
    })
    .catch(console.error);
}

export function gameSelectCell(gameId: string, categoryId: string, slotIndex: number) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const next = selectCell(game, categoryId, slotIndex);
  persistGame(next);
  return next;
}

export function gameUsePowerUp(
  gameId: string,
  teamId: TeamId,
  powerUp: PowerUpType
) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const q = game.activeQuestion
    ? questionCache.get(game.activeQuestion.questionId)
    : undefined;
  const next = applyPowerUp(game, teamId, powerUp, q);
  persistGame(next);
  return next;
}

export function gameRevealAnswer(gameId: string) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const next = revealAnswer(game);
  persistGame(next);
  const q = next.activeQuestion
    ? questionCache.get(next.activeQuestion.questionId)
    : undefined;
  return { state: next, question: q };
}

export function gameAwardPoints(gameId: string, awardedTo: TeamId | null) {
  const game = games.get(gameId);
  if (!game || !game.activeQuestion) throw new Error("No active question");
  const q = questionCache.get(game.activeQuestion.questionId);
  if (!q) throw new Error("Question missing");
  // Ensure answer is revealed first
  let current = game;
  if (!game.activeQuestion.answerRevealed) {
    current = revealAnswer(game);
  }
  const { state, result } = awardPoints(current, q, awardedTo);
  persistGame(state);
  return { state, result, question: q };
}

export function gameContinue(gameId: string) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const next = continueAfterReveal(game);
  persistGame(next);
  return next;
}

export function gameAdjustScore(gameId: string, teamId: TeamId, delta: number) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const next = adjustScore(game, teamId, delta);
  persistGame(next);
  return next;
}

export function gameFinish(gameId: string) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  const next = finishGame(game);
  persistGame(next);
  return next;
}

export function renameTeam(gameId: string, teamId: TeamId, name: string) {
  const game = games.get(gameId);
  if (!game) throw new Error("Game not found");
  game.teams[teamId].name = name;
  persistGame(game);
  return game;
}

/** Local single-device helper: create room+game without sockets. */
export async function createLocalGame(params: {
  teamAName: string;
  teamBName: string;
  categoryIds: string[];
  selectedBy: Record<string, TeamId>;
  powerUpsA: PowerUpType[];
  powerUpsB: PowerUpType[];
  settings?: Partial<GameSettings>;
}) {
  const { room, player } = await createRoom({
    displayName: "مضيف محلي",
    isLocal: true,
  });
  // Fake second team players for local
  room.players.push({
    id: randomUUID(),
    displayName: params.teamBName,
    teamId: "B",
    isHost: false,
    isGuest: true,
    connected: true,
  });
  room.players[0].teamId = "A";
  rooms.set(room.code, room);

  const game = await startGameSession({
    code: room.code,
    hostId: player.id,
    settings: params.settings,
    teamAName: params.teamAName,
    teamBName: params.teamBName,
    categoryIds: params.categoryIds,
    selectedBy: params.selectedBy,
    powerUpsA: params.powerUpsA,
    powerUpsB: params.powerUpsB,
  });

  return { room, game, hostId: player.id };
}
