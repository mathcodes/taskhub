import { chatCompletion, stripJsonFence } from "@/lib/agents/openai";

const SYSTEM = `You are the **synthesis** step for the BOSS (Business Rule Orchestration) pipeline for Epicor Prophet 21 (P21).

You must produce a **complete, ready-to-paste C# business rule class** for P21, starting from the **DCNA_BR_TEMPLATE_v1** skeleton provided in the user message.

### C# requirements
- **Base structure**: Keep the same overall pattern as the template: \`using P21.Extensions.BusinessRule;\`, inherit \`P21.Extensions.BusinessRule.Rule\`, \`[RuleDescription(...)]\`, \`public override RuleResult Execute()\`, \`try/catch/finally\`, \`RuleResult\` with \`Success\` and \`Message\` as appropriate.
- **Replace** placeholder namespace and class names (e.g. \`DCNA_BR_TEMPLATE_v1\`) with a **single coherent** \`namespace\` and \`class\` name derived from the user’s rule (PascalCase, valid C# identifiers).
- **Replace** the \`// RULE LOGIC GOES HERE\` region with **real rule logic** using P21 rule APIs: \`Data\`, \`DataField\`, \`RuleState\`, \`Session\`, \`DataTable\` / \`Data.Set\` as applicable. Follow patterns implied by the examples and docs JSON—not invented APIs.
- **SQL**: Where the SQL agent provided T-SQL sketches, you may embed read-only \`SqlCommand\` / \`SqlDataAdapter\` patterns **only** if they match the rule; otherwise use \`Data\` fields first. Never emit destructive SQL.
- **Template cleanup**: The skeleton may include sample helpers (e.g. UDT freight structs, \`GetUDTRowData\`). **Remove or rewrite** anything irrelevant to the user’s rule; **fix** obvious inconsistencies (wrong field names, Fill before loop, etc.) so the output compiles conceptually.
- **Paths & secrets**: Replace hard-coded UNC paths in the template with **comments** like \`// TODO: set log base path per environment\` or keep a clearly labeled placeholder string the org must configure.
- **Logging**: Preserve \`LogLine\`, \`InitLogFile\`, \`FlushLog\`, \`LogPayLoad\` usage where useful; align with \`verbose\` / \`logging\` / \`testing\` flags from the template.

### JSON output (mandatory)
Return **only valid JSON** (no markdown fences). The string value \`csharpSource\` MUST contain the **entire** \`.cs\` file as one JSON string: escape internal double quotes as \\", newlines as \\n, backslashes as \\\\.

Schema:
{
  "ruleName": "short human title",
  "csharpNamespace": "string — namespace for the generated class",
  "csharpClassName": "string — class name",
  "description": "1–3 sentences",
  "triggers": ["when the rule should run — business language"],
  "conditionSummary": "plain language",
  "conditionSql": "string — from SQL agent or refined; may be empty",
  "actions": ["what the rule enforces or does in business language"],
  "implementationChecklist": ["ordered steps: compile, deploy, attach in P21, test"],
  "warnings": ["risks, gaps, open questions"],
  "reviewNotes": "what to verify before go-live",
  "csharpSource": "COMPLETE C# file as one JSON-escaped string (required)"
}

If you cannot fit everything, **shorten** prose fields but **never** omit or truncate \`csharpSource\`.`;

function tryExtractCSharpFromFenced(raw: string): string | null {
  const m = raw.match(/```(?:csharp|cs)?\s*([\s\S]*?)```/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

function parseSynthesisOutput(raw: string): Record<string, unknown> {
  const stripped = stripJsonFence(raw);
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid shape");
    return parsed as Record<string, unknown>;
  } catch {
    const fromFence = tryExtractCSharpFromFenced(raw);
    if (fromFence) {
      return {
        csharpSource: fromFence,
        synthesisParseNote:
          "Model returned fenced C# instead of strict JSON; code was extracted. Fill other fields from stages if needed.",
      };
    }
    throw new Error("Synthesis agent did not return valid JSON");
  }
}

export async function runSynthesisAgent(params: {
  userQuestion: string;
  examplesJson: string;
  sqlJson: string;
  docsJson: string;
  csharpTemplate: string;
  apiKey?: string;
}): Promise<Record<string, unknown>> {
  const user = `User request:

"""${params.userQuestion.trim()}"""

---

## DCNA_BR_TEMPLATE_v1 — START FROM THIS SKELETON

Use this file as the **structural base**. Your \`csharpSource\` must be a **full replacement** that implements the user’s rule while preserving the template’s conventions (Execute shape, RuleResult, logging pattern) unless a simpler structure is clearly better for the scenario.

\`\`\`csharp
${params.csharpTemplate.trim()}
\`\`\`

---

EXAMPLES AGENT JSON:

${params.examplesJson}

---

SQL RULE AGENT JSON:

${params.sqlJson}

---

DOCS AGENT JSON:

${params.docsJson}

---

Produce the merged JSON with a complete \`csharpSource\` as specified.`;

  const raw = await chatCompletion(SYSTEM, user, {
    temperature: 0.15,
    maxTokens: 12_000,
    apiKey: params.apiKey,
  });
  return parseSynthesisOutput(raw);
}
