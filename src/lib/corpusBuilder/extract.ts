import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { chatCompletionMessages } from "@/lib/agents/openai";
import { MAX_CHARS_PER_SOURCE, MAX_URL_BYTES } from "@/lib/corpusBuilder/constants";

export type ExtractedSource = {
  id: string;
  label: string;
  kind: string;
  text: string;
  error?: string;
};

function truncate(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_CHARS_PER_SOURCE) return t;
  return `${t.slice(0, MAX_CHARS_PER_SOURCE)}\n\n[TRUNCATED — content exceeded ${MAX_CHARS_PER_SOURCE} characters.]`;
}

function stripHtmlScripts(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function extname(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export async function extractPdfBuffer(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return truncate((result.text || "").trim());
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function extractXlsxBuffer(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(`### Sheet: ${sheetName}\n\n${csv}`);
  }
  return truncate(parts.join("\n\n"));
}

async function extractDocxBuffer(buf: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return truncate((value || "").trim());
}

async function describeImageBuffer(
  apiKey: string,
  buf: Buffer,
  mime: string,
  label: string
): Promise<string> {
  const b64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;
  const system =
    "You extract training-ready text from images. Transcribe visible text, describe diagrams and tables briefly, and note structure (sections, lists). If nothing useful is present, say so in one sentence.";
  const userContent = [
    {
      type: "text" as const,
      text: `Source label: ${label}\nReturn plain text suitable for an AI training corpus (no JSON).`,
    },
    { type: "image_url" as const, image_url: { url: dataUrl } },
  ];
  const text = await chatCompletionMessages(
    [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    { apiKey, maxTokens: 4096, temperature: 0.2 }
  );
  return truncate(text.trim());
}

export async function extractFromBuffer(
  buf: Buffer,
  fileName: string,
  mime: string | undefined,
  apiKey: string
): Promise<ExtractedSource> {
  const id = `file:${fileName}`;
  const ext = extname(fileName);
  const mimeL = (mime || "").toLowerCase();

  try {
    if (
      mimeL.includes("pdf") ||
      ext === "pdf"
    ) {
      const text = await extractPdfBuffer(buf);
      return { id, label: fileName, kind: "pdf", text };
    }

    if (
      mimeL.includes("wordprocessingml") ||
      mimeL.includes("msword") ||
      ext === "docx"
    ) {
      const text = await extractDocxBuffer(buf);
      return { id, label: fileName, kind: "docx", text };
    }

    if (
      mimeL.includes("spreadsheetml") ||
      mimeL.includes("excel") ||
      ext === "xlsx" ||
      ext === "xls"
    ) {
      const text = extractXlsxBuffer(buf);
      return { id, label: fileName, kind: "spreadsheet", text };
    }

    if (
      mimeL.startsWith("image/") ||
      IMAGE_EXT.has(ext)
    ) {
      const mt =
        mimeL.startsWith("image/") ? mimeL : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      const text = await describeImageBuffer(apiKey, buf, mt, fileName);
      return { id, label: fileName, kind: "image", text };
    }

    if (
      mimeL.includes("text/") ||
      mimeL.includes("markdown") ||
      ext === "md" ||
      ext === "txt" ||
      ext === "csv" ||
      ext === "json" ||
      ext === "xml" ||
      ext === "html" ||
      ext === "htm"
    ) {
      let raw = buf.toString("utf-8");
      if (ext === "html" || ext === "htm" || mimeL.includes("html")) {
        raw = stripHtmlScripts(raw);
      }
      return { id, label: fileName, kind: "text", text: truncate(raw) };
    }

    return {
      id,
      label: fileName,
      kind: "unknown",
      text: "",
      error: `Unsupported type (${mime || ext || "binary"}). Try PDF, Word, Excel, text/markdown, or images.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Extraction failed";
    return {
      id,
      label: fileName,
      kind: "error",
      text: "",
      error: msg,
    };
  }
}

export async function extractFromUrl(
  urlStr: string,
  apiKey: string
): Promise<ExtractedSource> {
  const id = `url:${urlStr}`;
  const label = urlStr;

  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) {
      return { id, label, kind: "url", text: "", error: "Only http(s) URLs are allowed." };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(urlStr, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "TaskHub-CorpusBuilder/1.0" },
    });
    clearTimeout(t);

    if (!res.ok) {
      return { id, label, kind: "url", text: "", error: `HTTP ${res.status}` };
    }

    const ct = (res.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase() || "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_URL_BYTES) {
      return {
        id,
        label,
        kind: "url",
        text: "",
        error: `Download too large (limit ${Math.round(MAX_URL_BYTES / 1024 / 1024)}MB for URLs).`,
      };
    }

    if (ct.includes("pdf") || urlStr.toLowerCase().endsWith(".pdf")) {
      const text = await extractPdfBuffer(buf);
      return { id, label, kind: "url-pdf", text };
    }

    if (
      ct.includes("wordprocessingml") ||
      ct.includes("msword") ||
      urlStr.toLowerCase().includes(".docx")
    ) {
      const text = await extractDocxBuffer(buf);
      return { id, label, kind: "url-docx", text };
    }

    if (ct.includes("spreadsheet") || /\.xlsx?$/i.test(urlStr)) {
      const text = extractXlsxBuffer(buf);
      return { id, label, kind: "url-sheet", text };
    }

    if (ct.startsWith("image/")) {
      const text = await describeImageBuffer(apiKey, buf, ct, label);
      return { id, label, kind: "url-image", text };
    }

    const raw = buf.toString("utf-8");
    const text = truncate(stripHtmlScripts(raw));
    return { id, label, kind: "url-html", text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return { id, label, kind: "url", text: "", error: msg };
  }
}
