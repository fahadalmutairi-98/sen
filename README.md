# سين جيم — Seen Jeem

Professional multiplayer Arabic trivia party game inspired by [seenjeemkw.com](https://seenjeemkw.com/).

**Arabic-first (RTL)** with English support. Six categories, 36 questions, strategic power-ups, local + online multiplayer.

## Architecture

```
sen/
├── apps/web          # Next.js 15 (React, Tailwind, Framer Motion)
├── apps/api          # Fastify + Socket.IO + Prisma
├── packages/shared   # Types, game/scoring/power-up engines
└── docker-compose.yml  # PostgreSQL + MinIO only
```

| Layer | Stack |
|-------|--------|
| Frontend | Next.js App Router, Zustand, Framer Motion, RTL i18n |
| Backend | Fastify REST + Socket.IO realtime |
| Game logic | Authoritative engine in `@seen/shared` |
| Database | PostgreSQL via Prisma |
| Media | MinIO (S3-compatible) |

Docker runs **only** Postgres and MinIO — not the app frameworks.

## Quick start

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

### 2. Install & boot infra

```bash
cp .env.example .env
pnpm install
pnpm docker:up
```

### 3. Database migrate + seed (1000+ questions)

```bash
pnpm --filter @seen/api prisma:migrate:dev
pnpm db:seed
```

Or one-shot:

```bash
pnpm setup
```

### 4. Run apps

```bash
# terminal 1
pnpm dev:api

# terminal 2
pnpm dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:4000  
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`)

### Admin

- URL: http://localhost:3000/admin  
- Email: `admin@seenjeem.local`  
- Password: `admin123456`

## Gameplay (Classic — Seen Jeem style)

1. Create game → pick mode (Classic / Quick / Party / Custom)
2. Name Team A & Team B
3. Each team picks **3 categories** (6 total → 36 cells)
4. Each team picks **3 power-ups**
5. Board: current team picks category + point value (100–600)
6. Answer under timer → score update → back to board
7. Winner screen with confetti + stats

### Power-ups

| Card | Arabic | Effect |
|------|--------|--------|
| Call a Friend | اتصال بصديق | Reveal hint |
| Two Answers | جاوب جوابين | Remove 2 wrong MC options |
| The Pit | الحفرة | Correct answer also deducts from opponent |
| Trap | الفخ | Force opponent to answer; wrong = lose points |
| Rest | استريح | Bench opposing player for the question |
| Freeze / Double / Steal | — | Extra strategic cards |

## API highlights

- `POST /games/local` — start same-device game
- `POST /games/:id/select|answer|judge|powerup|continue`
- `POST /rooms` / `POST /rooms/join` — online rooms
- Socket.IO `event` channel for realtime sync
- ` /admin/*` — questions CRUD, import/export, media upload

## Environment

See `.env.example`. Key vars:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`
- MinIO credentials

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm docker:up` | Start Postgres + MinIO |
| `pnpm db:seed` | Seed categories + 1000+ questions |
| `pnpm dev:api` | API on :4000 |
| `pnpm dev:web` | Web on :3000 |
| `pnpm build` | Build all packages |

## License

Private / commercial use as you decide.
