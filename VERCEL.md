# Deploying on Vercel

## Why Postgres

Vercel’s serverless runtime does **not** support a durable on-disk SQLite file. This project uses **PostgreSQL** so API routes can persist tasks and logs.

## Steps

1. **Create a database**  
   - [Neon](https://neon.tech) (free tier) or any Postgres host.  
   - Copy the connection string (use **SSL** where required, e.g. `?sslmode=require`).

2. **Connect the GitHub repo** in Vercel and add environment variables:

   | Name | Required | Notes |
   |------|----------|--------|
   | `DATABASE_URL` | Yes | Postgres URL from Neon/host |
   | `OPENAI_API_KEY` | Optional | If unset, users can use BYOK in the app |
   | `TASKHUB_TIMEZONE` | Optional | e.g. `America/New_York` |

3. **Deploy**  
   The build runs `prisma migrate deploy && next build`, which applies migrations to your database and then builds Next.js.

4. **Neon + Prisma**  
   For connection pooling with Neon, you may use their pooled URL and Prisma’s [recommended query params](https://www.prisma.io/docs/orm/overview/databases/neon).

## Build stuck on `prisma generate`

- Ensure `DATABASE_URL` is set for **Production** (and Preview if you use preview deploys) in Vercel **before** the build runs.  
- `postinstall` runs `prisma generate`, which needs `DATABASE_URL` present in the environment so the schema can be resolved.

## Migrating from an old SQLite checkout

If you previously used `file:./dev.db`, switch `.env` to a Postgres URL, run `npx prisma migrate dev` locally once, and redeploy.
