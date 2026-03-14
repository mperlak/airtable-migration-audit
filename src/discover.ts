/**
 * Airtable Migration Audit — fetches schema (and optionally ALL data), analyzes, produces report.
 *
 * Usage:
 *   npx tsx src/discover.ts                 # Full analysis (schema + all records)
 *   npx tsx src/discover.ts --schema-only   # Schema only (fast, no data fetched)
 *
 * Reads from .env:
 *   AIRTABLE_API_KEY   — Personal Access Token (starts with pat...)
 *   AIRTABLE_BASE_IDS  — (optional) Comma-separated base IDs (e.g., appXXX,appYYY)
 *                         If omitted, lists available bases and prompts for selection.
 *
 * Output (in data/<date>_<baseIds>/ subfolder):
 *   AIRTABLE_REPORT.md   — Human-readable analysis (full or schema-only)
 *   raw-schema.json      — Raw Airtable schema
 */

import "dotenv/config"

import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createInterface } from "node:readline"

import { AirtableClient } from "./lib/airtable-client"
import type { AirtableTable, AirtableRecord, AirtableBaseMeta } from "./lib/airtable-client"
import { analyzeTable, buildDependencyGraph, collectFlags } from "./lib/data-analyzer"
import type { TableAnalysis } from "./lib/data-analyzer"
import { generateReport } from "./lib/report-generator"
import { generateHtmlReport } from "./lib/html-report-generator"
import { generateSchemaReport } from "./lib/schema-report-generator"
import { generateSchemaHtmlReport } from "./lib/schema-html-report-generator"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = resolve(__dirname, "..", "data")

function buildRunDir(baseIds: string[]): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5).replace(":", "")
  const suffix = baseIds.join("_")
  return resolve(DATA_ROOT, `${date}_${time}_${suffix}`)
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const schemaOnly = args.includes("--schema-only")

// ---------------------------------------------------------------------------
// Interactive prompt helper
// ---------------------------------------------------------------------------

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function promptForBases(client: AirtableClient): Promise<{ id: string; name: string }[]> {
  console.log("   Fetching available bases...\n")
  const available = await client.listBases()

  if (available.length === 0) {
    console.error("❌ No bases found for this token. Check token permissions.")
    process.exit(1)
  }

  console.log("   Available bases:\n")
  available.forEach((base, i) => {
    console.log(`   ${i + 1}. ${base.name} (${base.id})`)
  })
  console.log("")

  const answer = await ask("   Which bases to analyze? (comma-separated numbers, or 'all'): ")

  if (answer.toLowerCase() === "all") {
    return available.map((b) => ({ id: b.id, name: b.name }))
  }

  const indices = answer
    .split(",")
    .map((s) => Number(s.trim()) - 1)
    .filter((i) => i >= 0 && i < available.length)

  if (indices.length === 0) {
    console.error("❌ No valid selection. Exiting.")
    process.exit(1)
  }

  return indices.map((i) => ({ id: available[i].id, name: available[i].name }))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // --- Validate env ---
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) {
    console.error("❌ AIRTABLE_API_KEY not set")
    console.error("   Get a Personal Access Token at https://airtable.com/create/tokens")
    console.error(
      schemaOnly
        ? "   Required scope: schema.bases:read"
        : "   Required scopes: schema.bases:read, data.records:read"
    )
    process.exit(1)
  }

  const client = new AirtableClient({ apiKey })

  console.log("🔍 Airtable Migration Audit by straktur.com")
  console.log(`   Mode: ${schemaOnly ? "schema-only (fast)" : "full analysis (schema + data)"}`)

  // --- Resolve base IDs ---
  let baseIds: string[]
  let baseNames: Map<string, string>

  const baseIdsRaw = process.env.AIRTABLE_BASE_IDS
  if (baseIdsRaw) {
    baseIds = baseIdsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    baseNames = new Map(baseIds.map((id) => [id, id]))
  } else {
    const selected = await promptForBases(client)
    baseIds = selected.map((b) => b.id)
    baseNames = new Map(selected.map((b) => [b.id, b.name]))
  }

  if (baseIds.length === 0) {
    console.error("❌ No valid base IDs found")
    process.exit(1)
  }

  const useFieldIds = process.env.AIRTABLE_USE_FIELD_IDS !== "false"

  console.log(`   Bases: ${baseIds.map((id) => baseNames.get(id) || id).join(", ")}`)
  if (!schemaOnly) {
    console.log(`   Field key mode: ${useFieldIds ? "field IDs" : "field names"}`)
  }
  console.log("")

  // --- Ensure data directory ---
  const DATA_DIR = buildRunDir(baseIds)
  mkdirSync(DATA_DIR, { recursive: true })
  console.log(`   Output: ${DATA_DIR}\n`)

  // --- Fetch schemas ---
  const allTables: AirtableTable[] = []
  const bases: { baseId: string; baseName: string }[] = []
  const rawSchemas: Record<string, unknown> = {}

  for (const baseId of baseIds) {
    console.log(`📋 Fetching schema for base ${baseId}...`)
    const schema = await client.fetchBaseSchema(baseId)

    rawSchemas[baseId] = schema
    allTables.push(...schema.tables)
    bases.push({ baseId, baseName: baseNames.get(baseId) || baseId })

    console.log(`   Found ${schema.tables.length} tables`)
  }

  // Save raw schema
  const schemaPath = resolve(DATA_DIR, "raw-schema.json")
  writeFileSync(schemaPath, JSON.stringify(rawSchemas, null, 2), "utf-8")
  console.log(`\n💾 Raw schema saved to ${schemaPath}`)

  // --- Schema-only mode ---
  if (schemaOnly) {
    console.log("\n📝 Generating schema report...")
    const report = generateSchemaReport({
      bases,
      tables: allTables,
      generatedAt: new Date(),
    })

    const reportPath = resolve(DATA_DIR, "AIRTABLE_REPORT.md")
    writeFileSync(reportPath, report, "utf-8")

    const schemaHtml = generateSchemaHtmlReport({ bases, tables: allTables, generatedAt: new Date() })
    const htmlPath = resolve(DATA_DIR, "AIRTABLE_REPORT.html")
    writeFileSync(htmlPath, schemaHtml, "utf-8")

    const totalFields = allTables.reduce((s, t) => s + t.fields.length, 0)

    console.log(`✅ Markdown report saved to ${reportPath}`)
    console.log(`✅ HTML report saved to ${htmlPath}`)
    console.log("")
    console.log("=".repeat(60))
    console.log("📊 Schema Summary")
    console.log("=".repeat(60))
    console.log(`   Tables: ${allTables.length}`)
    console.log(`   Fields: ${totalFields}`)
    console.log("")
    console.log(`   Report (MD):   ${reportPath}`)
    console.log(`   Report (HTML): ${htmlPath}`)
    console.log(`   Schema (JSON): ${schemaPath}`)
    console.log("")
    console.log("Next steps:")
    console.log("   • Review table structure and relationships in the report")
    console.log("   • Run without --schema-only for full data analysis (per-field statistics)")

    process.exit(0)
  }

  // --- Full mode: fetch all records and analyze ---
  const tableNameById = new Map(allTables.map((t) => [t.id, t.name]))
  const allTableIds = new Set(allTables.map((t) => t.id))

  console.log("")
  const tableAnalyses: TableAnalysis[] = []

  for (const baseId of baseIds) {
    const schema = rawSchemas[baseId] as { tables: AirtableTable[] }

    for (const table of schema.tables) {
      console.log(`📊 Fetching records: ${table.name} (${table.id}) from base ${baseId}...`)

      let records: AirtableRecord[]
      try {
        records = await client.fetchAllRecords({
          baseId,
          tableId: table.id,
          returnFieldsByFieldId: useFieldIds,
        })
      } catch (err) {
        console.error(`   ❌ Failed to fetch records for ${table.name}:`, err)
        console.error("   Skipping this table...")
        continue
      }

      console.log(`   ✅ ${records.length} records fetched`)

      console.log(`   🔬 Analyzing fields...`)
      const analysis = analyzeTable(table, records, tableNameById, useFieldIds, baseId)
      tableAnalyses.push(analysis)

      const flagCount = analysis.fields.reduce((s, f) => s + f.flags.length, 0)
      console.log(`   📌 ${analysis.fieldSummary.total} fields analyzed, ${flagCount} flags`)
      console.log("")
    }
  }

  // --- Cross-table analysis ---
  console.log("🔗 Building dependency graph...")
  const graph = buildDependencyGraph(tableAnalyses, allTableIds)
  console.log(`   Import order: ${graph.importOrder.map((e) => e.tableName).join(" → ")}`)

  if (graph.cycles.length > 0) {
    console.warn(`   ⚠️  Cycles detected: ${graph.cycles.map((c) => c.join(" ↔ ")).join("; ")}`)
  }
  if (graph.crossBaseLinks.length > 0) {
    console.warn(`   ⚠️  ${graph.crossBaseLinks.length} cross-base link(s) detected`)
  }

  // --- Collect flags ---
  const flags = collectFlags(tableAnalyses)
  const warnings = flags.filter((f) => f.severity === "warning").length
  console.log(`\n📌 Data quality: ${flags.length} flags (${warnings} warnings)`)

  // --- Generate report ---
  console.log("\n📝 Generating report...")
  const report = generateReport({
    bases,
    tables: tableAnalyses,
    graph,
    flags,
    generatedAt: new Date(),
  })

  const reportPath = resolve(DATA_DIR, "AIRTABLE_REPORT.md")
  writeFileSync(reportPath, report, "utf-8")
  console.log(`✅ Markdown report saved to ${reportPath}`)

  const htmlReport = generateHtmlReport({
    bases,
    tables: tableAnalyses,
    graph,
    flags,
    generatedAt: new Date(),
  })
  const htmlPath = resolve(DATA_DIR, "AIRTABLE_REPORT.html")
  writeFileSync(htmlPath, htmlReport, "utf-8")
  console.log(`✅ HTML report saved to ${htmlPath}`)

  // --- Summary ---
  console.log("\n" + "=".repeat(60))
  console.log("📊 Discovery Summary")
  console.log("=".repeat(60))
  console.log(`   Tables analyzed: ${tableAnalyses.length}`)
  console.log(
    `   Total records:   ${tableAnalyses.reduce((s, t) => s + t.recordCount, 0).toLocaleString()}`
  )
  console.log(`   Total fields:    ${tableAnalyses.reduce((s, t) => s + t.fieldSummary.total, 0)}`)
  console.log(`   Quality flags:   ${flags.length} (${warnings} warnings)`)
  console.log("")
  console.log(`   Report (MD):   ${reportPath}`)
  console.log(`   Report (HTML): ${htmlPath}`)
  console.log(`   Schema (JSON): ${schemaPath}`)
  console.log("")
  console.log("Next steps:")
  console.log("   1. Read the report: data/AIRTABLE_REPORT.md")
  console.log("   2. Use the /airtable-migration-audit skill for guided analysis")
  console.log("   3. Design your target schema based on the findings")

  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Discover failed:", err)
  process.exit(1)
})
