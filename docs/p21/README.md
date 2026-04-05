# P21 SQL Query Master — documentation

Use this folder for **anything that isn’t application code** but supports design, training, and operations for P21.

## Suggested layout

| Path | Use for |
|------|--------|
| **`training/`** | Onboarding, prompt examples, “how to ask for reports,” safety rules for agents, evaluation rubrics |
| **`training/boss/`** | **BOSS** business-rule agent: markdown docs, `examples/rules.examples.json`, see `boss/README.md` |
| **`reference/`** | Data dictionary, approved schemas/tables, SQL dialect notes, glossary |
| **`runbooks/`** | Incident steps, how to rotate credentials, how to audit generated SQL |
| **`research/`** | Notes, links, ADRs, spikes (optional) |

Create subfolders as you need them; the table above is a convention, not a requirement.

## What usually stays *out* of here

- **Secrets** (API keys, connection strings) — use `.env` / your host’s secret store only  
- **Large proprietary dumps** — prefer links or samples with fake data  
- **Generated build output** — keep under `.gitignore` elsewhere  

## Link from the app

The P21 route (`/p21`) mentions this area in the UI. In GitHub, browse **`docs/p21/`** at the repo root.

When you add user-facing help *inside* the product, you can later add MDX/Markdown under `src/app/p21/` or `content/p21/` — this `docs/p21/` tree is the right place for **repo-native** training and internal docs first.
