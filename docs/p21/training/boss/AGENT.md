# BOSS pipeline (code reference)

Four LLM steps (see `src/lib/p21/boss/runBossPipeline.ts`):

1. **Examples agent** — User prompt + retrieved rows from `examples/rules.examples.json` → intent, patterns, entities.
2. **SQL rule agent** — User prompt + examples output + **schema dictionary** retrieval → conditional T-SQL sketch, tables, risks.
3. **Docs agent** — User prompt + examples output + **doc chunks**: `docs/**/*.md` plus **parsed** `docs/business_rule_examples.txt` (one chunk per `FILE_START`…`FILE_END` block, see `bossBundleCorpus.ts`).
4. **Synthesis agent** — Merges the three JSON blobs into one **business rule specification** for humans to implement in P21.

All steps return **JSON only** (parsed in code). If keyword retrieval finds nothing, bundle chunks still supply generic P21 C# patterns (fallback).
