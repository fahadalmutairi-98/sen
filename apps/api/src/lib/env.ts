import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../../.env") });

const storageMode = (process.env.STORAGE_MODE ?? "auto").toLowerCase();

export const env = {
  // Render injects PORT; prefer it in production.
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  host: process.env.API_HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  /** Public base URL of this API (used for /media and /uploads links in prod). */
  publicUrl: (process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`).replace(
    /\/$/,
    ""
  ),
  databaseUrl: process.env.DATABASE_URL!,
  /**
   * auto  — try MinIO, then local disk
   * minio — MinIO/S3 only
   * local — API disk (/uploads)
   * db    — store bytes in Postgres (best for free Render + Neon testing)
   */
  storageMode: (["auto", "minio", "local", "db"].includes(storageMode)
    ? storageMode
    : "auto") as "auto" | "minio" | "local" | "db",
  minio: {
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: Number(process.env.MINIO_PORT ?? 9000),
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "seen-media",
    useSSL: process.env.MINIO_USE_SSL === "true",
    publicUrl: process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000/seen-media",
  },
};
