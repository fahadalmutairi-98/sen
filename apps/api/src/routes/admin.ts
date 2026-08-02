import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Client as MinioClient } from "minio";
import { env } from "../lib/env";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function requireAdmin(app: FastifyInstance) {
  return async (req: any, reply: any) => {
    await app.authenticate(req, reply);
    if (reply.sent) return;
    const payload = req.user as { role?: string };
    if (payload.role !== "ADMIN") {
      return reply.code(403).send({ error: "Admin only" });
    }
  };
}

const questionTypeEnum = z.enum([
  "MULTIPLE_CHOICE",
  "TEXT",
  "TRUE_FALSE",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "DRAWING",
  "ACTING",
  "GUESS_PERSON",
  "NO_WORDS",
]);

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `cat-${Date.now()}`;
}

async function saveUploadLocal(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; objectName: string }> {
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const ext = filename.split(".").pop() ?? "bin";
  const objectName = `${randomUUID()}.${ext}`;
  await writeFile(path.join(uploadsDir, objectName), buffer);
  return {
    objectName,
    url: `${env.publicUrl}/uploads/${objectName}`,
  };
}

async function saveUploadMinio(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string }> {
  const minio = new MinioClient({
    endPoint: env.minio.endPoint,
    port: env.minio.port,
    useSSL: env.minio.useSSL,
    accessKey: env.minio.accessKey,
    secretKey: env.minio.secretKey,
  });
  const ext = filename.split(".").pop() ?? "bin";
  const objectName = `${randomUUID()}.${ext}`;
  await minio.putObject(env.minio.bucket, objectName, buffer, buffer.length, {
    "Content-Type": mimeType,
  });
  return { url: `${env.minio.publicUrl}/${objectName}` };
}

async function saveUpload(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string; storage: "minio" | "local" | "db"; data?: Buffer }> {
  const mode = env.storageMode;

  if (mode === "db") {
    return { url: "", storage: "db", data: buffer };
  }

  if (mode === "local") {
    const local = await saveUploadLocal(buffer, filename);
    return { url: local.url, storage: "local" };
  }

  if (mode === "minio") {
    const remote = await saveUploadMinio(buffer, filename, mimeType);
    return { url: remote.url, storage: "minio" };
  }

  // auto: MinIO → local disk
  try {
    const remote = await saveUploadMinio(buffer, filename, mimeType);
    return { url: remote.url, storage: "minio" };
  } catch {
    const local = await saveUploadLocal(buffer, filename);
    return { url: local.url, storage: "local" };
  }
}

function inferMediaType(mime: string): "image" | "audio" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export async function adminRoutes(app: FastifyInstance) {
  const guard = requireAdmin(app);

  app.get("/admin/stats", { preHandler: [guard] }, async () => {
    const [questions, categories, games, users, withMedia] = await Promise.all([
      prisma.question.count(),
      prisma.category.count(),
      prisma.game.count(),
      prisma.user.count(),
      prisma.question.count({ where: { mediaUrl: { not: null } } }),
    ]);
    const finished = await prisma.game.count({ where: { status: "FINISHED" } });
    const byPoints = await prisma.question.groupBy({
      by: ["points"],
      _count: true,
    });
    return {
      questions,
      categories,
      games,
      finished,
      users,
      withMedia,
      byPoints: Object.fromEntries(byPoints.map((r) => [r.points, r._count])),
    };
  });

  // ── Categories ──────────────────────────────────────────────
  app.get("/admin/categories", { preHandler: [guard] }, async () => {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    return rows.map((c) => ({
      ...c,
      questionCount: c._count.questions,
      _count: undefined,
    }));
  });

  app.get("/admin/categories/:id", { preHandler: [guard] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const cat = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    });
    if (!cat) return reply.code(404).send({ error: "Category not found" });
    const byPoints = await prisma.question.groupBy({
      by: ["points"],
      where: { categoryId: id },
      _count: true,
    });
    const byType = await prisma.question.groupBy({
      by: ["type"],
      where: { categoryId: id },
      _count: true,
    });
    return {
      ...cat,
      questionCount: cat._count.questions,
      _count: undefined,
      stats: {
        byPoints: Object.fromEntries(byPoints.map((r) => [r.points, r._count])),
        byType: Object.fromEntries(byType.map((r) => [r.type, r._count])),
      },
    };
  });

  app.post("/admin/categories", { preHandler: [guard] }, async (req, reply) => {
    const body = z
      .object({
        id: z.string().min(1).max(64).optional(),
        slug: z.string().min(1).max(64).optional(),
        nameAr: z.string().min(1),
        nameEn: z.string().min(1),
        descriptionAr: z.string().default(""),
        descriptionEn: z.string().default(""),
        icon: z.string().default("folder"),
        color: z.string().default("#FFB7CE"),
        accentColor: z.string().default("#D4B8F0"),
        imageUrl: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);

    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const id = body.id ?? slugify(body.nameEn || body.nameAr);
    const slug = body.slug ?? id;

    try {
      const created = await prisma.category.create({
        data: {
          id,
          slug,
          nameAr: body.nameAr,
          nameEn: body.nameEn,
          descriptionAr: body.descriptionAr,
          descriptionEn: body.descriptionEn,
          icon: body.icon,
          color: body.color,
          accentColor: body.accentColor,
          imageUrl: body.imageUrl ?? null,
          sortOrder: body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
          isActive: body.isActive,
        },
      });
      return created;
    } catch {
      return reply.code(400).send({ error: "Category id/slug already exists" });
    }
  });

  app.patch("/admin/categories/:id", { preHandler: [guard] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        nameAr: z.string().min(1).optional(),
        nameEn: z.string().min(1).optional(),
        descriptionAr: z.string().optional(),
        descriptionEn: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        accentColor: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
        slug: z.string().min(1).optional(),
      })
      .parse(req.body);

    try {
      return await prisma.category.update({ where: { id }, data: body });
    } catch {
      return reply.code(404).send({ error: "Category not found" });
    }
  });

  app.delete("/admin/categories/:id", { preHandler: [guard] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const count = await prisma.question.count({ where: { categoryId: id } });
    if (count > 0) {
      return reply.code(400).send({
        error: `Cannot delete: category has ${count} questions. Deactivate it instead.`,
      });
    }
    await prisma.category.delete({ where: { id } });
    return { ok: true };
  });

  // ── Questions ───────────────────────────────────────────────
  app.get("/admin/questions", { preHandler: [guard] }, async (req) => {
    const q = z
      .object({
        page: z.coerce.number().default(1),
        pageSize: z.coerce.number().default(20),
        categoryId: z.string().optional(),
        search: z.string().optional(),
        points: z.coerce.number().optional(),
        type: z.string().optional(),
        hasMedia: z
          .enum(["true", "false"])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === "true")),
        isActive: z
          .enum(["true", "false"])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === "true")),
      })
      .parse(req.query);

    const where = {
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.points ? { points: q.points } : {}),
      ...(q.type ? { type: q.type as never } : {}),
      ...(q.isActive !== undefined ? { isActive: q.isActive } : {}),
      ...(q.hasMedia === true ? { mediaUrl: { not: null } } : {}),
      ...(q.hasMedia === false ? { mediaUrl: null } : {}),
      ...(q.search
        ? {
            OR: [
              { questionTextAr: { contains: q.search, mode: "insensitive" as const } },
              { questionTextEn: { contains: q.search, mode: "insensitive" as const } },
              { answerAr: { contains: q.search, mode: "insensitive" as const } },
              { answerEn: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: [{ points: "asc" }, { createdAt: "desc" }],
        include: {
          category: { select: { id: true, nameAr: true, nameEn: true, color: true } },
        },
      }),
    ]);

    return { total, page: q.page, pageSize: q.pageSize, items };
  });

  app.get("/admin/questions/:id", { preHandler: [guard] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const item = await prisma.question.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, color: true } },
      },
    });
    if (!item) return reply.code(404).send({ error: "Not found" });
    return item;
  });

  app.post("/admin/questions", { preHandler: [guard] }, async (req, reply) => {
    const body = z
      .object({
        categoryId: z.string(),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).default("EASY"),
        points: z.number().int(),
        type: questionTypeEnum.default("TEXT"),
        language: z.string().default("ar"),
        questionTextAr: z.string().min(1),
        questionTextEn: z.string().default(""),
        answerAr: z.string().min(1),
        answerEn: z.string().default(""),
        acceptedAnswers: z.array(z.string()).default([]),
        optionsJson: z.any().optional(),
        explanationAr: z.string().optional(),
        explanationEn: z.string().optional(),
        hintAr: z.string().optional(),
        hintEn: z.string().optional(),
        mediaType: z.string().nullable().optional(),
        mediaUrl: z.string().nullable().optional(),
        mediaThumbnail: z.string().nullable().optional(),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);

    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat) return reply.code(400).send({ error: "Category not found" });

    const accepted = Array.from(
      new Set(
        [...(body.acceptedAnswers ?? []), body.answerAr, body.answerEn]
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    let type = body.type;
    if (body.mediaUrl && body.mediaType === "image") type = "IMAGE";
    if (body.mediaUrl && body.mediaType === "audio") type = "AUDIO";
    if (body.mediaUrl && body.mediaType === "video") type = "VIDEO";

    const difficulty =
      body.difficulty ??
      (body.points <= 200 ? "EASY" : body.points <= 400 ? "MEDIUM" : "HARD");

    return prisma.question.create({
      data: {
        ...body,
        type,
        difficulty,
        questionTextEn: body.questionTextEn || body.questionTextAr,
        answerEn: body.answerEn || body.answerAr,
        acceptedAnswers: accepted,
        mediaType: body.mediaUrl ? body.mediaType ?? null : null,
        mediaUrl: body.mediaUrl || null,
        mediaThumbnail: body.mediaThumbnail || null,
      },
    });
  });

  app.patch("/admin/questions/:id", { preHandler: [guard] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z
      .object({
        categoryId: z.string().optional(),
        difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]).optional(),
        points: z.number().int().optional(),
        type: questionTypeEnum.optional(),
        language: z.string().optional(),
        questionTextAr: z.string().min(1).optional(),
        questionTextEn: z.string().optional(),
        answerAr: z.string().min(1).optional(),
        answerEn: z.string().optional(),
        acceptedAnswers: z.array(z.string()).optional(),
        explanationAr: z.string().nullable().optional(),
        explanationEn: z.string().nullable().optional(),
        hintAr: z.string().nullable().optional(),
        hintEn: z.string().nullable().optional(),
        mediaType: z.string().nullable().optional(),
        mediaUrl: z.string().nullable().optional(),
        mediaThumbnail: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    try {
      const data: Record<string, unknown> = { ...body };
      if (body.mediaUrl === "") {
        data.mediaUrl = null;
        data.mediaType = null;
        data.mediaThumbnail = null;
      }
      if (body.mediaUrl && body.mediaType === "image") data.type = "IMAGE";
      if (body.mediaUrl && body.mediaType === "audio") data.type = "AUDIO";
      if (body.mediaUrl && body.mediaType === "video") data.type = "VIDEO";
      return await prisma.question.update({ where: { id }, data: data as never });
    } catch {
      return reply.code(404).send({ error: "Not found" });
    }
  });

  app.delete("/admin/questions/:id", { preHandler: [guard] }, async (req) => {
    const { id } = req.params as { id: string };
    await prisma.question.delete({ where: { id } });
    return { ok: true };
  });

  app.get("/admin/export/questions", { preHandler: [guard] }, async (req) => {
    const q = z.object({ categoryId: z.string().optional() }).parse(req.query);
    const items = await prisma.question.findMany({
      where: q.categoryId ? { categoryId: q.categoryId } : undefined,
    });
    return { exportedAt: new Date().toISOString(), count: items.length, items };
  });

  app.post("/admin/import/questions", { preHandler: [guard] }, async (req) => {
    const body = z
      .object({
        items: z.array(z.record(z.unknown())),
      })
      .parse(req.body);

    let imported = 0;
    for (const item of body.items) {
      const data = item as never;
      await prisma.question.create({ data: data });
      imported++;
    }
    return { imported };
  });

  // ── Media upload ────────────────────────────────────────────
  app.post("/admin/media/upload", { preHandler: [guard] }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "No file" });

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (!buffer.length) return reply.code(400).send({ error: "Empty file" });

    const { url, storage, data } = await saveUpload(buffer, file.filename, file.mimetype);
    const mediaType = inferMediaType(file.mimetype);

    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.filename,
        mimeType: file.mimetype,
        size: buffer.length,
        url: url || "pending",
        data: data ? new Uint8Array(data) : undefined,
      },
    });

    const finalUrl =
      storage === "db" ? `${env.publicUrl}/media/${asset.id}` : url;

    if (storage === "db") {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { url: finalUrl },
      });
    }

    return {
      ...asset,
      url: finalUrl,
      data: undefined,
      mediaType,
      storage,
    };
  });

  // Serve Postgres-backed blobs (free-tier testing without MinIO/S3)
  app.get("/media/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset?.data) return reply.code(404).send({ error: "Not found" });
    reply.header("Content-Type", asset.mimeType);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(Buffer.from(asset.data));
  });
}
