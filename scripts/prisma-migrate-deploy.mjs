#!/usr/bin/env node
import "./ensure-direct-url.mjs";
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
