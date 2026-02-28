/**
 * Generates the AIRTABLE_REPORT.md markdown file from analysis results.
 * Pure functions, zero boilerplate dependencies.
 */

import type {
  TableAnalysis,
  FieldAnalysis,
  TextFieldAnalysis,
  NumericFieldAnalysis,
  CheckboxFieldAnalysis,
  DateFieldAnalysis,
  SelectFieldAnalysis,
  LinkedRecordFieldAnalysis,
  AttachmentFieldAnalysis,
  ComputedFieldAnalysis,
  DependencyGraph,
  DataQualityFlag,
} from "./data-analyzer"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ReportInput {
  bases: { baseId: string; baseName: string }[]
  tables: TableAnalysis[]
  graph: DependencyGraph
  flags: DataQualityFlag[]
  generatedAt: Date
}

export function generateReport(input: ReportInput): string {
  const { bases, tables, graph, flags, generatedAt } = input
  const lines: string[] = []

  // Detect duplicate table names across bases
  const nameCount = new Map<string, number>()
  for (const t of tables) {
    nameCount.set(t.tableName, (nameCount.get(t.tableName) || 0) + 1)
  }
  const duplicateNames = new Set(
    Array.from(nameCount.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )

  lines.push("# Airtable Data Analysis Report")
  lines.push("")
  lines.push(`Generated: ${formatDateTime(generatedAt)}`)
  lines.push(`Bases analyzed: ${bases.map((b) => `${b.baseName} (${b.baseId})`).join(", ")}`)
  lines.push("")

  appendSummary(lines, tables, flags)
  appendImportOrder(lines, graph, tables)

  if (graph.cycles.length > 0) {
    appendCycles(lines, graph)
  }

  if (graph.crossBaseLinks.length > 0) {
    appendCrossBaseLinks(lines, graph)
  }

  for (const table of sortByImportOrder(tables, graph)) {
    appendTable(lines, table, duplicateNames)
  }

  appendFlags(lines, flags)

  appendNextSteps(lines, tables, graph, flags)

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function appendSummary(lines: string[], tables: TableAnalysis[], flags: DataQualityFlag[]): void {
  const totalRecords = tables.reduce((s, t) => s + t.recordCount, 0)
  const totalFields = tables.reduce((s, t) => s + t.fieldSummary.total, 0)
  const dataFields = tables.reduce(
    (s, t) =>
      s +
      t.fieldSummary.text +
      t.fieldSummary.numeric +
      t.fieldSummary.select +
      t.fieldSummary.linkedRecord +
      t.fieldSummary.other,
    0
  )
  const computedFields = tables.reduce((s, t) => s + t.fieldSummary.computed, 0)
  const linkedFields = tables.reduce((s, t) => s + t.fieldSummary.linkedRecord, 0)
  const selectFields = tables.reduce((s, t) => s + t.fieldSummary.select, 0)
  const totalChoices = tables.reduce((s, t) => {
    return (
      s +
      t.fields
        .filter((f): f is SelectFieldAnalysis => f.kind === "select")
        .reduce((cs, f) => cs + f.definedChoices.length, 0)
    )
  }, 0)
  const attachmentFields = tables.reduce(
    (s, t) => s + t.fields.filter((f) => f.kind === "attachment").length,
    0
  )
  const totalAttachmentSize = tables.reduce((s, t) => {
    return (
      s +
      t.fields
        .filter((f): f is AttachmentFieldAnalysis => f.kind === "attachment")
        .reduce((as_, f) => as_ + f.totalSizeBytes, 0)
    )
  }, 0)

  const warningCount = flags.filter((f) => f.severity === "warning").length

  lines.push("## Summary")
  lines.push("")
  lines.push("| Metric | Value |")
  lines.push("|--------|-------|")
  lines.push(`| Tables | ${tables.length} |`)
  lines.push(`| Total records | ${fmt(totalRecords)} |`)
  lines.push(`| Total fields | ${totalFields} (${dataFields} data, ${computedFields} computed) |`)
  lines.push(`| Linked record fields | ${linkedFields} |`)
  lines.push(`| Select fields | ${selectFields} (${fmt(totalChoices)} total choices) |`)
  if (attachmentFields > 0) {
    lines.push(`| Attachment fields | ${attachmentFields} (~${formatSize(totalAttachmentSize)}) |`)
  }
  lines.push(`| Data quality flags | ${warningCount} warnings |`)
  lines.push("")
}

// ---------------------------------------------------------------------------
// Import order
// ---------------------------------------------------------------------------

function appendImportOrder(lines: string[], graph: DependencyGraph, tables: TableAnalysis[]): void {
  const recordsByTable = new Map(tables.map((t) => [t.tableName, t.recordCount]))

  lines.push("## Import Order (dependency-based)")
  lines.push("")
  lines.push("| Order | Table | Records | Depends On |")
  lines.push("|-------|-------|---------|------------|")

  for (let i = 0; i < graph.importOrder.length; i++) {
    const entry = graph.importOrder[i]!
    const records = recordsByTable.get(entry.tableName) ?? 0
    const deps = entry.dependsOn.length > 0 ? entry.dependsOn.join(", ") : "—"
    lines.push(`| ${i + 1} | ${entry.tableName} | ${fmt(records)} | ${deps} |`)
  }

  lines.push("")
}

function appendCycles(lines: string[], graph: DependencyGraph): void {
  lines.push("> **Warning: Circular dependencies detected.**")
  lines.push(">")
  for (const cycle of graph.cycles) {
    lines.push(`> Cycle: ${cycle.join(" ↔ ")}`)
  }
  lines.push(">")
  lines.push(
    "> These tables link to each other. Import both without FK values, then resolve in a post-import pass."
  )
  lines.push("")
}

function appendCrossBaseLinks(lines: string[], graph: DependencyGraph): void {
  lines.push("> **Cross-base links detected** (linked table not in any analyzed base):")
  lines.push(">")
  for (const link of graph.crossBaseLinks) {
    lines.push(`> - ${link.table}.${link.field} → table ${link.linkedTableId}`)
  }
  lines.push(">")
  lines.push("> These will need manual resolution during import.")
  lines.push("")
}

// ---------------------------------------------------------------------------
// Per-table section
// ---------------------------------------------------------------------------

function appendTable(lines: string[], table: TableAnalysis, duplicateNames: Set<string>): void {
  lines.push("---")
  lines.push("")
  const suffix = duplicateNames.has(table.tableName) && table.baseId ? ` [${table.baseId}]` : ""
  lines.push(`## Table: ${table.tableName}${suffix} (${fmt(table.recordCount)} records)`)
  lines.push("")

  if (table.createdTimeRange) {
    lines.push(
      `Created: ${formatDate(table.createdTimeRange.earliest)} → ${formatDate(table.createdTimeRange.latest)}`
    )
    lines.push("")
  }

  // Fields overview table
  lines.push("### Fields Overview")
  lines.push("")
  lines.push("| # | Field | AT Type | Null% | Notes |")
  lines.push("|---|-------|---------|-------|-------|")

  for (let i = 0; i < table.fields.length; i++) {
    const f = table.fields[i]!
    const num = i + 1
    const typeStr = fieldTypeDisplay(f)
    const nullStr = fieldNullDisplay(f)
    const notes = fieldOverviewNotes(f)
    lines.push(`| ${num} | ${f.fieldName} | ${typeStr} | ${nullStr} | ${notes} |`)
  }

  lines.push("")

  // Field details
  lines.push("### Field Details")
  lines.push("")

  for (const f of table.fields) {
    appendFieldDetail(lines, f)
  }
}

function fieldTypeDisplay(f: FieldAnalysis): string {
  switch (f.kind) {
    case "linkedRecord":
      return `linkedRecord → ${f.linkedTableName ?? f.linkedTableId}`
    case "computed":
      return f.resultType ? `${f.fieldType} (${f.resultType})` : f.fieldType
    default:
      return f.fieldType
  }
}

function fieldNullDisplay(f: FieldAnalysis): string {
  if (f.kind === "computed") return "—"
  if (f.fieldType === "createdTime" || f.fieldType === "lastModifiedTime") return "—"
  if (f.fieldType === "createdBy" || f.fieldType === "lastModifiedBy") return "—"
  if (f.fieldType === "autoNumber") return "—"
  return `${f.nullPercent}%`
}

function fieldOverviewNotes(f: FieldAnalysis): string {
  const parts: string[] = []

  if (f.isPrimary) parts.push("Primary field")

  switch (f.kind) {
    case "text":
      if (f.maxLength > 255) parts.push(`**Max length: ${fmt(f.maxLength)} chars**`)
      else if (f.maxLength > 0) parts.push(`Max length: ${fmt(f.maxLength)} chars`)
      if (f.uniqueCount > 0 && f.uniqueCount < 20 && f.totalRecords > 50) {
        parts.push(`Only ${f.uniqueCount} unique values — dictionary?`)
      } else if (f.uniqueCount > 0) {
        parts.push(`${fmt(f.uniqueCount)} unique values`)
      }
      break
    case "numeric":
      if (f.allIntegers) parts.push("All integers")
      parts.push(`Range: ${fmt(f.min)} – ${fmt(f.max)}`)
      break
    case "select":
      parts.push(`${f.definedChoices.length} choices (${f.usedChoices.length} actually used)`)
      break
    case "linkedRecord":
      if (f.multipleLinks === 0) {
        const pct = f.oneLinkPercent
        parts.push(`${pct}% have 0-1 links → Many-to-One`)
      } else {
        parts.push(`Up to ${f.maxLinks} links → Many-to-Many`)
      }
      break
    case "checkbox":
      parts.push(`${f.truePercent}% checked`)
      break
    case "date":
      if (f.earliest && f.latest) {
        parts.push(`${formatDate(f.earliest)} → ${formatDate(f.latest)}`)
      }
      break
    case "computed":
      parts.push("Computed — skip during import")
      break
    case "attachment": {
      const a = f as AttachmentFieldAnalysis
      parts.push(`${fmt(a.totalAttachments)} files (~${formatSize(a.totalSizeBytes)})`)
      break
    }
    case "generic":
      if (f.fieldType === "createdTime" || f.fieldType === "lastModifiedTime")
        parts.push("AT system field")
      if (f.fieldType === "createdBy" || f.fieldType === "lastModifiedBy")
        parts.push("AT system field")
      break
  }

  return parts.join(". ")
}

// ---------------------------------------------------------------------------
// Per-field detail sections
// ---------------------------------------------------------------------------

function appendFieldDetail(lines: string[], f: FieldAnalysis): void {
  lines.push(`#### ${f.fieldName} (${f.fieldType})`)
  lines.push("")

  switch (f.kind) {
    case "text":
      appendTextDetail(lines, f)
      break
    case "numeric":
      appendNumericDetail(lines, f)
      break
    case "checkbox":
      appendCheckboxDetail(lines, f)
      break
    case "date":
      appendDateDetail(lines, f)
      break
    case "select":
      appendSelectDetail(lines, f)
      break
    case "linkedRecord":
      appendLinkedRecordDetail(lines, f)
      break
    case "attachment":
      appendAttachmentDetail(lines, f)
      break
    case "computed":
      appendComputedDetail(lines, f)
      break
    case "generic":
      appendGenericDetail(lines, f)
      break
  }

  // Flags
  if (f.flags.length > 0) {
    for (const flag of f.flags) {
      lines.push(`- **${flag}**`)
    }
  }

  lines.push("")
}

function appendTextDetail(lines: string[], f: TextFieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  if (f.maxLength > 0) {
    lines.push(
      `- Length: min ${fmt(f.minLength)}, max ${fmt(f.maxLength)}, avg ${fmt(f.avgLength)}`
    )
  }
  lines.push(
    `- Unique values: ${fmt(f.uniqueCount)} (${f.totalRecords > 0 ? Math.round((f.uniqueCount / (f.totalRecords - f.nullCount || 1)) * 100) : 0}%)`
  )

  if (f.topValues.length > 0 && f.uniqueCount <= 30) {
    lines.push("")
    lines.push("| Value | Count |")
    lines.push("|-------|-------|")
    for (const tv of f.topValues) {
      lines.push(`| ${escMd(truncate(tv.value, 60))} | ${tv.count} |`)
    }
  }

  if (f.longestSample && f.maxLength > 100) {
    lines.push(`- Longest value (truncated): "${escMd(f.longestSample)}"`)
  }
}

function appendNumericDetail(lines: string[], f: NumericFieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  lines.push(`- Min: ${f.min} | Max: ${f.max} | Avg: ${f.avg} | Median: ${f.median}`)
  lines.push(
    `- All integers: ${f.allIntegers ? "yes" : `no (up to ${f.maxDecimalPlaces} decimal places)`}`
  )
}

function appendCheckboxDetail(lines: string[], f: CheckboxFieldAnalysis): void {
  lines.push(
    `- Records: ${fmt(f.totalRecords)} | True: ${fmt(f.trueCount)} (${f.truePercent}%) | False: ${fmt(f.totalRecords - f.trueCount)} (${100 - f.truePercent}%)`
  )
}

function appendDateDetail(lines: string[], f: DateFieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  if (f.earliest && f.latest) {
    lines.push(`- Range: ${formatDate(f.earliest)} → ${formatDate(f.latest)}`)
  }
}

function appendSelectDetail(lines: string[], f: SelectFieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  if (f.isMultiple) {
    lines.push("- Type: multipleSelects (array of choices per record)")
  }

  lines.push("")
  lines.push("| Choice | Records | % |")
  lines.push("|--------|---------|---|")

  for (const uc of f.usedChoices) {
    lines.push(`| ${escMd(uc.name)} | ${fmt(uc.count)} | ${uc.percent}% |`)
  }

  // Show unused choices
  for (const name of f.unusedChoices) {
    lines.push(`| ${escMd(name)} | 0 | 0% — **never used** |`)
  }

  if (f.unusedChoices.length > 0) {
    const usedCount = f.usedChoices.length
    const totalCount = f.definedChoices.length
    lines.push("")
    lines.push(`> ${totalCount} defined choices, only ${usedCount} actually used in data.`)
  }
}

function appendLinkedRecordDetail(lines: string[], f: LinkedRecordFieldAnalysis): void {
  lines.push(`- Links to: ${f.linkedTableName ?? "unknown"} (${f.linkedTableId})`)
  lines.push(
    `- Cardinality: 0 links: ${fmt(f.zeroLinks)} (${f.zeroLinksPercent}%), 1 link: ${fmt(f.oneLink)} (${f.oneLinkPercent}%), 2+ links: ${fmt(f.multipleLinks)} (${f.multipleLinksPercent}%)`
  )
  if (f.maxLinks > 1) {
    lines.push(`- Max links per record: ${f.maxLinks}`)
  }
  if (f.multipleLinks === 0) {
    lines.push("- **→ Many-to-One relationship** (single FK)")
  } else {
    lines.push("- **→ Many-to-Many relationship**")
  }
}

function appendAttachmentDetail(lines: string[], f: AttachmentFieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  lines.push(`- Total attachments: ${fmt(f.totalAttachments)} (~${formatSize(f.totalSizeBytes)})`)

  if (f.fileTypes.length > 0) {
    lines.push("")
    lines.push("| File Type | Count |")
    lines.push("|-----------|-------|")
    for (const ft of f.fileTypes) {
      lines.push(`| ${ft.type} | ${fmt(ft.count)} |`)
    }
  }
}

function appendComputedDetail(lines: string[], f: ComputedFieldAnalysis): void {
  lines.push(`- Type: ${f.fieldType}`)
  if (f.resultType) {
    lines.push(`- Result type: ${f.resultType}`)
  }
  if (f.sampleValues.length > 0) {
    lines.push(`- Sample values: ${f.sampleValues.map((v) => `\`${truncate(v, 50)}\``).join(", ")}`)
  }
}

function appendGenericDetail(lines: string[], f: FieldAnalysis): void {
  lines.push(`- Records: ${fmt(f.totalRecords)} | Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`)
  if ("sampleValues" in f && Array.isArray(f.sampleValues) && f.sampleValues.length > 0) {
    lines.push(
      `- Sample values: ${f.sampleValues.map((v: string) => `\`${truncate(v, 50)}\``).join(", ")}`
    )
  }
}

// ---------------------------------------------------------------------------
// Data quality flags table
// ---------------------------------------------------------------------------

function appendFlags(lines: string[], flags: DataQualityFlag[]): void {
  if (flags.length === 0) return

  lines.push("---")
  lines.push("")
  lines.push("## Data Quality Flags")
  lines.push("")
  lines.push("| Severity | Category | Table | Field | Detail |")
  lines.push("|----------|----------|-------|-------|--------|")

  for (const flag of flags) {
    const icon = flag.severity === "warning" ? "⚠️" : "ℹ️"
    lines.push(
      `| ${icon} ${flag.severity} | ${flag.category} | ${flag.table} | ${flag.field} | ${escMd(flag.detail)} |`
    )
  }

  lines.push("")
}

// ---------------------------------------------------------------------------
// Next Steps
// ---------------------------------------------------------------------------

function appendNextSteps(
  lines: string[],
  tables: TableAnalysis[],
  graph: DependencyGraph,
  flags: DataQualityFlag[]
): void {
  lines.push("---")
  lines.push("")
  lines.push("## Next Steps")
  lines.push("")

  // --- Compute metrics ---
  const tablesWithData = tables.filter((t) => t.recordCount > 0).length
  const emptyTables = tables.length - tablesWithData
  const totalRecords = tables.reduce((s, t) => s + t.recordCount, 0)

  const computedCount = tables.reduce(
    (s, t) => s + t.fields.filter((f) => f.kind === "computed").length,
    0
  )

  const dictCandidates = tables.reduce(
    (s, t) =>
      s +
      t.fields.filter(
        (f): f is TextFieldAnalysis =>
          f.kind === "text" && f.uniqueCount < 20 && f.totalRecords > 50
      ).length,
    0
  )

  const selectCount = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is SelectFieldAnalysis => f.kind === "select").length,
    0
  )

  const m2oCount = tables.reduce(
    (s, t) =>
      s +
      t.fields.filter(
        (f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord" && f.multipleLinks === 0
      ).length,
    0
  )

  const m2mCount = tables.reduce(
    (s, t) =>
      s +
      t.fields.filter(
        (f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord" && f.multipleLinks > 0
      ).length,
    0
  )

  const attachmentFields = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is AttachmentFieldAnalysis => f.kind === "attachment").length,
    0
  )
  const totalAttachmentSize = tables.reduce(
    (s, t) =>
      s +
      t.fields
        .filter((f): f is AttachmentFieldAnalysis => f.kind === "attachment")
        .reduce((as_, f) => as_ + f.totalSizeBytes, 0),
    0
  )
  const totalAttachmentCount = tables.reduce(
    (s, t) =>
      s +
      t.fields
        .filter((f): f is AttachmentFieldAnalysis => f.kind === "attachment")
        .reduce((as_, f) => as_ + f.totalAttachments, 0),
    0
  )

  const warningCount = flags.filter((f) => f.severity === "warning").length

  // --- Complexity score ---
  let score = 0
  score += m2mCount
  score += graph.cycles.length
  score += graph.crossBaseLinks.length
  if (attachmentFields > 0) score++
  if (totalRecords > 10000) score++
  const complexity = score === 0 ? "Low" : score <= 2 ? "Medium" : "High"

  // --- Migration Readiness ---
  lines.push("### Migration Readiness")
  lines.push("")
  lines.push("| Metric | Value |")
  lines.push("|--------|-------|")
  lines.push(
    `| Tables to migrate | ${tables.length} (${tablesWithData} with data, ${emptyTables} empty) |`
  )
  lines.push(
    `| Computed fields (formulas/rollups) | ${computedCount} — must be recreated as app logic |`
  )
  lines.push(
    `| Dictionary candidates | ${dictCandidates} text field${dictCandidates !== 1 ? "s" : ""} → normalize into lookup tables |`
  )
  lines.push(
    `| Select fields | ${selectCount} → convert to enum types or lookup tables |`
  )
  lines.push(
    `| Relationships | ${m2oCount} Many-to-One (FK), ${m2mCount} Many-to-Many (junction tables) |`
  )
  lines.push(
    `| Data quality warnings | ${warningCount} — ${warningCount > 0 ? "fix before migrating" : "none"} |`
  )
  lines.push(`| Circular dependencies | ${graph.cycles.length} |`)
  lines.push(`| Cross-base links | ${graph.crossBaseLinks.length} |`)
  lines.push(`| **Estimated complexity** | **${complexity}** |`)
  lines.push("")

  // --- Recommended Target Schema ---
  const lookupTables = tables.reduce(
    (s, t) =>
      s +
      t.fields.filter(
        (f): f is SelectFieldAnalysis => f.kind === "select" && f.definedChoices.length >= 4
      ).length,
    0
  )
  const totalEstimatedTables = tablesWithData + m2mCount + lookupTables

  lines.push("### Recommended Target Schema")
  lines.push("")
  lines.push("Your Airtable structure maps to approximately:")
  lines.push("")
  lines.push(
    `- **${tablesWithData}** core PostgreSQL tables (from Airtable tables with data)`
  )
  if (m2mCount > 0) {
    lines.push(`- **${m2mCount}** junction tables (for Many-to-Many relationships)`)
  }
  if (lookupTables > 0) {
    lines.push(`- **${lookupTables}** lookup tables (from select fields with 4+ choices)`)
  }
  lines.push(
    `- **${totalEstimatedTables}** total tables, **${m2oCount}** foreign key relationships`
  )
  lines.push("")

  // --- How to Proceed ---
  lines.push("### How to Proceed")
  lines.push("")
  let step = 1
  if (warningCount > 0) {
    lines.push(
      `${step}. **Fix data quality issues** — resolve the ${warningCount} warning${warningCount !== 1 ? "s" : ""} flagged above`
    )
    step++
  }
  lines.push(
    `${step}. **Design target schema** — use the import order and relationship analysis as your starting point`
  )
  step++
  if (computedCount > 0) {
    lines.push(
      `${step}. **Handle computed fields** — the ${computedCount} formula/rollup/lookup field${computedCount !== 1 ? "s" : ""} must be recreated as application logic or database views`
    )
    step++
  }
  if (dictCandidates > 0) {
    lines.push(
      `${step}. **Normalize dictionaries** — the ${dictCandidates} dictionary-candidate text field${dictCandidates !== 1 ? "s" : ""} should become lookup tables`
    )
    step++
  }
  if (attachmentFields > 0) {
    lines.push(
      `${step}. **Plan attachment migration** — ${fmt(totalAttachmentCount)} files (~${formatSize(totalAttachmentSize)}) need a file storage solution (S3, Cloudflare R2, etc.)`
    )
    step++
  }
  lines.push(
    `${step}. **Import in dependency order** — follow the import order table above to maintain referential integrity`
  )
  lines.push("")

  // --- Attribution ---
  lines.push("---")
  lines.push("")
  lines.push(
    "*This report was generated by [airtable-discover](https://github.com/mperlak/airtable-discover) — a free, open-source Airtable migration analysis tool. Built by the creator of [Straktur](https://straktur.com), a Next.js boilerplate for internal business apps.*"
  )
  lines.push("")
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sortByImportOrder(tables: TableAnalysis[], graph: DependencyGraph): TableAnalysis[] {
  const orderMap = new Map(graph.importOrder.map((entry, i) => [entry.tableId, i]))
  return [...tables].sort(
    (a, b) => (orderMap.get(a.tableId) ?? 999) - (orderMap.get(b.tableId) ?? 999)
  )
}

function fmt(n: number): string {
  return n.toLocaleString("en-US")
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDateTime(d: Date): string {
  return d
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "")
}

function formatDate(s: string): string {
  return s.slice(0, 10)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + "..."
}

function escMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ")
}
