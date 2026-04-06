import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { OUTPUT_FILES } from "@/lib/corpusBuilder/constants";
import { outputDirForRun } from "@/lib/corpusBuilder/paths";

export const runtime = "nodejs";

const ALLOWED = new Set<string>(OUTPUT_FILES);

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string; filename: string }> }
) {
  const { runId, filename } = await ctx.params;
  if (!isUuid(runId)) {
    return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
  }
  if (!ALLOWED.has(filename)) {
    return NextResponse.json({ error: "Unknown file" }, { status: 404 });
  }

  const dir = outputDirForRun(runId);
  const path = join(dir, filename);
  try {
    const buf = await readFile(path);
    const isJson = filename.endsWith(".json");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": isJson ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
