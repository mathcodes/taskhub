import { NextResponse } from "next/server";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";
import { runNlToSqlAgent } from "@/lib/p21/agents/nlToSqlAgent";
import { runSqlReviewAgent } from "@/lib/p21/agents/sqlReviewAgent";
import { retrieveRelevantSchema } from "@/lib/p21/schemaDictionary";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = resolveOpenAIKeyFromRequest(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "No API key. Set OPENAI_API_KEY on the server or use the API key control (BYOK) in the app header.",
      },
      { status: 503 }
    );
  }

  let body: { question?: string; skipReview?: boolean };
  try {
    body = (await req.json()) as { question?: string; skipReview?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    const { markdown, tables, rowCount } = retrieveRelevantSchema(question, { maxTables: 14 });
    const nl = await runNlToSqlAgent({
      userQuestion: question,
      schemaMarkdown: markdown,
      apiKey,
    });

    let review = null as Awaited<ReturnType<typeof runSqlReviewAgent>> | null;
    if (!body.skipReview) {
      review = await runSqlReviewAgent({
        sql: nl.sql,
        userQuestion: question,
        apiKey,
      });
    }

    return NextResponse.json({
      question,
      sql: nl.sql,
      explanation: nl.explanation,
      tablesReferenced: nl.tablesReferenced,
      schema: {
        tablesMatched: tables,
        dictionaryRowsUsed: rowCount,
      },
      review,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "P21 NL→SQL failed";
    const status = msg.includes("not found") ? 500 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
