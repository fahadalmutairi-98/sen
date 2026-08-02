/**
 * Download MinIO bucket objects into apps/web/public/uploads
 * and rewrite localhost MinIO URLs in Postgres to /uploads/...
 *
 * Usage (from repo root, with docker MinIO + local DB running):
 *   node scripts/migrate-minio-to-public.mjs
 */
import Minio from "minio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "apps/web/public/uploads");
const PREFIX = process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000/seen-media";

const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
});

const bucket = process.env.MINIO_BUCKET ?? "seen-media";
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

function toPublic(url) {
  if (!url?.startsWith(PREFIX)) return null;
  return `/uploads/${url.slice(PREFIX.length).replace(/^\//, "")}`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const stream = client.listObjectsV2(bucket, "", true);
  const objects = [];
  for await (const obj of stream) {
    if (obj.name) objects.push(obj);
  }
  console.log(`Downloading ${objects.length} object(s) → ${outDir}`);
  for (const obj of objects) {
    const dest = path.join(outDir, obj.name);
    await client.fGetObject(bucket, obj.name, dest);
    console.log(" ", obj.name);
  }

  let rewritten = 0;
  for (const row of await prisma.category.findMany({
    where: { imageUrl: { startsWith: PREFIX } },
  })) {
    const next = toPublic(row.imageUrl);
    if (!next) continue;
    await prisma.category.update({ where: { id: row.id }, data: { imageUrl: next } });
    rewritten++;
  }
  for (const row of await prisma.question.findMany({
    where: { mediaUrl: { startsWith: PREFIX } },
  })) {
    const next = toPublic(row.mediaUrl);
    if (!next) continue;
    await prisma.question.update({ where: { id: row.id }, data: { mediaUrl: next } });
    rewritten++;
  }
  for (const row of await prisma.mediaAsset.findMany({
    where: { url: { startsWith: PREFIX } },
  })) {
    const next = toPublic(row.url);
    if (!next) continue;
    await prisma.mediaAsset.update({ where: { id: row.id }, data: { url: next } });
    rewritten++;
  }
  console.log(`Rewrote ${rewritten} DB URL(s) to /uploads/...`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
