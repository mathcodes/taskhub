import { NextResponse } from "next/server";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";
import { runNlToSqlAgent } from "@/lib/sql-query/agents/nlToSqlAgent";
import { runSqlReviewAgent } from "@/lib/sql-query/agents/sqlReviewAgent";

export const runtime = "nodejs";

const DIALECTS = new Set(["PostgreSQL", "MySQL", "SQLite", "SQL Server"]);

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key. Set OPENAI_API_KEY on the server or use the API key control in the header." },
      { status: 503 }
    );
  }

  let body: { question?: string; dialect?: string; schemaContext?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  const dialect = body.dialect?.trim() || "PostgreSQL";
  const schemaContext = body.schemaContext?.trim().slice(0, 30_000);
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
  if (!DIALECTS.has(dialect)) return NextResponse.json({ error: "Unsupported SQL dialect" }, { status: 400 });

  try {
    const generated = await runNlToSqlAgent({
      userQuestion: question,
      dialect,
      schemaContext,
      apiKey,
    });
    const review = await runSqlReviewAgent({
      sql: generated.sql,
      userQuestion: question,
      dialect,
      apiKey,
    });
    return NextResponse.json({ question, dialect, ...generated, review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SQL generation failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}