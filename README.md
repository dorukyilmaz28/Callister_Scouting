# Callister_Scouting

Callister 9024 – FRC 2026 için mobil öncelikli dijital scouting uygulaması. Yarışmalarda kağıt scouting’in yerini alır.

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Neon PostgreSQL
- **Auth:** Cookie-based sessions with role-based access (admin, scout, strategy)

## Features

- **Roles:** admin, scout, strategy. Scouts see only their assigned teams.
- **Events & teams:** Create events, add team numbers. Admin assigns exactly 2 teams per scout per event.
- **Pit scouting:** Drivetrain, robot type, intake, shooter, climb, notes.
- **Match scouting:** Auto (attempted, score, consistency), teleop (game pieces, cycle speed, defense), endgame (climb), driver skill, comments.
- **Team summary:** Averages, climb rate, pit vs match comparison.
- **Export:** Admin can download CSV (all data, team summaries, full event data).
- **Nexus live integration:** Live queue/on-deck style data and pit addresses for assigned teams (if event is available in Nexus).

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database (Neon PostgreSQL)

Create a project at [neon.tech](https://neon.tech), copy the connection string, and add to `.env`:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
JWT_SECRET="your-long-random-secret-at-least-32-chars"
```

See `.env.example` for a template.

### Optional API keys

- `FRC_EVENTS_API_USER` + `FRC_EVENTS_API_KEY`: official live scores/schedule/rankings.
- `NEXUS_API_KEY`: Nexus live event feed and pit addresses.
- Note: Nexus live data coverage depends on event-level Nexus availability; some events may return partial or no data.

### 3. Push schema and seed admin

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

Default seed creates admin `admin@scout.local` / `admin123`. Override with:

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD=yourpass npm run db:seed
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, then go to Events.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB (no migrations) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Create default admin user |

## Project layout

- `prisma/schema.prisma` – Database schema
- `src/app/api/` – API routes (auth, events, pit-scout, match-scout, export)
- `src/app/events/` – Event list, detail, pit/match forms, teams, assign, export
- `src/lib/auth.ts` – Session helpers (login, requireRole, etc.)
- `src/lib/db.ts` – Prisma client
- `src/lib/constants.ts` – Form option constants

## Vercel deployment

1. Repoyu Vercel’e bağla (Import Git Repository).
2. **Root Directory:** Boş bırak veya `.` (proje kökü).
3. **Framework Preset:** Next.js (genelde otomatik seçilir).
4. **Build Command:** `npm run build` (veya boş bırak, varsayılan kullanılır).
5. **Environment Variables** (Project Settings → Environment Variables):
   - `DATABASE_URL` → Neon connection string (örn. `postgresql://...?sslmode=require`)
   - `JWT_SECRET` → En az 32 karakter rastgele string
6. Deploy’u tetikle. Build log’da hata yoksa ana sayfa (`/`) açılmalıdır.

**404 NOT_FOUND alıyorsan:**
- Build log’da hata var mı kontrol et; `prisma generate` veya `next build` hata veriyorsa önce onu düzelt.
- Root Directory’nin proje kökü (package.json’ın olduğu klasör) olduğundan emin ol.
- Production/Preview ortamında `DATABASE_URL` ve `JWT_SECRET` tanımlı mı kontrol et.

## Offline / reliability

- Built for poor competition wifi: minimal dependencies, simple forms, large tap targets.
- No offline persistence yet; add a service worker and IndexedDB later if needed.
- Export is one-click CSV for backup and analysis in Excel.

## Creating users

Only admins can create users. Use the Register API (or add a simple admin UI):

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-admin-session-cookie>" \
  -d '{"email":"scout@team.org","password":"secret","role":"scout","name":"Scout One"}'
```

Roles: `admin`, `scout`, `strategy`.
