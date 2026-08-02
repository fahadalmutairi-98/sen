import type { Server, Socket } from "socket.io";
import type { ClientEvent, PowerUpType, TeamId } from "@seen/shared";
import {
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
  toPublicFromCache,
} from "./socket-helpers";

type AuthedSocket = Socket & { playerId?: string; roomCode?: string };

export function registerSockets(io: Server) {
  io.on("connection", (socket: AuthedSocket) => {
    socket.on("event", async (event: ClientEvent) => {
      try {
        await handleEvent(io, socket, event);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        socket.emit("event", { type: "ERROR", payload: { message } });
      }
    });

    socket.on("disconnect", () => {
      if (socket.roomCode && socket.playerId) {
        const room = getRoom(socket.roomCode);
        if (room) {
          room.players = room.players.map((p) =>
            p.id === socket.playerId ? { ...p, connected: false } : p
          );
          io.to(socket.roomCode).emit("event", { type: "ROOM_STATE", payload: room });
        }
      }
    });
  });
}

async function handleEvent(io: Server, socket: AuthedSocket, event: ClientEvent) {
  switch (event.type) {
    case "ROOM_CREATE": {
      const { room, player } = await createRoom({
        displayName: event.payload.displayName,
        isLocal: event.payload.isLocal,
      });
      socket.playerId = player.id;
      socket.roomCode = room.code;
      socket.join(room.code);
      socket.emit("event", { type: "ROOM_STATE", payload: room });
      socket.emit("session", { playerId: player.id, roomCode: room.code });
      break;
    }
    case "ROOM_JOIN": {
      const { room, player } = await joinRoom({
        code: event.payload.code,
        displayName: event.payload.displayName,
      });
      socket.playerId = player.id;
      socket.roomCode = room.code;
      socket.join(room.code);
      io.to(room.code).emit("event", { type: "ROOM_STATE", payload: room });
      socket.emit("session", { playerId: player.id, roomCode: room.code });
      if (room.gameId) {
        const game = getGame(room.gameId);
        if (game) socket.emit("event", { type: "GAME_STATE", payload: game });
      }
      break;
    }
    case "TEAM_ASSIGN": {
      const code = socket.roomCode!;
      const room = assignTeam(code, event.payload.playerId, event.payload.teamId);
      io.to(code).emit("event", { type: "ROOM_STATE", payload: room });
      break;
    }
    case "TEAM_RENAME": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const game = renameTeam(room.gameId, event.payload.teamId, event.payload.name);
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: game });
      break;
    }
    case "START_GAME": {
      // Handled via HTTP for category/powerup payload richness; socket acknowledges
      const room = getRoom(socket.roomCode!);
      if (room?.gameId) {
        const game = getGame(room.gameId);
        if (game) io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: game });
      }
      break;
    }
    case "SELECT_CELL": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const game = gameSelectCell(
        room.gameId,
        event.payload.categoryId,
        event.payload.slotIndex
      );
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: game });
      const q = getQuestion(game.activeQuestion!.questionId);
      if (q) {
        io.to(socket.roomCode!).emit("event", {
          type: "QUESTION_DATA",
          payload: toPublicFromCache(q, false),
        });
      }
      break;
    }
    case "USE_POWERUP": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const game = getGame(room.gameId)!;
      const teamId = (room.players.find((p) => p.id === socket.playerId)?.teamId ??
        game.currentTurn) as TeamId;
      const next = gameUsePowerUp(room.gameId, teamId, event.payload.powerUp as PowerUpType);
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: next });
      if (next.activeQuestion?.hintRevealed) {
        const q = getQuestion(next.activeQuestion.questionId);
        if (q) {
          io.to(socket.roomCode!).emit("event", {
            type: "QUESTION_DATA",
            payload: { ...toPublicFromCache(q, false), hint: q.hint },
          });
        }
      }
      break;
    }
    case "REVEAL_ANSWER": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const { state, question } = gameRevealAnswer(room.gameId);
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: state });
      if (question) {
        io.to(socket.roomCode!).emit("event", {
          type: "QUESTION_DATA",
          payload: toPublicFromCache(question, true),
        });
      }
      break;
    }
    case "AWARD_POINTS": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const { state, result, question } = gameAwardPoints(
        room.gameId,
        event.payload.awardedTo
      );
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: state });
      io.to(socket.roomCode!).emit("event", { type: "ANSWER_RESULT", payload: result });
      io.to(socket.roomCode!).emit("event", {
        type: "QUESTION_DATA",
        payload: toPublicFromCache(question, true),
      });
      break;
    }
    case "NEXT_TURN": {
      const room = getRoom(socket.roomCode!);
      if (!room?.gameId) throw new Error("No game");
      const game = gameContinue(room.gameId);
      io.to(socket.roomCode!).emit("event", { type: "GAME_STATE", payload: game });
      break;
    }
    case "SELECT_CATEGORIES":
    case "SELECT_POWERUPS":
    case "SET_SETTINGS":
    case "SKIP_QUESTION":
    case "REMATCH":
      socket.emit("event", {
        type: "ERROR",
        payload: { message: "Use REST API for setup actions", code: "USE_REST" },
      });
      break;
  }
}

export { startGameSession, persistGame };
