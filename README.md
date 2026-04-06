# Task Hub

**Agentic Task Hub** is a [Next.js](https://nextjs.org) app with a landing page of self-contained tools: **Task Hub** (weekly tasks, logs, and AI briefings), **P21 SQL Query Master** (natural language → T-SQL sketches), **BOSS** (P21 business rule agent — multi-agent pipeline to full C# from your training corpus), and **Department playbooks** (SOP checklists with worker links). Optional AI features include a **monitor** agent (alerts from your snapshot), a **daily summary** agent (Markdown brief), and a **voice assistant** that understands what’s on screen and can add tasks from natural language.

Dark UI, [Prisma](https://www.prisma.io/) with PostgreSQL, and **bring-your-own-key (BYOK)** OpenAI so you can deploy publicly without putting your API key in server env.

---

## Screenshots

Static captures in `public/` are named **`0-` … `10-`** (shown in numeric order). Headings group them by feature.

### Department playbooks (`0-` … `2-`)

Supervisors paste JSON playbooks; the app expands steps with an agent, assigns workers, and sends private links. **Preview walkthrough** and **Open walkthrough (sent)** open the chart + table + step-by-step modal.

![`0-` Playbooks — create and expand](public/0-Playbook1.png)

![`1-` Playbooks — assign workers and guide buttons](public/1-Playbook2.png)

![`2-` Playbooks — results and saved list](public/2-Playbook3.png)

### Agent workspace (`3-`)

Landing page: open **Task Hub**, **P21 SQL Query Master**, **BOSS**, or **Department playbooks**; sticky bar has **API key** (BYOK), dictate, and voice mic.

![`3-` Agent workspace — feature cards](public/3-MainApp.png)

### BOSS — Business Rule agent (`4-` … `6-`)

Natural-language rule → multi-agent pipeline → full C# from `DCNA_BR_TEMPLATE_v1` and your `docs/p21/training/boss/` corpus.

![`4-` BOSS — request and retrieval](public/4-BusinessRuleBOSS.png)

![`5-` BOSS — synthesis and generated C#](public/5-BusinessRuleBOSS2.png)

![`6-` BOSS — stages and detail](public/6-BusinessRuleBOSS3.png)

### P21 SQL Query Master (`7-` … `8-`)

Plain English → T-SQL + review against the bundled dictionary; SQL is not run in-app.

![`7-` SQL Query Master — question and output](public/7-SQLQueryMaster1.png)

![`8-` SQL Query Master — review](public/8-SQLQueryMaster2.png)

### Task Hub (`9-` … `10-`)

Weekly tasks, **Today**, activity log, and agents (monitor + daily summary).

![`9-` Task Hub — dashboard area](public/9-TaskHub1.png)

![`10-` Task Hub — tasks / log / agents](public/10-TaskHub2.png)

### Older captures (optional)

Earlier static shots: **Today** tab [`IMG1.png`](public/IMG1.png), voice panel [`IMG2.png`](public/IMG2.png), header controls [`IMG3.png`](public/IMG3.png).

### BOSS example (PDF)

Export of the **BOSS** flow (generated rule spec / C# context): **[Open or download the example (PDF)](public/p21-boss-business-rule-agent.pdf)**

---

## Features

| Area | What it does |
|------|----------------|
| **Tasks** | Create tasks with title, description, priority, and weekly schedules (weekday + optional `HH:MM` in your timezone). |
| **Today** | Derived “slots” for the current day; log completions with optional rating and notes. |
| **Activity log** | History of completions across tasks. |
| **Agents** | **Monitor** — JSON alerts/insights from a live snapshot; **Daily summary** — Markdown report from yesterday’s logs + today’s snapshot. |
| **P21 SQL** | NL → SQL + review using a bundled P21 schema dictionary (`docs/p21/training/`); SQL is not executed in-app. |
| **BOSS** | Business rule agent: retrieval over examples + docs + T-SQL sketches, synthesis into full C# from `DCNA_BR_TEMPLATE_v1`; see [PDF example](public/p21-boss-business-rule-agent.pdf). |
| **Playbooks** | Supervisors upload JSON playbooks; workers complete steps via token links (email/SMS). |
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

- `src/app/` — App Router pages and `api/` routes (tasks, snapshot, agents, voice, P21, playbooks).
- `src/components/` — `Dashboard`, `FeatureHub`, P21 panels, playbooks UI, voice + BYOK.
- `src/lib/` — Prisma client, scheduling/snapshot helpers, OpenAI agents, P21 BOSS pipeline.
- `docs/p21/training/` — P21 training files (BOSS bundle, NL-SQL examples, SQL dictionary).
- `prisma/` — Schema and migrations (PostgreSQL).
- `public/` — Screenshots `0-` … `10-` (see [Screenshots](#screenshots)), optional `IMG*.png`, and [example PDF](public/p21-boss-business-rule-agent.pdf).

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
