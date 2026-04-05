#!/usr/bin/env node
/**
 * Fails fast with a clear message if DATABASE_URL is missing or not Postgres.
 * Vercel / CI often mis-set this (wrong env scope, quotes in the value, old SQLite URL).
 */
import "dotenv/config";

const u = process.env.DATABASE_URL?.trim() ?? "";

if (!u) {
  console.error(
    "[taskhub] DATABASE_URL is missing.\n" +
      "Set it in Vercel: Project → Settings → Environment Variables.\n" +
      "Use the same variable for Production and Preview if you deploy previews.\n" +
      "Example: postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
  );
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//i.test(u)) {
  console.error(
    "[taskhub] DATABASE_URL must start with postgresql:// or postgres://\n" +
      `Got (first 40 chars): ${u.slice(0, 40)}${u.length > 40 ? "…" : ""}\n` +
      "Remove SQLite URLs (file:./…). In Vercel, paste the Neon URL only — no extra quotes around the whole string."
  );
  process.exit(1);
}

// Neon pooler: migrate deploy may hit P1002; use a direct Neon URL for DATABASE_URL when migrating, or run migrate locally.
if (/-pooler/i.test(u)) {
  console.warn(
    "[taskhub] DATABASE_URL looks like Neon pooler. If migrate deploy times out (P1002), use Neon’s direct connection string for DATABASE_URL during migrate, or run migrations from a machine with direct DB access."
  );
}

process.exit(0);
