# Airtable Migration Audit by [straktur.com](https://straktur.com)

Analyze your Airtable data before migration. Fetches schema (and optionally all records), computes per-field statistics, and generates a detailed data analysis report.

## Prerequisites

- **Node.js 18+** (uses native `fetch`)
- **npm**

## What it does

- Fetches complete schema from Airtable Metadata API
- **Schema-only mode**: table structure, field types, relationships, select choices, dependency graph — in seconds
- **Full mode**: downloads all records, computes per-field statistics (null rates, value distributions, cardinality detection), flags data quality issues
- Builds dependency graph with topological sort for import order
- Detects circular dependencies and cross-base links
- Generates a comprehensive markdown report

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure
cp .env.example .env
# Edit .env — set AIRTABLE_API_KEY (required)
# Optionally set AIRTABLE_BASE_IDS, or let the tool auto-discover your bases

# 3. Run (choose one)
npm run discover:schema    # Fast — schema only (seconds)
npm run discover           # Full — schema + all records (minutes)

# 4. Read the report (in data/<date>_<baseIds>/ subfolder)
cat data/*/AIRTABLE_REPORT.md
```

## Two Modes

| Mode | Command | Time | Data fetched | Best for |
|------|---------|------|--------------|----------|
| **Schema only** | `npm run discover:schema` | Seconds | Table structure, fields, relationships | Initial overview, understanding structure |
| **Full analysis** | `npm run discover` | Minutes | Schema + all records | Pre-migration analysis, data quality audit |

### Schema-only report includes:
- Table and field inventory
- Field types and configurations
- Select field choices
- Linked record relationships
- Dependency graph / import order
- Cross-base link detection

### Full report adds:
- Per-field null rates and value distributions
- Text field length statistics
- Numeric field ranges (min/max/avg/median)
- Relationship cardinality analysis (Many-to-One vs Many-to-Many from actual data)
- Dictionary candidate detection (fields with few unique values)
- Data quality flags (long text, unused choices, high nullity)

## Claude Code Skill

This project includes a Claude Code skill at `.claude/skills/airtable-migration-audit/SKILL.md`. When used with Claude Code, invoke `/airtable-migration-audit` for a guided analysis walkthrough.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_API_KEY` | Yes | Personal Access Token (`pat...`). [Create one here](https://airtable.com/create/tokens). Scopes: `schema.bases:read` (schema-only), add `data.records:read` (full) |
| `AIRTABLE_BASE_IDS` | No | Comma-separated base IDs (`appXXX,appYYY`). If omitted, the tool lists all bases available for the token and prompts you to choose. |
| `AIRTABLE_USE_FIELD_IDS` | No | Set to `false` to use field names instead of IDs as record keys. Default: `true` |

## Output

Each run creates a timestamped subfolder under `data/`:

```
data/
  2025-01-15_0930_appXXX_appYYY/
    AIRTABLE_REPORT.md    # Human-readable analysis
    raw-schema.json       # Raw Airtable schema
  2025-01-15_1415_appXXX_appYYY/
    ...
```

Each run includes a timestamp (HHMM) so previous reports are never overwritten.

## Project Structure

```
airtable-migration-audit/
├── src/
│   ├── discover.ts                  # Main script (--schema-only flag)
│   └── lib/
│       ├── airtable-client.ts       # API client: schema + record fetching
│       ├── data-analyzer.ts         # Per-field statistics (full mode)
│       ├── schema-report-generator.ts  # Schema-only report
│       ├── report-generator.ts      # Full analysis report
│       └── mapping.ts              # AT record ID ↔ target ID persistence
├── data/                           # Generated output (gitignored)
├── .claude/skills/                 # Claude Code skill definition
├── package.json
└── tsconfig.json
```

## Design

- **Zero external dependencies** in library code — only Node built-ins (`fs`, `path`) and native `fetch`
- Only `dotenv` and `tsx` as project dependencies
- Pure functions for analysis and report generation
- Standalone — no framework dependencies
