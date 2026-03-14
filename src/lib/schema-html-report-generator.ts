/**
 * Generates a self-contained HTML report for schema-only mode.
 * Same design as full HTML report, but without record-level statistics.
 */

import type { AirtableTable, AirtableField } from "./airtable-client"

// Re-use CSS/JS from the full report generator
import { getReportCSS, getReportJS } from "./html-report-styles"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SchemaHtmlReportInput {
  bases: { baseId: string; baseName: string }[]
  tables: AirtableTable[]
  generatedAt: Date
}

export function generateSchemaHtmlReport(input: SchemaHtmlReportInput): string {
  const { bases, tables, generatedAt } = input

  const tableNameById = new Map(tables.map((t) => [t.id, t.name]))
  const allTableIds = new Set(tables.map((t) => t.id))

  const totalFields = tables.reduce((s, t) => s + t.fields.length, 0)
  const computedFields = tables.reduce((s, t) => s + t.fields.filter((f) => isComputedType(f.type)).length, 0)
  const dataFieldCount = totalFields - computedFields
  const linkedFields = tables.reduce((s, t) => s + t.fields.filter((f) => f.type === "multipleRecordLinks").length, 0)
  const selectFields = tables.reduce((s, t) => s + t.fields.filter((f) => f.type === "singleSelect" || f.type === "multipleSelects").length, 0)

  const { links, crossBaseLinks } = collectLinks(tables, tableNameById, allTableIds)
  const importOrder = computeImportOrder(tables, links)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Airtable Schema Report — ${bases.map((b) => b.baseName).join(", ")}</title>
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
  <a href="#import-order" class="sidebar-link">Import Order</a>
  <div class="sidebar-divider"></div>
  <div class="sidebar-label">Tables</div>
  ${tables.map((t) => `<a href="#table-${esc(t.id)}" class="sidebar-link sidebar-link-table">${esc(t.name)}</a>`).join("\n  ")}
  <div class="sidebar-footer">
    <button onclick="toggleTheme()" class="theme-toggle" title="Toggle dark/light mode">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
  </div>
</nav>

<main class="content">

<header class="header">
  <div class="header-top">
    <h1>Airtable Schema Report</h1>
    <span class="badge" style="background:var(--accent)">Schema only</span>
  </div>
  <p class="header-meta">
    ${bases.map((b) => `<strong>${esc(b.baseName)}</strong> <code>${esc(b.baseId)}</code>`).join(" · ")}
    &nbsp;·&nbsp; ${formatDateTime(generatedAt)}
  </p>
  <p class="header-sub">by <a href="https://straktur.com?utm_source=airtable-migration-audit&amp;utm_medium=report&amp;utm_content=header" target="_blank">straktur.com</a> · <span class="trust-line">Runs locally · report stored on your machine</span></p>
  <p class="verdict">${tables.length} table${tables.length !== 1 ? "s" : ""}, ${totalFields} fields (${dataFieldCount} data, ${computedFields} computed), ${linkedFields} relationships. Run full analysis for per-field statistics and data quality audit.</p>
</header>

<section id="summary">
  <h2>Summary</h2>
  <div class="cards">
    <div class="card"><div class="card-value">${tables.length}</div><div class="card-label">Tables</div></div>
    <div class="card"><div class="card-value">${dataFieldCount}</div><div class="card-label">Data fields</div></div>
    <div class="card"><div class="card-value">${computedFields}</div><div class="card-label">Computed fields</div></div>
    <div class="card"><div class="card-value">${linkedFields}</div><div class="card-label">Relationships</div></div>
    <div class="card"><div class="card-value">${selectFields}</div><div class="card-label">Select fields</div></div>
  </div>
</section>

<section id="import-order">
  <h2>Relationships & Import Order</h2>
  <table class="data-table">
    <thead><tr><th>#</th><th>Table</th><th>Depends On</th></tr></thead>
    <tbody>
${importOrder.map((e, i) => `      <tr><td>${i + 1}</td><td><strong>${esc(e.tableName)}</strong></td><td>${esc(e.dependsOn.length > 0 ? e.dependsOn.join(", ") : "—")}</td></tr>`).join("\n")}
    </tbody>
  </table>
${crossBaseLinks.length > 0 ? `  <div class="callout callout-warn"><strong>Cross-base links:</strong> ${crossBaseLinks.map((l) => `${l.fromTable}.${l.fromField} → ${l.toTableId}`).join(", ")}</div>` : ""}
</section>

${tables.map((t) => renderSchemaTable(t, tableNameById)).join("\n")}

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
// Per-table renderer
// ---------------------------------------------------------------------------

function renderSchemaTable(table: AirtableTable, tableNameById: Map<string, string>): string {
  const dataFields = table.fields.filter((f) => !isComputedType(f.type))
  const computedFields = table.fields.filter((f) => isComputedType(f.type))
  const fieldNameById = new Map(table.fields.map((f) => [f.id, f.name]))

  let html = `<section id="table-${esc(table.id)}" class="table-section">
<h2 class="table-header" onclick="toggleSection(this)">
  <span class="collapse-icon">▸</span>
  ${esc(table.name)}
  <span class="table-meta">${table.fields.length} fields (${dataFields.length} data, ${computedFields.length} computed)</span>
</h2>
<div class="table-body collapsed">\n`

  if (table.description) {
    html += `<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px">${esc(table.description)}</p>\n`
  }

  // Fields table
  html += `<table class="data-table">\n<thead><tr><th>#</th><th>Field</th><th>Type</th><th>Notes</th></tr></thead>\n<tbody>\n`
  for (let i = 0; i < table.fields.length; i++) {
    const f = table.fields[i]!
    const isComputed = isComputedType(f.type)
    const typeStr = fieldTypeDisplay(f, tableNameById)
    const notes = fieldNotes(f, table.primaryFieldId, tableNameById, fieldNameById)
    html += `<tr${isComputed ? ' class="unused"' : ""}><td>${i + 1}</td><td><strong>${esc(f.name)}</strong>${f.id === table.primaryFieldId ? ' <span class="badge badge-info">PK</span>' : ""}</td><td><code>${esc(typeStr)}</code></td><td>${esc(notes)}</td></tr>\n`
  }
  html += `</tbody></table>\n`

  // Select choices
  const selectFieldsList = table.fields.filter((f) => f.type === "singleSelect" || f.type === "multipleSelects")
  if (selectFieldsList.length > 0) {
    html += `<h3>Select Choices</h3>\n`
    for (const f of selectFieldsList) {
      const choices = f.options?.choices ?? []
      if (choices.length === 0) continue
      const multi = f.type === "multipleSelects" ? " (multi)" : ""
      const sorted = [...choices].sort((a, b) => a.name.localeCompare(b.name))
      const formatted = sorted.map((c) => {
        const isRecId = /^rec[A-Za-z0-9]{14,}$/.test(c.name)
        return isRecId ? `<code>${esc(c.name)}</code> <span class="badge badge-warn" style="font-size:10px">record ID?</span>` : esc(c.name)
      })
      html += `<p style="font-size:13px;margin:6px 0"><strong>${esc(f.name)}</strong>${multi}: ${formatted.join(" · ")}</p>\n`
    }
  }

  html += `</div></section>`
  return html
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPUTED_TYPES = new Set(["formula", "rollup", "count", "multipleLookupValues"])
function isComputedType(type: string): boolean { return COMPUTED_TYPES.has(type) }

function fieldTypeDisplay(f: AirtableField, tableNameById: Map<string, string>): string {
  if (f.type === "multipleRecordLinks") {
    return `linkedRecord → ${tableNameById.get(f.options?.linkedTableId ?? "") ?? f.options?.linkedTableId}`
  }
  if (isComputedType(f.type) && f.options?.result?.type) {
    return `${f.type} (${f.options.result.type})`
  }
  return f.type
}

function humanizeFormula(formula: string, fieldNameById: Map<string, string>): string {
  return formula.replace(/\{(fld[A-Za-z0-9]+)\}/g, (_match, fieldId: string) => {
    const name = fieldNameById.get(fieldId)
    return name ? `{${name}}` : `{${fieldId}}`
  })
}

function fieldNotes(f: AirtableField, primaryFieldId: string, tableNameById: Map<string, string>, fieldNameById: Map<string, string>): string {
  const parts: string[] = []
  if (f.id === primaryFieldId) parts.push("Primary")
  if (f.description) parts.push(f.description.slice(0, 80))
  if (f.type === "singleSelect" || f.type === "multipleSelects") parts.push(`${f.options?.choices?.length ?? 0} choices`)
  if (f.type === "multipleRecordLinks" && f.options?.prefersSingleRecordLink) parts.push("single-record link")
  if ((f.type === "number" || f.type === "currency") && f.options?.precision !== undefined) parts.push(`precision: ${f.options.precision}`)
  if ((f.type === "number" || f.type === "currency") && f.options?.symbol) parts.push(f.options.symbol)
  if (f.type === "formula" && f.options?.formula) parts.push(humanizeFormula(f.options.formula, fieldNameById))
  if (isComputedType(f.type)) parts.push("computed — skip during import")
  if (["createdTime", "lastModifiedTime", "createdBy", "lastModifiedBy"].includes(f.type)) parts.push("system field")
  return parts.join(". ")
}

interface SchemaLink { fromTable: string; fromField: string; toTableId: string; toTableName: string | null }
interface DepEntry { tableName: string; dependsOn: string[] }

function collectLinks(tables: AirtableTable[], tableNameById: Map<string, string>, allTableIds: Set<string>) {
  const links: SchemaLink[] = []
  const crossBaseLinks: SchemaLink[] = []
  for (const table of tables) {
    for (const field of table.fields) {
      if (field.type !== "multipleRecordLinks") continue
      const toTableId = field.options?.linkedTableId ?? "unknown"
      const link = { fromTable: table.name, fromField: field.name, toTableId, toTableName: tableNameById.get(toTableId) ?? null }
      if (allTableIds.has(toTableId)) links.push(link); else crossBaseLinks.push(link)
    }
  }
  return { links, crossBaseLinks }
}

function computeImportOrder(tables: AirtableTable[], links: SchemaLink[]): DepEntry[] {
  const deps = new Map<string, Set<string>>()
  const reverseDeps = new Map<string, Set<string>>()
  for (const t of tables) { deps.set(t.name, new Set()); reverseDeps.set(t.name, new Set()) }
  for (const link of links) {
    if (link.toTableName && link.fromTable !== link.toTableName) {
      deps.get(link.fromTable)?.add(link.toTableName)
      reverseDeps.get(link.toTableName)?.add(link.fromTable)
    }
  }
  const inDeg = new Map<string, number>()
  for (const [name, d] of deps) inDeg.set(name, d.size)
  const queue: string[] = []
  for (const [name, deg] of inDeg) { if (deg === 0) queue.push(name) }
  const order: DepEntry[] = []
  const visited = new Set<string>()
  while (queue.length > 0) {
    const name = queue.shift()!
    visited.add(name)
    order.push({ tableName: name, dependsOn: Array.from(deps.get(name) || []) })
    for (const dep of reverseDeps.get(name) || []) {
      if (!visited.has(dep)) {
        const nd = (inDeg.get(dep) || 1) - 1
        inDeg.set(dep, nd)
        if (nd === 0) queue.push(dep)
      }
    }
  }
  for (const t of tables) { if (!visited.has(t.name)) order.push({ tableName: t.name, dependsOn: Array.from(deps.get(t.name) || []) }) }
  return order
}

function formatDateTime(d: Date): string { return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "") }
function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }
