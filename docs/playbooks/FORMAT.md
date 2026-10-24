# Playbook upload format (v1)

Supervisors upload **JSON** matching this shape. The app validates it, then an **agent** expands each step into a short walkthrough (guidance, what to record).

## Schema

```json
{
  "version": 1,
  "title": "Open receiving — inbound pallets",
  "department": "Warehouse",
  "steps": [
    { "text": "Verify PO number matches the BOL." },
    { "text": "Count cartons and note overages or shortages on the receiver." },
    { "text": "Stage freight in the correct zone before system entry." }
  ]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `version` | No | If present, must be `1`. |
| `title` | Yes | Shown to workers and in notifications. |
| `department` | No | For filtering / reporting later. |
| `steps` | Yes | Non-empty array. |
| `steps[].text` | Yes | One imperative step per line. |

## File

- Save as `something.json` and upload on **Playbooks → New playbook**, or paste the JSON into the text area.

## After upload

1. The agent produces an ordered **walkthrough** (guidance + record hints) stored with the template.
2. Supervisors **assign** workers by email and/or SMS; each worker gets a **private link** to complete their run and log notes per step.
