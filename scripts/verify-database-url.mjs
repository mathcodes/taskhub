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

process.exit(0);
