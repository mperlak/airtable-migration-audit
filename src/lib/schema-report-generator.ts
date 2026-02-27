/**
 * Generates a schema-only report (no record data needed).
 * Shows table structure, field types, relationships, and dependency graph.
 */

import type { AirtableTable, AirtableField } from "./airtable-client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemaReportInput {
  bases: { baseId: string; baseName: string }[]
  tables: AirtableTable[]
  generatedAt: Date
}

interface SchemaLink {
  fromTable: string
  fromField: string
  toTableId: string
  toTableName: string | null
  prefersSingle: boolean
}

interface SchemaDependencyEntry {
  tableName: string
  dependsOn: string[]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateSchemaReport(input: SchemaReportInput): string {
  const { bases, tables, generatedAt } = input
  const lines: string[] = []

  const tableNameById = new Map(tables.map((t) => [t.id, t.name]))
  const allTableIds = new Set(tables.map((t) => t.id))

  // Detect duplicate names across bases
  const nameCount = new Map<string, number>()
  for (const t of tables) {
    nameCount.set(t.name, (nameCount.get(t.name) || 0) + 1)
  }
  const duplicateNames = new Set(
    Array.from(nameCount.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  )

  lines.push("# Airtable Schema Report")
  lines.push("")
  lines.push(`Generated: ${formatDateTime(generatedAt)}`)
  lines.push(`Bases analyzed: ${bases.map((b) => `${b.baseName} (${b.baseId})`).join(", ")}`)
  lines.push(`Mode: **schema-only** (no record data fetched)`)
  lines.push("")

  // --- Summary ---
  const totalFields = tables.reduce((s, t) => s + t.fields.length, 0)
  const linkedFields = tables.reduce(
    (s, t) => s + t.fields.filter((f) => f.type === "multipleRecordLinks").length,
    0
  )
  const selectFields = tables.reduce(
    (s, t) => s + t.fields.filter((f) => f.type === "singleSelect" || f.type === "multipleSelects").length,
    0
  )
  const computedFields = tables.reduce(
    (s, t) => s + t.fields.filter((f) => isComputedType(f.type)).length,
    0
  )

  lines.push("## Summary")
  lines.push("")
  lines.push("| Metric | Value |")
  lines.push("|--------|-------|")
  lines.push(`| Tables | ${tables.length} |`)
  lines.push(`| Total fields | ${totalFields} |`)
  lines.push(`| Data fields | ${totalFields - computedFields} |`)
  lines.push(`| Computed fields | ${computedFields} |`)
  lines.push(`| Linked record fields | ${linkedFields} |`)
  lines.push(`| Select fields | ${selectFields} |`)
  lines.push("")

  // --- Dependency graph ---
  const { links, crossBaseLinks } = collectLinks(tables, tableNameById, allTableIds)
  const importOrder = computeImportOrder(tables, links, tableNameById, allTableIds)

  lines.push("## Relationships & Import Order")
  lines.push("")
  lines.push("| Order | Table | Depends On |")
  lines.push("|-------|-------|------------|")
  for (let i = 0; i < importOrder.length; i++) {
    const entry = importOrder[i]!
    const deps = entry.dependsOn.length > 0 ? entry.dependsOn.join(", ") : "—"
    lines.push(`| ${i + 1} | ${entry.tableName} | ${deps} |`)
  }
  lines.push("")

  if (crossBaseLinks.length > 0) {
    lines.push("> **Cross-base links detected:**")
    lines.push(">")
    for (const link of crossBaseLinks) {
      lines.push(`> - ${link.fromTable}.${link.fromField} → unknown table ${link.toTableId}`)
    }
    lines.push("")
  }

  // --- Per-table sections ---
  for (const table of tables) {
    const suffix = duplicateNames.has(table.name) ? ` [base]` : ""
    lines.push("---")
    lines.push("")
    lines.push(`## Table: ${table.name}${suffix}`)
    lines.push("")

    if (table.description) {
      lines.push(`> ${table.description}`)
      lines.push("")
    }

    lines.push("| # | Field | Type | Notes |")
    lines.push("|---|-------|------|-------|")

    for (let i = 0; i < table.fields.length; i++) {
      const f = table.fields[i]!
      const num = i + 1
      const typeStr = fieldTypeDisplay(f, tableNameById)
      const notes = fieldNotes(f, table.primaryFieldId, tableNameById)
      lines.push(`| ${num} | ${f.name} | ${typeStr} | ${notes} |`)
    }

    // Show select choices if any
    const selectFieldsList = table.fields.filter(
      (f) => f.type === "singleSelect" || f.type === "multipleSelects"
    )
    if (selectFieldsList.length > 0) {
      lines.push("")
      lines.push("#### Select Choices")
      lines.push("")
      for (const f of selectFieldsList) {
        const choices = f.options?.choices ?? []
        if (choices.length === 0) continue
        const multi = f.type === "multipleSelects" ? " (multi)" : ""
        lines.push(`**${f.name}**${multi}: ${choices.map((c) => c.name).join(", ")}`)
        lines.push("")
      }
    }

    lines.push("")
  }

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPUTED_TYPES = new Set(["formula", "rollup", "count", "multipleLookupValues"])

function isComputedType(type: string): boolean {
  return COMPUTED_TYPES.has(type)
}

function fieldTypeDisplay(f: AirtableField, tableNameById: Map<string, string>): string {
  if (f.type === "multipleRecordLinks") {
    const linkedName = tableNameById.get(f.options?.linkedTableId ?? "") ?? f.options?.linkedTableId
    return `linkedRecord → ${linkedName}`
  }
  if (isComputedType(f.type) && f.options?.result?.type) {
    return `${f.type} (${f.options.result.type})`
  }
  return f.type
}

function fieldNotes(
  f: AirtableField,
  primaryFieldId: string,
  tableNameById: Map<string, string>
): string {
  const parts: string[] = []

  if (f.id === primaryFieldId) parts.push("Primary")

  if (f.description) {
    parts.push(f.description.slice(0, 80))
  }

  if (f.type === "singleSelect" || f.type === "multipleSelects") {
    const count = f.options?.choices?.length ?? 0
    parts.push(`${count} choices`)
  }

  if (f.type === "multipleRecordLinks") {
    if (f.options?.prefersSingleRecordLink) {
      parts.push("single-record link")
    }
  }

  if (f.type === "number" || f.type === "currency") {
    if (f.options?.precision !== undefined) {
      parts.push(`precision: ${f.options.precision}`)
    }
    if (f.options?.symbol) {
      parts.push(f.options.symbol)
    }
  }

  if (f.type === "formula" && f.options?.formula) {
    parts.push(`\`${f.options.formula.slice(0, 60)}\``)
  }

  if (isComputedType(f.type)) {
    parts.push("computed — skip during import")
  }

  if (f.type === "createdTime" || f.type === "lastModifiedTime" || f.type === "createdBy" || f.type === "lastModifiedBy") {
    parts.push("system field")
  }

  return parts.join(". ")
}

function collectLinks(
  tables: AirtableTable[],
  tableNameById: Map<string, string>,
  allTableIds: Set<string>
): { links: SchemaLink[]; crossBaseLinks: SchemaLink[] } {
  const links: SchemaLink[] = []
  const crossBaseLinks: SchemaLink[] = []

  for (const table of tables) {
    for (const field of table.fields) {
      if (field.type !== "multipleRecordLinks") continue
      const toTableId = field.options?.linkedTableId ?? "unknown"
      const link: SchemaLink = {
        fromTable: table.name,
        fromField: field.name,
        toTableId,
        toTableName: tableNameById.get(toTableId) ?? null,
        prefersSingle: field.options?.prefersSingleRecordLink ?? false,
      }
      if (allTableIds.has(toTableId)) {
        links.push(link)
      } else {
        crossBaseLinks.push(link)
      }
    }
  }

  return { links, crossBaseLinks }
}

function computeImportOrder(
  tables: AirtableTable[],
  links: SchemaLink[],
  tableNameById: Map<string, string>,
  allTableIds: Set<string>
): SchemaDependencyEntry[] {
  const tableByName = new Map(tables.map((t) => [t.name, t]))

  // Build deps: tableName → set of tableNames it depends on
  const deps = new Map<string, Set<string>>()
  for (const t of tables) {
    deps.set(t.name, new Set())
  }

  for (const link of links) {
    if (link.toTableName && link.fromTable !== link.toTableName) {
      deps.get(link.fromTable)?.add(link.toTableName)
    }
  }

  // Kahn's algorithm
  const inDeg = new Map<string, number>()
  const reverseDeps = new Map<string, Set<string>>()
  for (const t of tables) {
    reverseDeps.set(t.name, new Set())
  }
  for (const [name, d] of deps) {
    inDeg.set(name, d.size)
    for (const dep of d) {
      reverseDeps.get(dep)?.add(name)
    }
  }

  const queue: string[] = []
  for (const [name, deg] of inDeg) {
    if (deg === 0) queue.push(name)
  }

  const order: SchemaDependencyEntry[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const name = queue.shift()!
    visited.add(name)
    order.push({
      tableName: name,
      dependsOn: Array.from(deps.get(name) || []),
    })
    for (const dependent of reverseDeps.get(name) || []) {
      if (!visited.has(dependent)) {
        const newDeg = (inDeg.get(dependent) || 1) - 1
        inDeg.set(dependent, newDeg)
        if (newDeg === 0) queue.push(dependent)
      }
    }
  }

  // Append unvisited (cycles)
  for (const t of tables) {
    if (!visited.has(t.name)) {
      order.push({
        tableName: t.name,
        dependsOn: Array.from(deps.get(t.name) || []),
      })
    }
  }

  return order
}

function formatDateTime(d: Date): string {
  return d
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "")
}
