# Airtable Migration Audit

Scan your Airtable base and get a Postgres migration plan. Tells you what's in your base, what to clean up, and outputs a target Postgres schema with types, relationships, and import order.

**[→ See a live sample report](https://mperlak.github.io/airtable-migration-audit/examples/sample-report.html)** · Works as a CLI tool or as an AI agent skill for [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://openai.com/index/codex/), and other coding agents.

[![HTML Report Preview](https://github.com/mperlak/airtable-migration-audit/raw/main/docs/screenshot-html-report.png)](/mperlak/airtable-migration-audit/blob/main/docs/screenshot-html-report.png)

> **Runs locally.** Your Airtable data is fetched directly to your machine using your read-only token, analyzed locally, and written to local report files. Nothing is sent to a Straktur backend or any third-party service. You decide if and with whom you share the results.

## Why this exists

I've run [Mroomy](https://mroomy.com) for 6 years — we design children's rooms for customers across Poland and several European markets. Around 2,500 rooms designed, each with its own quirks, add-ons, and one-off decisions. The Airtable base we built along the way grew to 49,000+ records across multiple interconnected bases.

When we finally decided to migrate off Airtable, the first question wasn't "how do I export the data." It was "what should I actually bring?"

After 6 years of quick fixes, the base was a mess:

- Fields added "just for now" that never got removed — including one literally named `Field 56`
- SingleSelects that degenerated into comma-separated values — e.g. a choice named `PREMIUM, EXTRA_CHARGE` (package tier and a billing flag crammed into one select value because adding a new column felt like too much work at the time)
- Text fields with 17 unique values across 1,500 records — obvious lookup-table candidates nobody had time to normalize
- Linked records configured as single-link but actually used many-to-many
- Automations referencing columns nobody remembered adding

No existing tool gave me a full picture of what was worth migrating vs. what was dead weight. So I wrote one.

This tool reads your Airtable base — schema *and* all records — and tells you what's in there before you touch anything. Null rates, cardinality, relationship patterns, dictionary candidates, duplicate-looking choices. Plus a `MIGRATION.json` with a target Postgres schema you can feed to an AI agent or implement manually.

It doesn't move data. It tells you what to plan for.

## What it audits

- **Schema structure** — tables, fields, types, relationships, dependency graph, import order
- **Data quality** — null rates, value distributions, constant fields, composite values, similar choices (typo detection)
- **Migration complexity** — Many-to-One vs Many-to-Many relationships, circular dependencies, cross-base links
- **Recommendations** — target PostgreSQL schema, dictionary candidates, computed fields to recreate, attachment migration plan

## Quick Start

> 💡 **Want to see what the output looks like first?** [View the interactive sample report →](https://mperlak.github.io/airtable-migration-audit/examples/sample-report.html) (7 tables, 37k records, 67 warnings)

Requires [Node.js 18+](https://nodejs.org/) and npm.

```bash
git clone https://github.com/mperlak/airtable-migration-audit.git
cd airtable-migration-audit
npm install
cp .env.example .env       # ← set AIRTABLE_API_KEY (required)
```

Now choose how you want to use it:

**1. Run as CLI:**

```bash
npm run discover           # Full analysis — schema + all records (minutes)
npm run discover:schema    # Fast — schema only (seconds)
```

Open `data/**/AIRTABLE_REPORT.html` in your browser to see the results.

**2. Use as AI Agent Skill** — install `/airtable-migration-audit` and the agent runs the audit, reads the report, and delivers a structured migration verdict:

```bash
# Claude Code
/plugin marketplace add mperlak/airtable-migration-audit
/plugin install airtable-migration-audit

# OpenAI Codex
$skill-installer install https://github.com/mperlak/airtable-migration-audit/tree/main/skills/airtable-migration-audit

# Any agent (Agent Skills spec — https://agentskills.io)
npx skills add mperlak/airtable-migration-audit
```

Then run `/airtable-migration-audit` in your agent.

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
- **`MIGRATION.json`** — machine-consumable migration spec (see below)

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
    AIRTABLE_REPORT.md     # Markdown report (for agents / CLI)
    AIRTABLE_REPORT.html   # Interactive HTML report (open in browser)
    MIGRATION.json         # Structured migration spec (full mode only)
    raw-schema.json        # Raw Airtable schema
  2025-01-15_1415_appXXX_appYYY/
    ...
```

Each run includes a timestamp (HHMM) so previous reports are never overwritten. The HTML report is a single self-contained file with dark/light mode, collapsible sections, and sidebar navigation — no external dependencies.

### MIGRATION.json — ready-to-use PostgreSQL migration spec

Generated in **full mode only** (requires record data for cardinality and validation analysis). This file is a framework-agnostic, machine-consumable PostgreSQL migration specification. Framework adapters (e.g. [Straktur](https://straktur.com), Prisma, Django) consume this file to scaffold target applications.

The JSON contains:

- **Tables** — each with a proposed `dbTableName` (mechanical snake_case, no translation), record count, and import order
- **Columns** — Airtable type → PostgreSQL type mapping (e.g. `singleLineText` → `varchar(150)`, `number` with decimals → `numeric(12,2)`), nullability, optional defaults, and validation constraints
- **Relations** — Many-to-One foreign keys derived from linked record cardinality analysis
- **Junction tables** — auto-generated for Many-to-Many relationships and multi-select fields
- **Lookup tables** — single/multi-select fields extracted into dedicated lookup tables, with all values and usage counts
- **Computed fields** — formulas, rollups, counts flagged as `recreateAs: "app-logic"`
- **Skip list** — auto-numbers, system fields (createdBy, lastModifiedTime) that have DB-native equivalents
- **Import order** — topologically sorted table list respecting foreign key dependencies

Example (abbreviated):

```jsonc
{
  "schemaVersion": 1,
  "tables": [{
    "airtableName": "Shopping Lists",
    "dbTableName": "shopping_lists",
    "columns": [{
      "airtableName": "Name",
      "dbColumnName": "name",
      "airtableType": "singleLineText",
      "pgType": "varchar(150)",
      "nullable": false,
      "validation": { "type": "string", "maxLength": 128 }
    }],
    "relations": [{
      "airtableFieldName": "Project",
      "dbColumnName": "project_id",
      "type": "manyToOne",
      "targetTable": "projects"
    }],
    "lookupTables": [{
      "airtableFieldName": "Status",
      "dbColumnName": "status_id",
      "lookupTableName": "shopping_lists_status",
      "values": [{ "name": "Active", "usageCount": 150 }]
    }]
  }],
  "junctionTables": [{ "dbTableName": "shopping_lists_to_products", "reason": "manyToMany" }],
  "importOrder": ["manufacturers", "products", "projects", "shopping_lists"]
}
```

You can feed this file directly to an AI coding agent to scaffold your target application — or use it as a reference for manual schema design.

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
│       ├── migration-json-generator.ts # MIGRATION.json output
│       └── mapping.ts              # AT record ID ↔ target ID persistence
├── skills/                         # Skills (for plugin distribution)
├── .claude-plugin/                 # Plugin marketplace manifest
├── data/                           # Generated output (gitignored)
├── package.json
└── tsconfig.json
```

## Design

- **Zero external dependencies** in library code — only Node built-ins (`fs`, `path`) and native `fetch`
- Only `dotenv` and `tsx` as project dependencies
- Pure functions for analysis and report generation
- Standalone — no framework dependencies
