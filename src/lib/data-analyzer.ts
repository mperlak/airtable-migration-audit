/**
 * Per-field data analysis — computes statistics from actual Airtable records.
 * Pure functions, zero boilerplate dependencies.
 */

import type { AirtableField, AirtableRecord, AirtableTable, SelectChoice } from "./airtable-client"

// ---------------------------------------------------------------------------
// Analysis result types
// ---------------------------------------------------------------------------

export interface BaseFieldAnalysis {
  fieldId: string
  fieldName: string
  fieldType: string
  totalRecords: number
  nullCount: number
  nullPercent: number
  isPrimary: boolean
}

export interface TextFieldAnalysis extends BaseFieldAnalysis {
  kind: "text"
  minLength: number
  maxLength: number
  avgLength: number
  uniqueCount: number
  topValues: { value: string; count: number }[]
  longestSample: string | null
  flags: string[]
}

export interface NumericFieldAnalysis extends BaseFieldAnalysis {
  kind: "numeric"
  min: number
  max: number
  avg: number
  median: number
  allIntegers: boolean
  maxDecimalPlaces: number
  flags: string[]
}

export interface CheckboxFieldAnalysis extends BaseFieldAnalysis {
  kind: "checkbox"
  trueCount: number
  truePercent: number
  flags: string[]
}

export interface DateFieldAnalysis extends BaseFieldAnalysis {
  kind: "date"
  earliest: string | null
  latest: string | null
  flags: string[]
}

export interface SelectFieldAnalysis extends BaseFieldAnalysis {
  kind: "select"
  isMultiple: boolean
  definedChoices: SelectChoice[]
  usedChoices: { name: string; count: number; percent: number }[]
  unusedChoices: string[]
  flags: string[]
}

export interface LinkedRecordFieldAnalysis extends BaseFieldAnalysis {
  kind: "linkedRecord"
  linkedTableId: string
  linkedTableName: string | null
  prefersSingleRecordLink: boolean
  zeroLinks: number
  oneLink: number
  multipleLinks: number
  maxLinks: number
  zeroLinksPercent: number
  oneLinkPercent: number
  multipleLinksPercent: number
  flags: string[]
}

export interface AttachmentFieldAnalysis extends BaseFieldAnalysis {
  kind: "attachment"
  totalAttachments: number
  fileTypes: { type: string; count: number }[]
  totalSizeBytes: number
  flags: string[]
}

export interface ComputedFieldAnalysis extends BaseFieldAnalysis {
  kind: "computed"
  resultType: string | null
  sampleValues: string[]
  flags: string[]
}

export interface GenericFieldAnalysis extends BaseFieldAnalysis {
  kind: "generic"
  sampleValues: string[]
  flags: string[]
}

export type FieldAnalysis =
  | TextFieldAnalysis
  | NumericFieldAnalysis
  | CheckboxFieldAnalysis
  | DateFieldAnalysis
  | SelectFieldAnalysis
  | LinkedRecordFieldAnalysis
  | AttachmentFieldAnalysis
  | ComputedFieldAnalysis
  | GenericFieldAnalysis

// ---------------------------------------------------------------------------
// Table-level analysis
// ---------------------------------------------------------------------------

export interface TableAnalysis {
  tableId: string
  tableName: string
  /** Base ID this table belongs to (for disambiguation when names collide) */
  baseId?: string | undefined
  recordCount: number
  createdTimeRange: { earliest: string; latest: string } | null
  fieldSummary: {
    total: number
    text: number
    numeric: number
    select: number
    linkedRecord: number
    computed: number
    other: number
  }
  fields: FieldAnalysis[]
  /** Tables that this table links TO (via linked record fields) */
  linksTo: { tableId: string; fieldName: string }[]
}

export interface DataQualityFlag {
  severity: "warning" | "info"
  category: string
  table: string
  field: string
  detail: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEXT_TYPES = new Set([
  "singleLineText",
  "multilineText",
  "richText",
  "email",
  "url",
  "phoneNumber",
])

const NUMERIC_TYPES = new Set(["number", "currency", "percent", "rating", "duration", "autoNumber"])

const DATE_TYPES = new Set(["date", "dateTime", "createdTime", "lastModifiedTime"])

const SELECT_TYPES = new Set(["singleSelect", "multipleSelects"])

const COMPUTED_TYPES = new Set(["formula", "rollup", "count", "multipleLookupValues"])

function extractValues(records: AirtableRecord[], fieldIdOrName: string): unknown[] {
  return records.map((r) => r.fields[fieldIdOrName])
}

function countDecimals(n: number): number {
  const s = String(n)
  const dotIndex = s.indexOf(".")
  if (dotIndex === -1) return 0
  return s.length - dotIndex - 1
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2
  }
  return sorted[mid]!
}

function topN(counts: Map<string, number>, n: number): { value: string; count: number }[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + "..."
}

// ---------------------------------------------------------------------------
// Per-field analyzers
// ---------------------------------------------------------------------------

function baseAnalysis(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): BaseFieldAnalysis {
  const values = extractValues(records, fieldKey)
  const nullCount = values.filter((v) => v === null || v === undefined || v === "").length

  return {
    fieldId: field.id,
    fieldName: field.name,
    fieldType: field.type,
    totalRecords: records.length,
    nullCount,
    nullPercent: records.length > 0 ? Math.round((nullCount / records.length) * 100) : 0,
    isPrimary: field.id === primaryFieldId,
  }
}

function analyzeTextField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): TextFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)
  const strings = values.filter((v) => typeof v === "string" && v.length > 0) as string[]

  if (strings.length === 0) {
    return {
      ...base,
      kind: "text",
      minLength: 0,
      maxLength: 0,
      avgLength: 0,
      uniqueCount: 0,
      topValues: [],
      longestSample: null,
      flags: base.nullPercent === 100 ? ["All values are empty"] : [],
    }
  }

  const lengths = strings.map((s) => s.length)
  const minLength = Math.min(...lengths)
  const maxLength = Math.max(...lengths)
  const avgLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)

  const counts = new Map<string, number>()
  for (const s of strings) {
    counts.set(s, (counts.get(s) || 0) + 1)
  }
  const uniqueCount = counts.size

  const longest = strings.reduce((a, b) => (a.length >= b.length ? a : b))

  const flags: string[] = []

  if (uniqueCount < 20 && records.length > 50) {
    flags.push(
      `Only ${uniqueCount} unique values across ${records.length} records — dictionary candidate`
    )
  }
  if (maxLength > 255) {
    flags.push(`Max length ${maxLength} chars — use text() instead of varchar()`)
  }
  if (base.nullPercent > 50) {
    flags.push(`${base.nullPercent}% empty — rarely used field`)
  }

  return {
    ...base,
    kind: "text",
    minLength,
    maxLength,
    avgLength,
    uniqueCount,
    topValues: topN(counts, 10),
    longestSample: truncate(longest, 200),
    flags,
  }
}

function analyzeNumericField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): NumericFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)
  const numbers = values.filter((v) => typeof v === "number") as number[]

  if (numbers.length === 0) {
    return {
      ...base,
      kind: "numeric",
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      allIntegers: true,
      maxDecimalPlaces: 0,
      flags: base.nullPercent === 100 ? ["All values are null"] : [],
    }
  }

  const sorted = [...numbers].sort((a, b) => a - b)
  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!
  const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const med = median(sorted)
  const allIntegers = numbers.every((n) => Number.isInteger(n))
  const maxDecimalPlaces = Math.max(...numbers.map(countDecimals))

  const flags: string[] = []
  if (allIntegers) {
    flags.push("All values are integers")
  }
  if (base.nullPercent > 50) {
    flags.push(`${base.nullPercent}% null — rarely used field`)
  }
  if (field.type === "percent") {
    flags.push("AT stores as decimal (0.23 = 23%). Boilerplate stores as 23.00")
  }

  return {
    ...base,
    kind: "numeric",
    min,
    max,
    avg: Math.round(avg * 100) / 100,
    median: Math.round(med * 100) / 100,
    allIntegers,
    maxDecimalPlaces,
    flags,
  }
}

function analyzeCheckboxField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): CheckboxFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)
  // In AT, checkbox absent = false, true = true
  const trueCount = values.filter((v) => v === true).length
  const truePercent = records.length > 0 ? Math.round((trueCount / records.length) * 100) : 0

  const flags: string[] = []
  if (truePercent < 5) {
    flags.push(`Only ${truePercent}% checked — rarely used`)
  }
  if (truePercent > 95) {
    flags.push(`${truePercent}% checked — almost always true`)
  }

  return {
    ...base,
    kind: "checkbox",
    // Override null handling — absent checkbox is false, not null
    nullCount: 0,
    nullPercent: 0,
    trueCount,
    truePercent,
    flags,
  }
}

function analyzeDateField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): DateFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)
  const dates = values.filter((v) => typeof v === "string" && v.length > 0) as string[]

  const flags: string[] = []
  if (base.nullPercent > 50) {
    flags.push(`${base.nullPercent}% null — rarely used`)
  }

  if (dates.length === 0) {
    return { ...base, kind: "date", earliest: null, latest: null, flags }
  }

  const sorted = [...dates].sort()

  return {
    ...base,
    kind: "date",
    earliest: sorted[0]!,
    latest: sorted[sorted.length - 1]!,
    flags,
  }
}

/**
 * Find pairs of select choices that look like duplicates/typos.
 * Uses word overlap: if two choices share >70% of their words, they're likely variants.
 * Only runs on fields with <= 100 used choices (to avoid O(n²) on huge fields).
 */
function findSimilarChoices(
  usedChoices: { name: string; count: number }[]
): { a: string; b: string }[] {
  if (usedChoices.length > 100 || usedChoices.length < 2) return []

  const pairs: { a: string; b: string }[] = []

  function tokenize(s: string): Set<string> {
    return new Set(
      s.toLowerCase()
        .split(/[\s,;._\-\/\\()]+/)
        .filter((w) => w.length > 1)
    )
  }

  const tokenized = usedChoices.map((c) => ({
    name: c.name,
    tokens: tokenize(c.name),
  }))

  for (let i = 0; i < tokenized.length; i++) {
    for (let j = i + 1; j < tokenized.length; j++) {
      const a = tokenized[i]!
      const b = tokenized[j]!

      if (a.tokens.size < 2 || b.tokens.size < 2) continue

      let overlap = 0
      for (const token of a.tokens) {
        if (b.tokens.has(token)) overlap++
      }

      const maxSize = Math.max(a.tokens.size, b.tokens.size)
      const ratio = overlap / maxSize

      if (ratio > 0.7 && a.name !== b.name) {
        pairs.push({ a: a.name, b: b.name })
      }
    }
  }

  return pairs
}

function analyzeSelectField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): SelectFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const isMultiple = field.type === "multipleSelects"
  const definedChoices: SelectChoice[] = field.options?.choices ?? []
  const values = extractValues(records, fieldKey)

  // Count usage per choice name
  const usageCounts = new Map<string, number>()
  for (const v of values) {
    if (v === null || v === undefined) continue
    if (isMultiple && Array.isArray(v)) {
      for (const item of v) {
        const name =
          typeof item === "string" ? item : ((item as { name?: string })?.name ?? String(item))
        usageCounts.set(name, (usageCounts.get(name) || 0) + 1)
      }
    } else if (typeof v === "object" && v !== null && "name" in v) {
      const name = (v as { name: string }).name
      usageCounts.set(name, (usageCounts.get(name) || 0) + 1)
    } else if (typeof v === "string") {
      usageCounts.set(v, (usageCounts.get(v) || 0) + 1)
    }
  }

  const nonNullCount = records.length - base.nullCount
  const usedChoices = Array.from(usageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percent: nonNullCount > 0 ? Math.round((count / nonNullCount) * 100) : 0,
    }))

  const usedNames = new Set(usageCounts.keys())
  const unusedChoices = definedChoices.filter((c) => !usedNames.has(c.name)).map((c) => c.name)

  const flags: string[] = []
  if (unusedChoices.length > 0) {
    flags.push(`${unusedChoices.length} defined choice(s) never used: ${unusedChoices.join(", ")}`)
  }
  for (const uc of usedChoices) {
    if (uc.count <= 2 && nonNullCount > 20) {
      flags.push(`Choice "${uc.name}" used by only ${uc.count} record(s)`)
    }
  }

  // Change 4: Constant or single-value field
  if (usedChoices.length === 1 && usedChoices[0]!.count === nonNullCount && nonNullCount > 0) {
    if (base.nullPercent <= 50) {
      // True constant — nearly all records have the same value
      flags.push(
        `Constant field — all ${nonNullCount} records have value "${usedChoices[0]!.name}". Consider removing instead of migrating`
      )
    } else {
      // Rare single-value field — acts more like a boolean flag
      flags.push(
        `Single-value field — only value is "${usedChoices[0]!.name}" (${nonNullCount} records, ${base.nullPercent}% null). Consider converting to boolean`
      )
    }
  }

  // Change 5: Composite values — choice names containing comma/semicolon (singleSelect only)
  if (!isMultiple) {
    const compositeChoices = usedChoices.filter(
      (uc) => uc.name.includes(",") || uc.name.includes(";")
    )
    if (compositeChoices.length > 0) {
      const examples = compositeChoices
        .slice(0, 3)
        .map((c) => `"${c.name}"`)
        .join(", ")
      flags.push(
        `${compositeChoices.length} choice(s) contain commas — possible composite values (${examples}). Consider decomposing into separate fields or a many-to-many relationship`
      )
    }
  }

  // Change 6: Similar choices — likely duplicates/typos (skip if too many pairs — domain, not typos)
  const similarPairs = findSimilarChoices(usedChoices)
  if (similarPairs.length > 0 && similarPairs.length <= 10) {
    const examples = similarPairs
      .slice(0, 3)
      .map((p) => `"${truncate(p.a, 40)}" ≈ "${truncate(p.b, 40)}"`)
      .join("; ")
    flags.push(
      `${similarPairs.length} pair(s) of similar choices — possible duplicates/typos: ${examples}`
    )
  }

  return {
    ...base,
    kind: "select",
    isMultiple,
    definedChoices,
    usedChoices,
    unusedChoices,
    flags,
  }
}

function analyzeLinkedRecordField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string,
  tableNameById: Map<string, string>
): LinkedRecordFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const linkedTableId = field.options?.linkedTableId ?? "unknown"
  const prefersSingleRecordLink = field.options?.prefersSingleRecordLink ?? false
  const values = extractValues(records, fieldKey)

  let zeroLinks = 0
  let oneLink = 0
  let multipleLinks = 0
  let maxLinks = 0

  for (const v of values) {
    if (!Array.isArray(v) || v.length === 0) {
      zeroLinks++
    } else if (v.length === 1) {
      oneLink++
    } else {
      multipleLinks++
      maxLinks = Math.max(maxLinks, v.length)
    }
  }

  const total = records.length
  const zeroLinksPercent = total > 0 ? Math.round((zeroLinks / total) * 100) : 0
  const oneLinkPercent = total > 0 ? Math.round((oneLink / total) * 100) : 0
  const multipleLinksPercent = total > 0 ? Math.round((multipleLinks / total) * 100) : 0

  const flags: string[] = []
  if (multipleLinks === 0 && (oneLink > 0 || zeroLinks > 0)) {
    flags.push("All records have 0-1 links — Many-to-One relationship (single FK)")
  } else if (multipleLinks > 0) {
    flags.push(`Records have up to ${maxLinks} links — Many-to-Many relationship`)
  }
  if (prefersSingleRecordLink) {
    flags.push("AT configured as single-record link")
  }

  return {
    ...base,
    kind: "linkedRecord",
    linkedTableId,
    linkedTableName: tableNameById.get(linkedTableId) ?? null,
    prefersSingleRecordLink,
    zeroLinks,
    oneLink,
    multipleLinks,
    maxLinks,
    zeroLinksPercent,
    oneLinkPercent,
    multipleLinksPercent,
    flags,
  }
}

function analyzeAttachmentField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): AttachmentFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)

  let totalAttachments = 0
  let totalSizeBytes = 0
  const typeCounts = new Map<string, number>()

  for (const v of values) {
    if (!Array.isArray(v)) continue
    for (const att of v) {
      totalAttachments++
      const a = att as { type?: string; size?: number }
      if (a.type) {
        typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1)
      }
      if (typeof a.size === "number") {
        totalSizeBytes += a.size
      }
    }
  }

  const fileTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }))

  const flags: string[] = []
  const sizeMB = Math.round(totalSizeBytes / 1024 / 1024)
  if (totalAttachments > 0) {
    flags.push(
      `${totalAttachments} attachments totaling ~${sizeMB} MB`
    )
  }

  return {
    ...base,
    kind: "attachment",
    totalAttachments,
    fileTypes,
    totalSizeBytes,
    flags,
  }
}

function analyzeComputedField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): ComputedFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)

  const resultType = field.options?.result?.type ?? null

  const sampleValues = values
    .filter((v) => v !== null && v !== undefined)
    .slice(0, 5)
    .map((v) => {
      if (typeof v === "object") return JSON.stringify(v)
      return String(v)
    })

  return {
    ...base,
    kind: "computed",
    resultType,
    sampleValues,
    flags: [`Computed field (${field.type}) — skip during import, recreate as query/view`],
  }
}

function analyzeGenericField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string
): GenericFieldAnalysis {
  const base = baseAnalysis(field, records, fieldKey, primaryFieldId)
  const values = extractValues(records, fieldKey)

  const sampleValues = values
    .filter((v) => v !== null && v !== undefined)
    .slice(0, 5)
    .map((v) => {
      if (typeof v === "object") return JSON.stringify(v)
      return String(v)
    })

  return {
    ...base,
    kind: "generic",
    sampleValues,
    flags: [],
  }
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

/**
 * Analyze a single field — dispatches to the appropriate type-specific analyzer.
 *
 * @param fieldKey - The key used in record.fields (field ID if returnFieldsByFieldId, field name otherwise)
 */
export function analyzeField(
  field: AirtableField,
  records: AirtableRecord[],
  fieldKey: string,
  primaryFieldId: string,
  tableNameById: Map<string, string>
): FieldAnalysis {
  const type = field.type

  if (TEXT_TYPES.has(type)) {
    return analyzeTextField(field, records, fieldKey, primaryFieldId)
  }
  if (NUMERIC_TYPES.has(type)) {
    return analyzeNumericField(field, records, fieldKey, primaryFieldId)
  }
  if (type === "checkbox") {
    return analyzeCheckboxField(field, records, fieldKey, primaryFieldId)
  }
  if (DATE_TYPES.has(type)) {
    return analyzeDateField(field, records, fieldKey, primaryFieldId)
  }
  if (SELECT_TYPES.has(type)) {
    return analyzeSelectField(field, records, fieldKey, primaryFieldId)
  }
  if (type === "multipleRecordLinks") {
    return analyzeLinkedRecordField(field, records, fieldKey, primaryFieldId, tableNameById)
  }
  if (type === "multipleAttachments") {
    return analyzeAttachmentField(field, records, fieldKey, primaryFieldId)
  }
  if (COMPUTED_TYPES.has(type)) {
    return analyzeComputedField(field, records, fieldKey, primaryFieldId)
  }

  return analyzeGenericField(field, records, fieldKey, primaryFieldId)
}

/**
 * Analyze an entire table: run per-field analysis + compute table-level stats.
 */
export function analyzeTable(
  table: AirtableTable,
  records: AirtableRecord[],
  tableNameById: Map<string, string>,
  useFieldIds: boolean,
  baseId?: string
): TableAnalysis {
  const fields: FieldAnalysis[] = []

  for (const field of table.fields) {
    const fieldKey = useFieldIds ? field.id : field.name
    const analysis = analyzeField(field, records, fieldKey, table.primaryFieldId, tableNameById)
    fields.push(analysis)
  }

  // Created time range from record metadata
  let createdTimeRange: { earliest: string; latest: string } | null = null
  if (records.length > 0) {
    const times = records.map((r) => r.createdTime).sort()
    createdTimeRange = {
      earliest: times[0]!,
      latest: times[times.length - 1]!,
    }
  }

  // Field type counts
  let text = 0,
    numeric = 0,
    select = 0,
    linkedRecord = 0,
    computed = 0,
    other = 0
  for (const f of fields) {
    switch (f.kind) {
      case "text":
        text++
        break
      case "numeric":
        numeric++
        break
      case "select":
        select++
        break
      case "linkedRecord":
        linkedRecord++
        break
      case "computed":
        computed++
        break
      default:
        other++
    }
  }

  // Links to other tables
  const linksTo = fields
    .filter((f): f is LinkedRecordFieldAnalysis => f.kind === "linkedRecord")
    .map((f) => ({ tableId: f.linkedTableId, fieldName: f.fieldName }))

  return {
    tableId: table.id,
    tableName: table.name,
    baseId,
    recordCount: records.length,
    createdTimeRange,
    fieldSummary: {
      total: fields.length,
      text,
      numeric,
      select,
      linkedRecord,
      computed,
      other,
    },
    fields,
    linksTo,
  }
}

// ---------------------------------------------------------------------------
// Cross-table analysis
// ---------------------------------------------------------------------------

export interface DependencyGraph {
  /** Import order (topological sort). Tables with no deps come first. */
  importOrder: { tableId: string; tableName: string; dependsOn: string[] }[]
  /** Cycles detected (if any) */
  cycles: string[][]
  /** Links pointing to tables not in any analyzed base */
  crossBaseLinks: { table: string; field: string; linkedTableId: string }[]
}

/**
 * Build a dependency graph from table analyses and compute import order.
 *
 * Uses Kahn's algorithm for topological sort. Tables involved in circular
 * dependencies are appended at the end (they'll need two-pass FK resolution).
 */
export function buildDependencyGraph(
  tables: TableAnalysis[],
  allTableIds: Set<string>
): DependencyGraph {
  const crossBaseLinks: DependencyGraph["crossBaseLinks"] = []
  const tableById = new Map(tables.map((t) => [t.tableId, t]))

  // Build adjacency: tableId → set of tableIds it depends on (links to)
  const deps = new Map<string, Set<string>>()
  // Reverse adjacency: tableId → set of tableIds that depend on it
  const reverseDeps = new Map<string, Set<string>>()

  for (const t of tables) {
    deps.set(t.tableId, new Set())
    reverseDeps.set(t.tableId, new Set())
  }

  for (const t of tables) {
    for (const link of t.linksTo) {
      if (!allTableIds.has(link.tableId)) {
        crossBaseLinks.push({
          table: t.tableName,
          field: link.fieldName,
          linkedTableId: link.tableId,
        })
        continue
      }
      // Don't add self-references as dependencies
      if (link.tableId !== t.tableId) {
        deps.get(t.tableId)!.add(link.tableId)
        reverseDeps.get(link.tableId)!.add(t.tableId)
      }
    }
  }

  // Kahn's algorithm: track in-degree (number of unresolved dependencies)
  const inDeg = new Map<string, number>()
  for (const [tid, d] of deps) {
    inDeg.set(tid, d.size)
  }

  const queue: string[] = []
  for (const [tid, deg] of inDeg) {
    if (deg === 0) queue.push(tid)
  }

  const order: DependencyGraph["importOrder"] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const tid = queue.shift()!
    visited.add(tid)
    const t = tableById.get(tid)!
    order.push({
      tableId: tid,
      tableName: t.tableName,
      dependsOn: Array.from(deps.get(tid) || []).map((id) => tableById.get(id)?.tableName ?? id),
    })

    // For each table that depends on this one, decrement its in-degree
    for (const dependentId of reverseDeps.get(tid) || []) {
      if (!visited.has(dependentId)) {
        const newDeg = (inDeg.get(dependentId) || 1) - 1
        inDeg.set(dependentId, newDeg)
        if (newDeg === 0) {
          queue.push(dependentId)
        }
      }
    }
  }

  // Find cycles: tables not visited are part of circular dependencies.
  const cycles: string[][] = []
  const unvisitedIds = new Set(tables.filter((t) => !visited.has(t.tableId)).map((t) => t.tableId))

  if (unvisitedIds.size > 0) {
    const remaining = new Set(unvisitedIds)
    while (remaining.size > 0) {
      const start = remaining.values().next().value as string
      const component: string[] = []
      const stack = [start]
      while (stack.length > 0) {
        const node = stack.pop()!
        if (!remaining.has(node)) continue
        remaining.delete(node)
        component.push(tableById.get(node)?.tableName ?? node)
        for (const neighbor of deps.get(node) || []) {
          if (remaining.has(neighbor)) stack.push(neighbor)
        }
        for (const neighbor of reverseDeps.get(node) || []) {
          if (remaining.has(neighbor)) stack.push(neighbor)
        }
      }
      if (component.length > 1) {
        cycles.push(component)
      }
    }

    // Add unvisited tables to order anyway (they'll need two-pass resolution)
    for (const t of tables) {
      if (!visited.has(t.tableId)) {
        order.push({
          tableId: t.tableId,
          tableName: t.tableName,
          dependsOn: Array.from(deps.get(t.tableId) || []).map(
            (id) => tableById.get(id)?.tableName ?? id
          ),
        })
      }
    }
  }

  return { importOrder: order, cycles, crossBaseLinks }
}

/**
 * Collect all data quality flags from all table analyses.
 */
export function collectFlags(tables: TableAnalysis[]): DataQualityFlag[] {
  const flags: DataQualityFlag[] = []

  for (const table of tables) {
    for (const field of table.fields) {
      for (const flagText of field.flags) {
        flags.push({
          severity: (
            flagText.includes("skip") ||
            flagText.includes("rarely") ||
            flagText.includes("All values are integers") ||
            (flagText.includes("only") && flagText.includes("checked"))
          ) ? "info" : "warning",
          category: categorizeFlag(flagText),
          table: table.tableName,
          field: field.fieldName,
          detail: flagText,
        })
      }
    }
  }

  return flags
}

function categorizeFlag(text: string): string {
  if (text.includes("Constant field")) return "Constant field"
  if (text.includes("Single-value field")) return "Single-value field"
  if (text.includes("composite values")) return "Composite value"
  if (text.includes("similar choices")) return "Similar choices"
  if (text.includes("dictionary")) return "Dictionary candidate"
  if (text.includes("text()") || text.includes("Max length")) return "Long text"
  if (text.includes("rarely") || text.includes("empty")) return "Low usage"
  if (text.includes("never used") || text.includes("unused")) return "Unused choices"
  if (text.includes("Many-to-One")) return "Many-to-One"
  if (text.includes("Many-to-Many")) return "Many-to-Many"
  if (text.includes("Computed") || text.includes("skip during import")) return "Computed field"
  if (text.includes("attachment")) return "Attachments"
  if (text.includes("integer")) return "Integer field"
  if (text.includes("percent") || text.includes("decimal")) return "Numeric format"
  if (text.includes("single-record link")) return "Single link"
  return "Other"
}
