# Training materials

## Curated NL→SQL pairs (recommended)

The app loads **`nl_sql_examples.json`** (same folder as this README) and **retrieves** a few examples whose wording and tags overlap the user’s question, then passes them to the NL→SQL agent ahead of the schema dictionary.

### How to add pairs

1. Edit **`nl_sql_examples.json`** (JSON array). Commit and redeploy so Vercel includes the file.
2. Each entry should look like:

```json
{
  "question": "Natural language prompt your users might ask",
  "sql": "SELECT ... valid T-SQL using real P21 table/column names from sql_p21_db.csv",
  "tags": ["invoice", "customer", "optional", "keywords"],
  "notes": "Optional hint for the model (e.g. which company_id filter is standard)"
}
```

3. **`question`** and **`sql`** are required. **`tags`** improve retrieval when users don’t repeat exact words from `question`.
4. Start from **`nl_sql_examples.example.json`** if you want a copy-paste template (rename or merge into `nl_sql_examples.json`).
5. Quality tips: use **real** table/column names from `sql_p21_db.csv`, keep examples **read-only** (`SELECT` only), and add pairs for recurring report types (AR, PO, inventory, etc.).

Retrieval is **keyword overlap** (same idea as schema retrieval), not embeddings. For very large libraries later, you can add embedding search in a follow-up.

---

Other ideas:

- Guardrails docs for what NL→SQL must never do  
- Short videos or slide outlines (link out if files are huge)  

Rename or split this file as your content grows.
