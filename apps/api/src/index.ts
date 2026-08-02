import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Server } from "socket.io";
import path from "path";
import { mkdirSync } from "fs";
import { env } from "./lib/env";
import { authRoutes } from "./routes/auth";
import { gameRoutes } from "./routes/games";
import { adminRoutes } from "./routes/admin";
import { registerSockets } from "./sockets";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
}

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.corsOrigin, credentials: true });
  await app.register(jwt, { secret: env.jwtSecret });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  const uploadsDir = path.resolve(process.cwd(), "uploads");
  mkdirSync(uploadsDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.decorate("authenticate", async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.get("/health", async () => ({ ok: true, service: "seen-api" }));

  await app.register(authRoutes);
  await app.register(gameRoutes);
  await app.register(adminRoutes);

  await app.listen({ port: env.port, host: env.host });

  const io = new Server(app.server, {
    cors: { origin: env.corsOrigin, methods: ["GET", "POST"] },
  });
  registerSockets(io);

  console.log(`🎮 Seen Jeem API on http://${env.host}:${env.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
