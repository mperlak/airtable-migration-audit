/**
 * Generates a self-contained HTML report from analysis results.
 * Single file, zero external dependencies — inline CSS + minimal JS.
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

import { getReportCSS, getReportJS } from "./html-report-styles"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface HtmlReportInput {
  bases: { baseId: string; baseName: string }[]
  tables: TableAnalysis[]
  graph: DependencyGraph
  flags: DataQualityFlag[]
  generatedAt: Date
}

export function generateHtmlReport(input: HtmlReportInput): string {
  const { bases, tables, graph, flags, generatedAt } = input

  const warnings = flags.filter((f) => f.severity === "warning")
  const sortedTables = sortByImportOrder(tables, graph)

  // Compute metrics
  const totalRecords = tables.reduce((s, t) => s + t.recordCount, 0)
  const totalFields = tables.reduce((s, t) => s + t.fieldSummary.total, 0)
  const computedFields = tables.reduce((s, t) => s + t.fieldSummary.computed, 0)
  const dataFieldCount = totalFields - computedFields
  const linkedFields = tables.reduce((s, t) => s + t.fieldSummary.linkedRecord, 0)
  const selectFields = tables.reduce((s, t) => s + t.fieldSummary.select, 0)

  // Complexity
  const m2mCount = tables.reduce(
    (s, t) =>
      s + t.fields.filter((f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord" && f.multipleLinks > 0).length,
    0
  )
  let score = 0
  score += m2mCount
  score += graph.cycles.length
  score += graph.crossBaseLinks.length
  if (tables.reduce((s, t) => s + t.fields.filter((f) => f.kind === "attachment").length, 0) > 0) score++
  if (totalRecords > 10000) score++
  const complexity = score === 0 ? "Low" : score <= 2 ? "Medium" : "High"
  const complexityColor = score === 0 ? "var(--green)" : score <= 2 ? "var(--yellow)" : "var(--red)"

  // Build verdict
  const warningCount = warnings.length
  const blockerNote = warningCount > 0 ? `, ${warningCount} data quality issue${warningCount !== 1 ? "s" : ""} to resolve first` : ""
  const m2mNote = m2mCount > 0 ? ` ${m2mCount} many-to-many relationship${m2mCount !== 1 ? "s" : ""} need junction tables.` : ""
  const cycleNote = graph.cycles.length > 0 ? ` Circular dependencies detected — requires two-pass import.` : ""
  const verdict = `${complexity} complexity migration. ${tables.length} table${tables.length !== 1 ? "s" : ""}, ${fmt(totalRecords)} records${blockerNote}.${m2mNote}${cycleNote}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Airtable Migration Audit — ${bases.map((b) => b.baseName).join(", ")}</title>
<style>
${getReportCSS()}
</style>
</head>
<body>

<nav class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    Straktur Audit
  </div>
  <a href="#summary" class="sidebar-link active">Summary</a>
  <a href="#next-steps" class="sidebar-link">Next Steps</a>
  ${warnings.length > 0 ? '<a href="#warnings" class="sidebar-link">Warnings</a>' : ""}
  <a href="#import-order" class="sidebar-link">Import Order</a>
  <div class="sidebar-divider"></div>
  <div class="sidebar-label">Tables</div>
  ${sortedTables.map((t) => `<a href="#table-${esc(t.tableId)}" class="sidebar-link sidebar-link-table">${esc(t.tableName)}</a>`).join("\n  ")}
  <div class="sidebar-footer">
    <button onclick="toggleTheme()" class="theme-toggle" title="Toggle dark/light mode">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
  </div>
</nav>

<main class="content">

<header class="header">
  <div class="header-top">
    <h1>Airtable Migration Audit</h1>
    <span class="badge" style="background:${complexityColor}">${complexity} complexity</span>
    <span class="badge" style="background:var(--accent)">Full analysis</span>
  </div>
  <p class="header-meta">
    ${bases.map((b) => `<strong>${esc(b.baseName)}</strong> <code>${esc(b.baseId)}</code>`).join(" · ")}
    &nbsp;·&nbsp; ${formatDateTime(generatedAt)}
  </p>
  <p class="header-sub">by <a href="https://straktur.com?utm_source=airtable-migration-audit&amp;utm_medium=report&amp;utm_content=header" target="_blank">straktur.com</a> · <span class="trust-line">Runs locally · report stored on your machine</span></p>
  <p class="verdict">${verdict}</p>
</header>

<!-- Summary -->
<section id="summary">
  <h2>Summary</h2>
  <div class="cards">
    <div class="card">
      <div class="card-value">${tables.length}</div>
      <div class="card-label">Tables</div>
    </div>
    <div class="card">
      <div class="card-value">${fmt(totalRecords)}</div>
      <div class="card-label">Records</div>
    </div>
    <div class="card">
      <div class="card-value">${dataFieldCount}</div>
      <div class="card-label">Data fields</div>
    </div>
    <div class="card">
      <div class="card-value">${computedFields}</div>
      <div class="card-label">Computed fields</div>
    </div>
    <div class="card">
      <div class="card-value">${linkedFields}</div>
      <div class="card-label">Relationships</div>
    </div>
    <div class="card">
      <div class="card-value">${selectFields}</div>
      <div class="card-label">Select fields</div>
    </div>
    <div class="card">
      <div class="card-value">${warnings.length}</div>
      <div class="card-label">Warnings</div>
    </div>
  </div>
</section>

<!-- Next Steps -->
${renderNextSteps(tables, graph, flags)}

<!-- Warnings -->
${renderWarnings(flags)}

<!-- Import Order -->
${renderImportOrder(graph, tables)}

<!-- Per-table sections -->
${sortedTables.map((t) => renderTable(t)).join("\n")}

<footer class="footer">
  <p>Generated by <a href="https://github.com/mperlak/airtable-migration-audit" target="_blank">airtable-migration-audit</a> — free, open-source Airtable migration analysis.</p>
  <p>Ready to build what comes next? <a href="https://straktur.com?utm_source=airtable-migration-audit&amp;utm_medium=report&amp;utm_content=footer-cta" target="_blank">Straktur</a> is a production-ready Next.js starter for internal tools.</p>
</footer>

</main>

<script>
${getReportJS()}
</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderNextSteps(
  tables: TableAnalysis[],
  graph: DependencyGraph,
  flags: DataQualityFlag[]
): string {
  const tablesWithData = tables.filter((t) => t.recordCount > 0).length
  const emptyTables = tables.length - tablesWithData
  const computedCount = tables.reduce((s, t) => s + t.fields.filter((f) => f.kind === "computed").length, 0)
  const m2oCount = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord" && f.multipleLinks === 0).length, 0)
  const m2mCount = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord" && f.multipleLinks > 0).length, 0)
  const selectCount = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is SelectFieldAnalysis => f.kind === "select").length, 0)
  const lookupTables = tables.reduce(
    (s, t) => s + t.fields.filter((f): f is SelectFieldAnalysis => f.kind === "select" && f.definedChoices.length >= 4).length, 0)
  const warningCount = flags.filter((f) => f.severity === "warning").length
  const totalEstimated = tablesWithData + m2mCount + lookupTables

  return `<section id="next-steps">
  <h2>Migration Readiness</h2>
  <table class="data-table">
    <tbody>
      <tr><td>Tables to migrate</td><td><strong>${tables.length}</strong> (${tablesWithData} with data, ${emptyTables} empty)</td></tr>
      <tr><td>Computed fields</td><td><strong>${computedCount}</strong> — recreate as app logic</td></tr>
      <tr><td>Select fields</td><td><strong>${selectCount}</strong> → enum types or lookup tables</td></tr>
      <tr><td>Relationships</td><td><strong>${m2oCount}</strong> Many-to-One (FK), <strong>${m2mCount}</strong> Many-to-Many (junction)</td></tr>
      <tr><td>Data quality warnings</td><td><strong>${warningCount}</strong>${warningCount > 0 ? " — fix before migrating" : ""}</td></tr>
      <tr><td>Circular dependencies</td><td>${graph.cycles.length}</td></tr>
      <tr><td>Cross-base links</td><td>${graph.crossBaseLinks.length}</td></tr>
    </tbody>
  </table>

  <h3>Recommended Target Schema</h3>
  <div class="cards cards-small">
    <div class="card"><div class="card-value">${tablesWithData}</div><div class="card-label">Core tables</div></div>
    ${m2mCount > 0 ? `<div class="card"><div class="card-value">${m2mCount}</div><div class="card-label">Junction tables</div></div>` : ""}
    ${lookupTables > 0 ? `<div class="card"><div class="card-value">${lookupTables}</div><div class="card-label">Lookup tables</div></div>` : ""}
    <div class="card"><div class="card-value">${totalEstimated}</div><div class="card-label">Total tables</div></div>
    <div class="card"><div class="card-value">${m2oCount}</div><div class="card-label">Foreign keys</div></div>
  </div>
</section>`
}

function renderWarnings(flags: DataQualityFlag[]): string {
  const warnings = flags.filter((f) => f.severity === "warning")
  if (warnings.length === 0) return ""

  const groups: Record<string, DataQualityFlag[]> = {
    "Data cleanup needed": [],
    "Schema decisions": [],
    "Low-priority cleanup": [],
  }

  for (const w of warnings) {
    if (
      w.category === "Similar choices" || w.category === "Composite value" ||
      w.category === "Constant field" || w.category === "Single-value field" ||
      w.category === "Dictionary candidate" ||
      (w.category === "Other" && w.detail.includes("used by only"))
    ) {
      groups["Data cleanup needed"]!.push(w)
    } else if (
      w.category === "Many-to-Many" || w.category === "Many-to-One" ||
      w.category === "Long text" || w.category === "Attachments" ||
      w.category === "Integer field" || w.category === "Single link"
    ) {
      groups["Schema decisions"]!.push(w)
    } else {
      groups["Low-priority cleanup"]!.push(w)
    }
  }

  let html = `<section id="warnings">\n<h2>Data Quality Warnings <span class="badge badge-warn">${warnings.length}</span></h2>\n`

  for (const [groupName, groupFlags] of Object.entries(groups)) {
    if (groupFlags.length === 0) continue
    html += `<h3>${esc(groupName)}</h3>\n<table class="data-table">\n<thead><tr><th>Table</th><th>Field</th><th>Issue</th></tr></thead>\n<tbody>\n`
    for (const f of groupFlags) {
      html += `<tr><td>${esc(f.table)}</td><td>${esc(f.field)}</td><td>${esc(f.detail)}</td></tr>\n`
    }
    html += `</tbody></table>\n`
  }

  html += `</section>`
  return html
}

function renderImportOrder(graph: DependencyGraph, tables: TableAnalysis[]): string {
  const recordsByTable = new Map(tables.map((t) => [t.tableName, t.recordCount]))

  let html = `<section id="import-order">\n<h2>Import Order</h2>\n<table class="data-table">\n<thead><tr><th>#</th><th>Table</th><th>Records</th><th>Depends On</th></tr></thead>\n<tbody>\n`

  for (let i = 0; i < graph.importOrder.length; i++) {
    const entry = graph.importOrder[i]!
    const records = recordsByTable.get(entry.tableName) ?? 0
    const deps = entry.dependsOn.length > 0 ? entry.dependsOn.join(", ") : "—"
    html += `<tr><td>${i + 1}</td><td><strong>${esc(entry.tableName)}</strong></td><td>${fmt(records)}</td><td>${esc(deps)}</td></tr>\n`
  }

  html += `</tbody></table>\n`

  if (graph.cycles.length > 0) {
    html += `<div class="callout callout-warn"><strong>Circular dependencies:</strong> ${graph.cycles.map((c) => c.join(" ↔ ")).join("; ")}. Import both without FK values, then resolve in a post-import pass.</div>\n`
  }
  if (graph.crossBaseLinks.length > 0) {
    html += `<div class="callout callout-warn"><strong>Cross-base links:</strong> ${graph.crossBaseLinks.map((l) => `${l.table}.${l.field} → ${l.linkedTableId}`).join(", ")}. Manual resolution needed.</div>\n`
  }

  html += `</section>`
  return html
}

function renderTable(table: TableAnalysis): string {
  const dataFields = table.fields.filter((f) => f.kind !== "computed")
  const computedFields = table.fields.filter((f): f is ComputedFieldAnalysis => f.kind === "computed")

  let html = `<section id="table-${esc(table.tableId)}" class="table-section">
<h2 class="table-header" onclick="toggleSection(this)">
  <span class="collapse-icon">▸</span>
  ${esc(table.tableName)}
  <span class="table-meta">${fmt(table.recordCount)} records · ${dataFields.length} data fields · ${computedFields.length} computed</span>
</h2>
<div class="table-body collapsed">\n`

  // Fields overview
  if (dataFields.length > 0) {
    html += `<h3>Fields Overview</h3>\n<table class="data-table">\n<thead><tr><th>#</th><th>Field</th><th>Type</th><th>Null%</th><th>Notes</th></tr></thead>\n<tbody>\n`
    for (let i = 0; i < dataFields.length; i++) {
      const f = dataFields[i]!
      const nullPct = fieldNullDisplay(f)
      const nullClass = f.nullPercent > 50 ? "high-null" : f.nullPercent > 20 ? "mid-null" : ""
      html += `<tr><td>${i + 1}</td><td><strong>${esc(f.fieldName)}</strong>${f.isPrimary ? ' <span class="badge badge-info">PK</span>' : ""}</td><td><code>${esc(fieldTypeDisplay(f))}</code></td><td class="${nullClass}">${nullPct}</td><td>${esc(fieldOverviewNotes(f))}</td></tr>\n`
    }
    html += `</tbody></table>\n`
  }

  // Computed fields summary
  if (computedFields.length > 0) {
    html += `<h3>Computed Fields <span class="badge badge-muted">${computedFields.length} — skip during import</span></h3>\n<table class="data-table">\n<thead><tr><th>Field</th><th>Type</th><th>Result</th><th>Recreate As</th></tr></thead>\n<tbody>\n`
    for (const cf of computedFields) {
      html += `<tr><td>${esc(cf.fieldName)}</td><td><code>${esc(cf.fieldType)}</code></td><td>${esc(cf.resultType ?? "—")}</td><td>${esc(recreateHint(cf))}</td></tr>\n`
    }
    html += `</tbody></table>\n`
  }

  // Field details
  if (dataFields.length > 0) {
    html += `<h3>Field Details</h3>\n`
    for (const f of dataFields) {
      html += renderFieldDetail(f)
    }
  }

  html += `</div></section>`
  return html
}

function renderFieldDetail(f: FieldAnalysis): string {
  let html = `<div class="field-detail">\n<h4>${esc(f.fieldName)} <code>${esc(f.fieldType)}</code></h4>\n`

  switch (f.kind) {
    case "text":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%) · Unique: ${fmt(f.uniqueCount)}`
      if (f.maxLength > 0) html += ` · Length: ${fmt(f.minLength)}–${fmt(f.maxLength)} (avg ${fmt(f.avgLength)})`
      html += `</div>\n`
      if (f.topValues.length > 0 && f.uniqueCount <= 30) {
        html += `<table class="data-table data-table-compact"><thead><tr><th>Value</th><th>Count</th></tr></thead><tbody>\n`
        for (const tv of f.topValues) {
          html += `<tr><td>${esc(truncate(tv.value, 80))}</td><td>${fmt(tv.count)}</td></tr>\n`
        }
        html += `</tbody></table>\n`
      }
      break
    case "numeric":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%) · Range: ${f.min}–${f.max} · Avg: ${f.avg} · Median: ${f.median} · ${f.allIntegers ? "All integers" : `Up to ${f.maxDecimalPlaces} decimals`}</div>\n`
      break
    case "checkbox":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · True: ${fmt(f.trueCount)} (${f.truePercent}%) · False: ${fmt(f.totalRecords - f.trueCount)} (${100 - f.truePercent}%)</div>\n`
      html += `<div class="progress-bar"><div class="progress-fill" style="width:${f.truePercent}%;background:var(--green)"></div></div>\n`
      break
    case "date":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%)`
      if (f.earliest && f.latest) html += ` · Range: ${f.earliest.slice(0, 10)} → ${f.latest.slice(0, 10)}`
      html += `</div>\n`
      break
    case "select":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%) · ${f.definedChoices.length} choices (${f.usedChoices.length} used)${f.isMultiple ? " · multipleSelects" : ""}</div>\n`
      html += `<table class="data-table data-table-compact"><thead><tr><th>Choice</th><th>Count</th><th>%</th></tr></thead><tbody>\n`
      for (const uc of f.usedChoices) {
        html += `<tr><td>${esc(uc.name)}</td><td>${fmt(uc.count)}</td><td>${uc.percent}%</td></tr>\n`
      }
      for (const name of f.unusedChoices) {
        html += `<tr class="unused"><td>${esc(name)}</td><td>0</td><td>0% — never used</td></tr>\n`
      }
      html += `</tbody></table>\n`
      break
    case "linkedRecord":
      html += `<div class="field-stats">Links to: <strong>${esc(f.linkedTableName ?? "unknown")}</strong> · 0 links: ${f.zeroLinksPercent}% · 1 link: ${f.oneLinkPercent}% · 2+ links: ${f.multipleLinksPercent}%${f.maxLinks > 1 ? ` · Max: ${f.maxLinks}` : ""}</div>\n`
      html += `<div class="field-stats"><strong>${f.multipleLinks === 0 ? "→ Many-to-One (FK)" : "→ Many-to-Many (junction table)"}</strong></div>\n`
      break
    case "attachment": {
      const a = f as AttachmentFieldAnalysis
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%) · ${fmt(a.totalAttachments)} files (~${formatSize(a.totalSizeBytes)})</div>\n`
      if (a.fileTypes.length > 0) {
        html += `<table class="data-table data-table-compact"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>\n`
        for (const ft of a.fileTypes) {
          html += `<tr><td><code>${esc(ft.type)}</code></td><td>${fmt(ft.count)}</td></tr>\n`
        }
        html += `</tbody></table>\n`
      }
      break
    }
    case "generic":
      html += `<div class="field-stats">Records: ${fmt(f.totalRecords)} · Null: ${fmt(f.nullCount)} (${f.nullPercent}%)</div>\n`
      break
  }

  // Flags
  if (f.flags.length > 0) {
    for (const flag of f.flags) {
      html += `<div class="flag">${esc(flag)}</div>\n`
    }
  }

  html += `</div>\n`
  return html
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (["createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy", "autoNumber"].includes(f.fieldType)) return "—"
  return `${f.nullPercent}%`
}

function fieldOverviewNotes(f: FieldAnalysis): string {
  const parts: string[] = []
  switch (f.kind) {
    case "text":
      if (f.maxLength > 255) parts.push(`Max ${fmt(f.maxLength)} chars`)
      if (f.uniqueCount > 0 && f.uniqueCount < 20 && f.totalRecords > 50) parts.push(`${f.uniqueCount} unique — dictionary?`)
      break
    case "numeric":
      if (f.allIntegers) parts.push("All integers")
      parts.push(`${fmt(f.min)}–${fmt(f.max)}`)
      break
    case "select":
      parts.push(`${f.definedChoices.length} choices (${f.usedChoices.length} used)`)
      break
    case "linkedRecord":
      parts.push(f.multipleLinks === 0 ? `${f.oneLinkPercent}% 0-1 links → M2O` : `Up to ${f.maxLinks} links → M2M`)
      break
    case "checkbox":
      parts.push(`${f.truePercent}% checked`)
      break
    case "date":
      if (f.earliest && f.latest) parts.push(`${f.earliest.slice(0, 10)} → ${f.latest.slice(0, 10)}`)
      break
    case "attachment":
      parts.push(`${fmt((f as AttachmentFieldAnalysis).totalAttachments)} files`)
      break
    case "generic":
      if (["createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy"].includes(f.fieldType)) parts.push("System field")
      break
  }
  return parts.join(" · ")
}

function recreateHint(f: ComputedFieldAnalysis): string {
  switch (f.fieldType) {
    case "formula": return "App logic or generated column"
    case "rollup": return "SQL aggregate / JOIN"
    case "count": return "SQL COUNT or app logic"
    case "multipleLookupValues": return "SQL JOIN"
    default: return "App logic"
  }
}

function sortByImportOrder(tables: TableAnalysis[], graph: DependencyGraph): TableAnalysis[] {
  const orderMap = new Map(graph.importOrder.map((entry, i) => [entry.tableId, i]))
  return [...tables].sort((a, b) => (orderMap.get(a.tableId) ?? 999) - (orderMap.get(b.tableId) ?? 999))
}

function fmt(n: number): string { return n.toLocaleString("en-US") }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "")
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "..."
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
