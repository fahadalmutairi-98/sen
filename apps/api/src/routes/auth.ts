import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(2),
      })
      .parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.code(409).send({ error: "Email already registered" });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
        displayName: body.displayName,
        isGuest: false,
      },
    });

    const token = app.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } };
  });

  app.post("/auth/login", async (req, reply) => {
    const body = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) return reply.code(401).send({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

    const token = app.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } };
  });

  app.post("/auth/guest", async (req) => {
    const body = z.object({ displayName: z.string().min(1).default("ضيف") }).parse(req.body ?? {});
    const user = await prisma.user.create({
      data: { displayName: body.displayName, isGuest: true },
    });
    const token = app.jwt.sign({ sub: user.id, role: user.role, guest: true });
    return { token, user: { id: user.id, displayName: user.displayName, role: user.role, isGuest: true } };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const payload = req.user as { sub: string };
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isGuest: user.isGuest,
    };
  });
}
