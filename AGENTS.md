<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview

TaskHub is a Next.js 16 (App Router) full-stack app with PostgreSQL (Prisma ORM). Core features: Task Hub (weekly tasks, logs, AI agents), P21 SQL Query Master, BOSS (business-rule agent), Department Playbooks, Voice Assistant, Corpus Builder, and Multi-Agent Assessment.

### Prerequisites

- **Node.js 20.x** — pinned in `.nvmrc`; use `nvm use 20` if needed.
- **PostgreSQL 16** — must be running locally. The update script handles `npm install` and Prisma generation; you must ensure Postgres is started before running the dev server or migrations.

### Starting PostgreSQL

```bash
sudo pg_ctlcluster 16 main start
```

The local dev database is `taskhub_dev` owned by the local OS user with a password set via `ALTER USER ... WITH PASSWORD '...'`.

### Environment

The `.env` file (gitignored) must contain at minimum:

```
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/taskhub_dev"
```

**Gotcha:** If a `DATABASE_URL` shell environment variable is injected (e.g. pointing to a Neon cloud DB), it overrides `.env`. Unset it before running dev commands: `unset DATABASE_URL`.

### Database migrations

```bash
npx prisma migrate dev
```

### Standard commands

See `README.md` → **Scripts** table. Key ones:

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run lint` | ESLint (pre-existing warnings/errors in codebase) |
| `npm run build` | Production build (requires `DATABASE_URL`) |

### AI features

AI features (monitor, daily summary, voice, BOSS, P21 SQL, playbook expansion) require an OpenAI API key — either `OPENAI_API_KEY` in `.env` or BYOK via the browser UI. Core CRUD (tasks, logs, playbooks structure) works without any API key.
