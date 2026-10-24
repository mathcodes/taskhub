#!/usr/bin/env node
/**
 * Prisma schema uses DIRECT_URL for migrations. If unset, default to DATABASE_URL
 * so single-URL setups work (e.g. direct Neon URL only).
 * Neon pooler + migrate: set DIRECT_URL to the non-pooler "Direct" string from Neon.
 */
import "dotenv/config";

const u = process.env.DATABASE_URL?.trim() ?? "";
const d = process.env.DIRECT_URL?.trim();

if (u && !d) {
  process.env.DIRECT_URL = u;
}
