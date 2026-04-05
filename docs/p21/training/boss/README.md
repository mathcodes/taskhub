# BOSS — Business Rule agent (training corpus)

**BOSS** uses multiple LLM steps plus retrieval from this folder. Add more content over time; the app loads files at **runtime** from the repo (same pattern as `sql_p21_db.csv`).

## Layout

| Path | Purpose |
|------|---------|
| **`docs/*.md`** | Short overviews, org standards, governance (keyword search). |
| **`docs/business_rule_examples.txt`** | **AI bundle** of real P21 business-rule C# samples: one `FILE_START`…`FILE_END` block per source file. Parsed into **~56 chunks** for retrieval (see code: `bossBundleCorpus.ts`). |
| **`examples/rules.examples.json`** | Curated **prompt → pattern** rows for NL alignment (tags, outline, P21 notes). |
| **`AGENT.md`** | Maintainer notes for the pipeline. |

## Bundle file (`business_rule_examples.txt`)

- Format: header + TOC, then `==== BUNDLE_START ====` and repeated blocks:
  - `<<<< FILE_START ... >>>>` … `--- METADATA` / `--- CONTENT` … `<<<< FILE_END ... >>>>`
- Each block becomes a retrieval chunk named `bundle/<relative_path>.cs` (or whatever `relative_path:` says).
- **Do not commit secrets**; the bundle is for training only.

If you regenerate the bundle, keep the same `FILE_START` / `FILE_END` structure so the parser keeps working.

## Retrieval behavior

- **Keyword overlap** scores chunks against the user question (same idea as the schema CSV).
- If **no** chunk scores &gt; 0, the app falls back to the **first N bundle chunks** so generic P21 C# patterns still appear in context.
- **Long chunks** are truncated to ~10k characters in the **prompt** (full text still used for scoring).

## JSON examples

Edit `examples/rules.examples.json` — add more `userPrompt` / `tags` rows that match how your team asks for rules. This feeds the **examples understanding** agent before the SQL and docs steps.

## SQL and safety

The SQL step only proposes **read-style** T-SQL sketches; nothing executes in-app. **P21 rule implementation** (C# / Visual Rules) still happens in your controlled process.
