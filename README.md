# Task Hub

**Live demo:** [taskhub-blue-seven.vercel.app](https://taskhub-blue-seven.vercel.app) · try [Pitch Coach](https://taskhub-blue-seven.vercel.app/pitch-coach) with the built-in sample. AI features are bring-your-own-key (**Add API keys** in the header); keys stay in your browser.

**Agentic Task Hub** is a [Next.js](https://nextjs.org) app with a landing page of self-contained tools: **Task Hub** (weekly tasks, logs, and AI briefings), **SQL Query** (plain language to reviewed, read-only SQL), **Department playbooks** (SOP checklists with worker links), **Corpus Builder**, and **Pitch Coach** (recording-to-score pitch analysis). Optional AI features include a **monitor** agent (alerts from your snapshot), a **daily summary** agent (Markdown brief), and a voice assistant that understands what is on screen and can add tasks from natural language.

Dark UI, [Prisma](https://www.prisma.io/) with PostgreSQL, and **bring-your-own-key (BYOK)** OpenAI so you can deploy publicly without putting your API key in server env.

---

## Examples

### Department playbooks  

Supervisors paste JSON playbooks; the app expands steps with an agent, assigns workers, and sends private links. **Preview walkthrough** and **Open walkthrough (sent)** open the chart + table + step-by-step modal.

![`0-` Playbooks — create and expand](public/0-Playbook1.png)

![`1-` Playbooks — assign workers and guide buttons](public/1-Playbook2.png)

![`2-` Playbooks — results and saved list](public/2-Playbook3.png)

### Agent workspace (`3-`)

Landing page: open **Task Hub**, **SQL Query**, **Pitch Coach**, **Department playbooks**, or **Corpus Builder**. The sticky header provides tool navigation, API key controls, dictation, and voice input.

![`3-` Agent workspace — feature cards](public/3-MainApp.png)

### SQL Query

Plain language to reviewed, read-only SQL for PostgreSQL, MySQL, SQLite, or SQL Server. Optional schema context keeps generated table and column names grounded. SQL is not executed in-app.

### Task Hub

Weekly tasks, **Today**, activity log, and agents (monitor + daily summary).

![`9-` Task Hub — dashboard area](public/9-TaskHub1.png)

![`10-` Task Hub — tasks / log / agents](public/10-TaskHub2.png)

### Older captures (optional)

Earlier static shots: **Today** tab [`IMG1.png`](public/IMG1.png), voice panel [`IMG2.png`](public/IMG2.png), header controls [`IMG3.png`](public/IMG3.png).

## Features

| Area | What it does |
|------|----------------|
| **Tasks** | Create tasks with title, description, priority, and weekly schedules (weekday + optional `HH:MM` in your timezone). |
| **Today** | Derived “slots” for the current day; log completions with optional rating and notes. |
| **Activity log** | History of completions across tasks. |
| **Agents** | **Monitor** — JSON alerts/insights from a live snapshot; **Daily summary** — Markdown report from yesterday’s logs + today’s snapshot. |
| **SQL Query** | Plain language → read-only SQL with dialect selection, optional schema context, and a safety review. SQL is not executed in-app. |
| **Playbooks** | Supervisors upload JSON playbooks; workers complete steps via token links (email/SMS). |
| **Pitch Coach** | Record, upload, or use the sample; notes are detected in the browser, measured in cents, aligned to your note list, and summarized with coaching feedback (Claude with your key, or built-in). Audio never leaves the device. |
| **Voice** | Page-aware chat + optional task creation; requires an OpenAI key (server env or BYOK). |
| **BYOK** | Paste your key in **API key**; stored in `localStorage` only, sent over HTTPS on AI requests. Falls back to `OPENAI_API_KEY` on the server if unset. |

---

## Requirements

- **Node.js** **20.x** (LTS; see `engines` in `package.json` and `.nvmrc`)
- **npm** (or pnpm/yarn/bun)
- **OpenAI** API access for AI features (or rely on server-side `OPENAI_API_KEY` in development)

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy the example env and adjust:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | **PostgreSQL** URL — see `.env.example` |
| `DIRECT_URL` | Optional: Neon **direct** (non-pooler) URL for migrations. Required if `DATABASE_URL` uses Neon’s pooler host (`-pooler`); see [`VERCEL.md`](VERCEL.md) |
| `OPENAI_API_KEY` | Optional on the server if every user brings their own key (BYOK) |
| `ANTHROPIC_API_KEY` | Optional server fallback for Claude features; visitors can add their own key instead |
| `TASKHUB_TIMEZONE` | IANA timezone for schedules (e.g. `America/New_York`) |
| `OPENAI_CHAT_MODEL` | Optional override (default `gpt-4o-mini`) |

### 3. Database

Create a Postgres database, set `DATABASE_URL` in `.env`, then:

```bash
npx prisma migrate dev
```

This applies migrations in `prisma/migrations`. The app **does not** use SQLite anymore (serverless hosts like Vercel need Postgres or another hosted SQL).

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Pitch Coach needs no extra setup: note detection runs in the browser with Spotify Basic Pitch (TensorFlow.js) and YIN pitch refinement. Try it with the built-in sample recording.

### 5. Production build

```bash
npm run build
npm start
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma migrate deploy` + `next build` (needs `DATABASE_URL`; Neon pooler also needs `DIRECT_URL`) |
| `npm run start` | Production server |
| `npm run lint` | ESLint |

---

## Project layout (high level)

- `src/app/` — App Router pages and API routes for tasks, SQL Query, Pitch Coach, playbooks, and agents.
- `src/components/` — Shared shell, dashboard, feature hub, playbooks UI, voice, and BYOK controls.
- `src/lib/` — Prisma client, scheduling helpers, SQL generation/review, and shared agents.
- `src/lib/pitchCoach/` — in-browser note detection (Basic Pitch + YIN) and score alignment.
- `prisma/` — Schema and migrations (PostgreSQL).
- `public/` — Product screenshots and public static assets.

---

## Deploying publicly

- **Vercel / serverless:** Use a hosted Postgres (e.g. [Neon](https://neon.tech)). Set `DATABASE_URL` in the project’s environment variables. See [`VERCEL.md`](VERCEL.md).
- For **no shared OpenAI bill**, omit `OPENAI_API_KEY` and document that users must use **API key** in the app (BYOK).
- Use **HTTPS** in production; voice uses the browser **Web Speech API** (e.g. Chromium, Safari).

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Prisma documentation](https://www.prisma.io/docs)

---

## Legal (disclaimers, terms, privacy)

This project includes **generic legal-style documents** to document limitations of liability and AI-related risks. **They are not legal advice** and may not be sufficient for your situation or jurisdiction.

| Document | Purpose |
|----------|---------|
| [`DISCLAIMER.md`](DISCLAIMER.md) | “As is” software, **no warranty**, **limitation of liability**, AI output risks, third-party services |
| [`TERMS_OF_USE.md`](TERMS_OF_USE.md) | End-user style **acceptable use**, AI/BYOK responsibilities, **indemnification** (template — fill in governing law) |
| [`PRIVACY.md`](PRIVACY.md) | High-level **privacy** notes for self-hosting, BYOK, and third parties (template for your own policy) |

**You** (maintainer or host) should have a **qualified attorney** review these before relying on them for a public product, company, or regulated environment.

---

## License

Private / your choice — add a `LICENSE` file if you open-source the repo.
