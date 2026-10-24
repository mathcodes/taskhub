import { NextResponse } from "next/server";
import { runCorpusBuilderPipeline, type CorpusFileInput } from "@/lib/corpusBuilder/pipeline";
import { resolveOpenAIKeyFromRequest } from "@/lib/openaiRequestKey";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const urlField = typeof form.get("urls") === "string" ? (form.get("urls") as string) : "";
  const rawFiles = form.getAll("files");
  const files: CorpusFileInput[] = [];

  for (const item of rawFiles) {
    if (!(item instanceof File) || item.size === 0) continue;
    const buffer = Buffer.from(await item.arrayBuffer());
    files.push({
      name: item.name || "upload.bin",
      type: item.type || "application/octet-stream",
      buffer,
    });
  }

  try {
    const result = await runCorpusBuilderPipeline({
      apiKey,
      files,
      urlField,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Corpus builder failed";
    const status = msg.includes("Too many") || msg.includes("at least one") ? 400 : 422;
    return NextResponse.json({ error: msg }, { status });
  }
}
