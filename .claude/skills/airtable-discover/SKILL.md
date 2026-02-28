---
name: airtable-discover
description: Analyze Airtable bases before migration — fetches full schema and records, computes per-field statistics (null rates, cardinality, distributions), detects dictionary candidates, flags data quality issues, maps dependencies, and generates a migration-readiness report. Use when the user wants to "analyze my Airtable", "migrate from Airtable", "audit Airtable data quality", "export Airtable to PostgreSQL", or "understand my Airtable schema".
argument-hint: [optional: base IDs to analyze, or leave empty to use AIRTABLE_BASE_IDS from .env]
disable-model-invocation: true
---

# Airtable Discover

Analyzing Airtable data: **$ARGUMENTS**

## Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **npm** (for dependencies)

## Your workflow

### Step 1: Check prerequisites

1. Verify `.env` has `AIRTABLE_API_KEY` set (Personal Access Token starting with `pat...`)
2. Verify `.env` has `AIRTABLE_BASE_IDS` set (comma-separated base IDs like `appXXX,appYYY`)
   - If the user provided base IDs as arguments, add them to `.env`
   - If neither exists, ask the user for their base IDs
3. Check if `data/AIRTABLE_REPORT.md` already exists
   - If it exists, ask: "A previous report already exists. Re-run discovery or use the existing report?"
   - If it doesn't exist, proceed to step 2

### Step 2: Choose discovery mode

Ask the user which mode they want:

- **Schema only** (`--schema-only`) — fetches table structure, field types, relationships. Fast (seconds). No record data needed. Good for initial overview.
- **Full analysis** (default) — fetches schema + ALL records, computes per-field statistics (null rates, value distributions, cardinality). Can take minutes for large bases.

### Step 3: Run the discover script

```bash
# Schema only (fast — seconds)
npx tsx src/discover.ts --schema-only

# Full analysis (slow — fetches all records)
npx tsx src/discover.ts
```

If it fails:

- **AIRTABLE_API_KEY not set** → ask user for their PAT from https://airtable.com/create/tokens (needs scopes: `schema.bases:read` for schema-only, add `data.records:read` for full)
- **API error 401** → token is invalid or expired
- **API error 403** → token doesn't have required scopes or access to the base
- **Rate limited** → script handles 429 automatically with retry, just wait

### Step 4: Read and present the report

Read `data/AIRTABLE_REPORT.md` and present findings to the user.

**Start with the high-level summary:**

- How many tables, total records, fields
- Number of data quality warnings
- Import order (which tables depend on which)
- Any circular dependencies or cross-base links

**Then walk through each table, focusing on actionable insights:**

For each table, highlight:

1. **Dictionary candidates** — text fields with few unique values (< 20), select fields
   - "Województwo has only 17 unique values across 1,530 records — this should be a dictionary"
   - Show the actual values with their counts

2. **Relationship analysis** — linked record cardinality
   - "Company link: 92% have exactly 1 link → this is a Many-to-One FK"
   - "Tags: records have up to 12 links → this is a true Many-to-Many, needs a junction table or JSONB"

3. **Data quality issues**
   - Long text fields (max > 255 chars) → needs `text()` not `varchar()`
   - High null rates (> 50%) → rarely used, maybe skip?
   - Unused select choices → don't create dictionary values for these
   - Duplicate values in unique-looking fields (emails, etc.)

4. **Fields to skip**
   - Computed fields (formulas, rollups, lookups, counts) → recreate as queries
   - AT system fields (createdBy, lastModifiedBy) → use your app's timestamps instead
   - Empty fields (100% null)

5. **Data inconsistencies**
   - Mixed formats in text fields (e.g., "PL" and "Polska" in a country field)
   - Numbers stored as text

**Ask targeted questions for design decisions:**

- "Status has 5 choices but only 3 are used. Create dictionary with 3 or 5 values?"
- "Notes field has values up to 8,247 chars. Keep as text, or split into structured fields?"
- "This linked record field always has 0-1 values. Model as FK or keep flexible?"

### Step 5: Guide next steps

After the user understands their data, guide them to:

1. **If schema-only was used** — suggest running full analysis for tables they're interested in, or proceed to schema design if structure is clear enough
2. **Design target schema** — create tables based on the analysis
3. **Seed lookup/dictionary values** — from select field choices identified in the report
4. **Write import scripts** — use the mapping library for AT record ID ↔ target ID tracking

## Key files

| File                         | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `src/discover.ts`            | Main script — fetches and analyzes |
| `data/AIRTABLE_REPORT.md`    | Generated report (gitignored)      |
| `data/raw-schema.json`       | Raw Airtable schema (gitignored)   |

## Tips

- The report uses field IDs as keys by default (stable across field renames). Set `AIRTABLE_USE_FIELD_IDS=false` in `.env` to use field names instead.
- For multi-base setups, tables with the same name across bases are disambiguated with `[baseId]` in the report.
- The raw schema JSON in `data/raw-schema.json` can be useful for looking up field IDs, view configurations, and other metadata not in the report.
- Cross-base links (linked records pointing to tables in a different base) are flagged but cannot be auto-resolved — they need manual mapping during import.

## Do NOT

- Do NOT overwhelm the user — present findings incrementally, table by table, with questions between tables
