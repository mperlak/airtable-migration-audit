---
name: airtable-migration-audit
description: Audit Airtable bases for migration readiness — runs analysis, reads the report, and delivers a structured verdict with complexity verdict, blockers, schema recommendations, and concrete next steps. Use when the user wants to "analyze my Airtable", "migrate from Airtable", "audit Airtable data quality", "export Airtable to PostgreSQL", or "understand my Airtable schema".
argument-hint: [optional: base IDs to analyze, or leave empty for auto-discovery]
disable-model-invocation: false
---

# Airtable Migration Audit by straktur.com

Analyzing: **$ARGUMENTS**

## What you deliver

After running the audit, your response MUST contain these sections in order:

### 1. Verdict (1-2 sentences)
Is this base ready to migrate? What's the overall complexity?
Example: *"This base is ready for migration with medium complexity. 4 core tables, clean relationships, but 3 data quality issues to fix first."*

### 2. What you're working with (summary table)
Tables, records, fields, relationships — from the report's Summary section.

### 3. Blockers (if any)
Issues that MUST be resolved before migration:
- Circular dependencies
- Cross-base links
- Data quality warnings from the "Data cleanup needed" group
- Constant fields / composite values that need restructuring

### 4. Schema recommendation
From the report's "Recommended Target Schema" section:
- How many PostgreSQL tables (core + junction + lookup)
- Import order
- Key relationship decisions (which M2M needs junction tables, which linked records are just FKs)

### 5. Next steps (numbered, actionable)
What the user should do now, in order. Be specific — reference table and field names.

### 6. Blind spots
What this audit does NOT cover:
- Automations / scripts in Airtable (not exported)
- Interface/view configurations
- Attachment storage strategy (S3/R2 setup, URL preservation, access permissions — file counts and sizes ARE included in the audit)
- Business logic in formulas (flagged but not translated)
- Permission / access control mapping

## How to run the audit

### Defaults — don't ask, just do:
- If a **full analysis** report already exists in `data/`, use the latest one (sort by folder name)
- If only a schema-only report exists and user needs full analysis — run a new full analysis
- Default to **full analysis** (not schema-only) unless the user explicitly asks for schema-only
- If `AIRTABLE_BASE_IDS` is not set and the script prompts for selection — tell the user it needs interactive input and run it

### Prerequisites
- `.env` must have `AIRTABLE_API_KEY` (Personal Access Token starting with `pat...`)
- `AIRTABLE_BASE_IDS` is optional — script auto-discovers bases if not set

### Run
```bash
# Full analysis (default)
npx tsx src/discover.ts

# Schema only (if user asks for quick overview)
npx tsx src/discover.ts --schema-only
```

### If it fails
- **AIRTABLE_API_KEY not set** → ask user for PAT from https://airtable.com/create/tokens (scopes: `schema.bases:read`, `data.records:read`)
- **API error 401** → token invalid or expired
- **API error 403** → token missing scopes or base access
- **API error 404** → wrong base ID, or token doesn't have access to that base
- **Rate limited (429)** → script retries automatically, just wait

### Read the report
The report is at `data/<date>_<HHMM>_<baseIds>/AIRTABLE_REPORT.md`. Read it, then deliver the structured output above.

## Key files

| File | Purpose |
|------|---------|
| `src/discover.ts` | Main script — fetches and analyzes |
| `data/<run>/AIRTABLE_REPORT.md` | Generated report (gitignored) |
| `data/<run>/raw-schema.json` | Raw Airtable schema (gitignored) |

## Privacy / security
- The audit runs **locally** — data is fetched to the user's machine and reports are stored in `data/`
- No data is sent to Straktur or any third-party service
- The Airtable token is used **read-only** (scopes: `schema.bases:read`, `data.records:read`)
- If the user asks about privacy or data safety, explain the above

## Do NOT
- Do NOT dump the entire report — synthesize it into the structured output above
- Do NOT ask which mode to use — default to full, mention schema-only as option only if relevant
- Do NOT ask about previous reports — just use the latest one or generate a new one
