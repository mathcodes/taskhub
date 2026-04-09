<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Services overview

Single Next.js 16 app (not a monorepo) with PostgreSQL via Prisma. See `README.md` for full feature list and scripts table.

### Running the app

- **Node 20.x** is required (`.nvmrc`). The VM uses nvm: `source ~/.nvm/nvm.sh && nvm use 20`.
- **PostgreSQL 16** runs locally. Start with `sudo pg_ctlcluster 16 main start`.
- Database: `taskhub_dev` on localhost, user `ubuntu`/`devpass`. The `.env` file has `DATABASE_URL` pointing to it.
- After install: `npx prisma migrate dev` applies migrations. The `postinstall` script auto-runs `prisma generate`.
- Dev server: `npm run dev` → http://localhost:3000.

### Gotchas

- **Prisma config** (`prisma.config.ts`) loads `.env` via `dotenv/config`. If `DATABASE_URL` in `.env` is wrong, Prisma commands will silently connect to the wrong DB. Always verify `.env` has the local URL.
- **ESLint** reports errors in `src/generated/prisma/` (auto-generated code). These are expected and not fixable. The ESLint config does not ignore this directory — when checking lint results, filter out `src/generated/` lines. There are also 4 pre-existing lint errors in `src/components/playbooks/PlaybookGuideModal.tsx` (`react-hooks/immutability`).
- **AI features** require `OPENAI_API_KEY` in `.env` or a user-provided BYOK key in the browser. Without it, only CRUD task management works.
- The app has no automated test suite (no `test` script in `package.json`). Verification is via lint + dev server + manual API/UI testing.
