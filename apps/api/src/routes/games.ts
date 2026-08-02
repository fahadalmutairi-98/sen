import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CATEGORIES } from "@seen/shared";
import { prisma } from "../lib/prisma";
import { toPublicQuestion } from "../lib/mappers";
import {
  createLocalGame,
  createRoom,
  gameAdjustScore,
  gameAwardPoints,
  gameContinue,
  gameFinish,
  gameRevealAnswer,
  gameSelectCell,
  gameUsePowerUp,
  getGame,
  getQuestion,
  joinRoom,
  startGameSession,
} from "../services/game-room";
import { toPublicFromCache } from "../sockets/socket-helpers";

export async function gameRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, service: "seen-jeem-api" }));

  app.get("/categories", async () => {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (!rows.length) return CATEGORIES;
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: { ar: c.nameAr, en: c.nameEn },
      description: { ar: c.descriptionAr, en: c.descriptionEn },
      icon: c.icon,
      color: c.color,
      accentColor: c.accentColor,
      image: c.imageUrl || `/categories/${c.id}.svg`,
    }));
  });

  app.get("/questions/random", async (req) => {
    const q = z
      .object({
        categoryId: z.string().optional(),
        points: z.coerce.number().optional(),
        limit: z.coerce.number().default(10),
      })
      .parse(req.query);

    const rows = await prisma.question.findMany({
      where: {
        isActive: true,
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
        ...(q.points ? { points: q.points } : {}),
      },
      take: Math.min(q.limit, 50),
    });
    return rows.map((r) => toPublicQuestion(r, false));
  });

  app.post("/rooms", async (req) => {
    const body = z
      .object({
        displayName: z.string().min(1),
        isLocal: z.boolean().optional(),
      })
      .parse(req.body);
    return createRoom(body);
  });

  app.post("/rooms/join", async (req) => {
    const body = z
      .object({ code: z.string().min(4), displayName: z.string().min(1) })
      .parse(req.body);
    return joinRoom(body);
  });

  app.post("/games/local", async (req) => {
    const body = z
      .object({
        teamAName: z.string().default("الفريق الأول"),
        teamBName: z.string().default("الفريق الثاني"),
        categoryIds: z.array(z.string()).min(2).max(8),
        selectedBy: z.record(z.enum(["A", "B"])),
        powerUpsA: z.array(z.string()).max(5),
        powerUpsB: z.array(z.string()).max(5),
        settings: z
          .object({
            mode: z.enum(["CLASSIC", "QUICK", "CUSTOM", "PARTY"]).optional(),
            timerSeconds: z.number().optional(),
            categoryCount: z.number().optional(),
            powerUpsEnabled: z.boolean().optional(),
            maxPowerUpsPerTeam: z.number().optional(),
            penaltyOnWrong: z.boolean().optional(),
            language: z.enum(["ar", "en"]).optional(),
          })
          .optional(),
      })
      .parse(req.body);

    return createLocalGame({
      ...body,
      powerUpsA: body.powerUpsA as never,
      powerUpsB: body.powerUpsB as never,
      selectedBy: body.selectedBy as never,
    });
  });

  app.post("/games/start", async (req) => {
    const body = z
      .object({
        code: z.string(),
        hostId: z.string(),
        teamAName: z.string().optional(),
        teamBName: z.string().optional(),
        categoryIds: z.array(z.string()).min(2),
        selectedBy: z.record(z.enum(["A", "B"])),
        powerUpsA: z.array(z.string()),
        powerUpsB: z.array(z.string()),
        settings: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const game = await startGameSession({
      code: body.code,
      hostId: body.hostId,
      teamAName: body.teamAName,
      teamBName: body.teamBName,
      categoryIds: body.categoryIds,
      selectedBy: body.selectedBy as never,
      powerUpsA: body.powerUpsA as never,
      powerUpsB: body.powerUpsB as never,
      settings: body.settings as never,
    });
    return { game };
  });

  app.get("/games/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const game = getGame(id);
    if (!game) {
      const row = await prisma.game.findUnique({ where: { id } });
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { game: row.stateJson };
    }
    let question = null;
    if (game.activeQuestion) {
      const q = getQuestion(game.activeQuestion.questionId);
      if (q) {
        question = toPublicFromCache(
          q,
          game.phase === "REVEAL" || game.activeQuestion.answerRevealed
        );
        if (game.activeQuestion.hintRevealed && q.hint) {
          question.hint = q.hint;
        }
      }
    }
    return { game, question };
  });

  app.get("/games/:id/question/:qid", async (req, reply) => {
    const { qid } = req.params as { id: string; qid: string };
    const reveal = (req.query as { reveal?: string }).reveal === "1";
    let q = getQuestion(qid);
    if (!q) {
      const row = await prisma.question.findUnique({ where: { id: qid } });
      if (!row) return reply.code(404).send({ error: "Not found" });
      return toPublicQuestion(row, reveal);
    }
    return toPublicFromCache(q, reveal);
  });

  app.post("/games/:id/select", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        categoryId: z.string(),
        slotIndex: z.number().int().min(0).max(5),
      })
      .parse(req.body);
    try {
      const game = gameSelectCell(id, body.categoryId, body.slotIndex);
      const q = getQuestion(game.activeQuestion!.questionId);
      return {
        game,
        question: q ? toPublicFromCache(q, false) : null,
      };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/reveal", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const { state, question } = gameRevealAnswer(id);
      return {
        game: state,
        question: question ? toPublicFromCache(question, true) : null,
      };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/award", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        awardedTo: z.enum(["A", "B"]).nullable(),
      })
      .parse(req.body);
    try {
      const { state, result, question } = gameAwardPoints(id, body.awardedTo);
      return {
        game: state,
        result,
        question: toPublicFromCache(question, true),
      };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/powerup", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        teamId: z.enum(["A", "B"]),
        powerUp: z.string(),
      })
      .parse(req.body);
    try {
      const game = gameUsePowerUp(id, body.teamId, body.powerUp as never);
      const q = game.activeQuestion
        ? getQuestion(game.activeQuestion.questionId)
        : null;
      const pub = q ? toPublicFromCache(q, false) : null;
      if (pub && game.activeQuestion?.hintRevealed && q?.hint) {
        pub.hint = q.hint;
      }
      return { game, question: pub };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/continue", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const game = gameContinue(id);
      return { game };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/score", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        teamId: z.enum(["A", "B"]),
        delta: z.number().int(),
      })
      .parse(req.body);
    try {
      const game = gameAdjustScore(id, body.teamId, body.delta);
      return { game };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });

  app.post("/games/:id/finish", async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const game = gameFinish(id);
      return { game };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "Error" });
    }
  });
}
