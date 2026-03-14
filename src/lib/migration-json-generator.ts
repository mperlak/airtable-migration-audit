/**
 * Generates a structured MIGRATION.json — framework-agnostic PostgreSQL
 * migration spec. Can be consumed by any scaffolding tool (Straktur, Prisma,
 * Django, raw SQL, etc.).
 *
 * Maps Airtable schema + analysis data → PostgreSQL types, snake_case names,
 * relations, lookup tables, junction tables, and import order.
 */

import type {
  TableAnalysis,
  FieldAnalysis,
  SelectFieldAnalysis,
  LinkedRecordFieldAnalysis,
  ComputedFieldAnalysis,
  DependencyGraph,
} from "./data-analyzer"

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface MigrationJson {
  generatedAt: string
  schemaVersion: number
  tables: MigrationTable[]
  junctionTables: JunctionTable[]
  importOrder: string[]
}

interface MigrationTable {
  airtableId: string
  airtableName: string
  dbTableName: string
  recordCount: number
  importOrder: number
  columns: Column[]
  relations: Relation[]
  lookupTables: LookupTable[]
  skip: SkipField[]
  computedFields: ComputedField[]
}

interface Column {
  airtableName: string
  dbColumnName: string
  airtableType: string
  pgType: string
  nullable: boolean
  isPrimary: boolean
  default?: string
  validation: ColumnValidation | null
}

interface ColumnValidation {
  type: "string" | "number" | "boolean" | "date"
  maxLength?: number
  min?: number
  max?: number
  precision?: number
  scale?: number
}

interface Relation {
  airtableFieldName: string
  dbColumnName: string
  type: "manyToOne"
  targetTable: string
  targetAirtableName: string
}

interface LookupTable {
  airtableFieldName: string
  dbColumnName: string
  lookupTableName: string
  isMultiple: boolean
  values: { name: string; usageCount: number }[]
}

interface SkipField {
  airtableName: string
  airtableType: string
  reason: string
}

interface ComputedField {
  airtableName: string
  airtableType: string
  resultType: string | null
  recreateAs: string
}

interface JunctionTable {
  dbTableName: string
  sourceTable: string
  targetTable: string
  sourceColumn: string
  targetColumn: string
  reason: string
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------

/**
 * Mechanical snake_case: NFD-normalize, strip diacritics, replace non-alnum
 * with `_`, collapse, trim, lowercase. Truncate at 63 (PG identifier limit).
 */
function toSnakeCase(name: string): string {
  let s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/\u0142/g, "l") // ł → l (not a combining mark)
    .replace(/\u0141/g, "L") // Ł → L
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()

  if (/^[0-9]/.test(s)) s = "_" + s
  if (s.length > 63) s = s.slice(0, 63).replace(/_$/, "")
  if (s === "") s = "_unnamed"

  return s
}

/** Round up to nearest 50, capped at 255. */
function ceilTo50(n: number): number {
  return Math.min(Math.ceil(Math.max(n, 1) / 50) * 50, 255)
}

/**
 * Ensure no duplicate names in `items`. Appends `_2`, `_3`, etc.
 * Mutates items in-place via setter.
 */
function deduplicateNames<T>(items: T[], getter: (t: T) => string, setter: (t: T, name: string) => void): void {
  const seen = new Map<string, number>()
  for (const item of items) {
    const base = getter(item)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    if (count > 1) setter(item, `${base}_${count}`)
  }
}

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

const SKIP_TYPES = new Set(["autoNumber", "lastModifiedTime", "lastModifiedBy", "createdBy"])
const COMPUTED_TYPES = new Set(["formula", "rollup", "count", "multipleLookupValues"])

interface PgTypeResult {
  pgType: string
  default?: string
}

function mapPgType(field: FieldAnalysis): PgTypeResult {
  switch (field.fieldType) {
    case "singleLineText":
    case "email":
    case "url":
    case "phoneNumber": {
      if (field.kind === "text" && field.maxLength > 0 && field.maxLength <= 255) {
        return { pgType: `varchar(${ceilTo50(field.maxLength)})` }
      }
      return { pgType: "text" }
    }
    case "multilineText":
    case "richText":
      return { pgType: "text" }

    case "number": {
      if (field.kind === "numeric") {
        if (field.allIntegers) return { pgType: "integer" }
        const scale = Math.max(field.maxDecimalPlaces, 2)
        const intDigits = Math.max(String(Math.floor(Math.abs(field.max))).length, 1)
        const precision = intDigits + scale
        return { pgType: `numeric(${precision},${scale})` }
      }
      return { pgType: "integer" }
    }
    case "currency":
      return { pgType: "numeric(12,2)" }
    case "percent":
      return { pgType: "numeric(5,2)" }
    case "rating":
    case "duration":
      return { pgType: "integer" }

    case "checkbox":
      return { pgType: "boolean", default: "false" }

    case "date":
    case "dateTime":
      return { pgType: "timestamp" }
    case "createdTime":
      return { pgType: "timestamp", default: "now()" }

    case "singleSelect":
      return { pgType: "uuid" } // FK to lookup table
    case "multipleSelects":
      return { pgType: "uuid" } // junction table handles it

    case "multipleRecordLinks":
      // M2O produces uuid FK; M2M produces junction table (handled elsewhere)
      return { pgType: "uuid" }

    case "multipleAttachments":
      return { pgType: "uuid" } // separate attachment reference

    default:
      return { pgType: "text" }
  }
}

function buildValidation(field: FieldAnalysis): ColumnValidation | null {
  if (field.totalRecords === 0) return null

  switch (field.kind) {
    case "text": {
      if (field.maxLength === 0) return null
      return { type: "string", maxLength: field.maxLength }
    }
    case "numeric": {
      const v: ColumnValidation = { type: "number", min: field.min, max: field.max }
      if (!field.allIntegers) {
        const scale = Math.max(field.maxDecimalPlaces, 2)
        const intDigits = Math.max(String(Math.floor(Math.abs(field.max))).length, 1)
        v.precision = intDigits + scale
        v.scale = scale
      }
      return v
    }
    case "checkbox":
      return { type: "boolean" }
    case "date":
      return { type: "date" }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateMigrationJson(input: {
  bases: { baseId: string; baseName: string }[]
  tables: TableAnalysis[]
  graph: DependencyGraph
  generatedAt: Date
}): MigrationJson {
  const { tables, graph, generatedAt } = input

  // Build lookup maps
  const tableById = new Map(tables.map((t) => [t.tableId, t]))
  const importOrderIndex = new Map(graph.importOrder.map((e, i) => [e.tableId, i]))

  // Build table name map for relations
  const tableNameMap = new Map<string, string>() // tableId → dbTableName
  for (const t of tables) {
    tableNameMap.set(t.tableId, toSnakeCase(t.tableName))
  }

  // Deduplicate table names
  const tableEntries = tables.map((t) => ({ tableId: t.tableId, dbName: tableNameMap.get(t.tableId)! }))
  deduplicateNames(tableEntries, (e) => e.dbName, (e, n) => { e.dbName = n; tableNameMap.set(e.tableId, n) })

  const migrationTables: MigrationTable[] = []
  const junctionTables: JunctionTable[] = []

  for (const table of tables) {
    const dbTableName = tableNameMap.get(table.tableId)!
    const order = importOrderIndex.get(table.tableId) ?? tables.length

    const columns: Column[] = []
    const relations: Relation[] = []
    const lookupTables: LookupTable[] = []
    const skip: SkipField[] = []
    const computedFields: ComputedField[] = []

    for (const field of table.fields) {
      // Skip system/auto fields
      if (SKIP_TYPES.has(field.fieldType)) {
        skip.push({
          airtableName: field.fieldName,
          airtableType: field.fieldType,
          reason: field.fieldType === "autoNumber" ? "use DB serial" : "system field",
        })
        continue
      }

      // Computed fields
      if (COMPUTED_TYPES.has(field.fieldType)) {
        const cf = field as ComputedFieldAnalysis
        computedFields.push({
          airtableName: field.fieldName,
          airtableType: field.fieldType,
          resultType: cf.kind === "computed" ? cf.resultType : null,
          recreateAs: "app-logic",
        })
        continue
      }

      // Attachments
      if (field.fieldType === "multipleAttachments") {
        skip.push({
          airtableName: field.fieldName,
          airtableType: field.fieldType,
          reason: "separate attachment reference table",
        })
        continue
      }

      const dbColumnName = toSnakeCase(field.fieldName)
      const nullable = field.nullPercent > 0 || field.totalRecords === 0

      // Select fields → lookup table
      if (field.fieldType === "singleSelect" || field.fieldType === "multipleSelects") {
        const sf = field as SelectFieldAnalysis
        const isMultiple = sf.isMultiple
        const lookupTableName = `${dbTableName}_${dbColumnName}`

        lookupTables.push({
          airtableFieldName: field.fieldName,
          dbColumnName: isMultiple ? dbColumnName : `${dbColumnName}_id`,
          lookupTableName,
          isMultiple,
          values: sf.usedChoices.map((c) => ({ name: c.name, usageCount: c.count })),
        })

        if (isMultiple) {
          // multipleSelects need a junction table
          junctionTables.push({
            dbTableName: `${dbTableName}_${dbColumnName}_jn`,
            sourceTable: dbTableName,
            targetTable: lookupTableName,
            sourceColumn: `${dbTableName}_id`,
            targetColumn: `${lookupTableName}_id`,
            reason: "multipleSelects",
          })
        }
        continue
      }

      // Linked records
      if (field.fieldType === "multipleRecordLinks" && field.kind === "linkedRecord") {
        const lf = field as LinkedRecordFieldAnalysis
        const targetDbName = tableNameMap.get(lf.linkedTableId)
        const targetTable = tableById.get(lf.linkedTableId)

        // Cross-base link
        if (!targetDbName) {
          relations.push({
            airtableFieldName: field.fieldName,
            dbColumnName: `${dbColumnName}_id`,
            type: "manyToOne",
            targetTable: `CROSS_BASE_${lf.linkedTableId}`,
            targetAirtableName: lf.linkedTableName ?? lf.linkedTableId,
          })
          continue
        }

        const isManyToMany = lf.multipleLinks > 0

        if (isManyToMany) {
          // M2M → junction table
          const srcCol = `${dbTableName}_id`
          const tgtCol = `${targetDbName}_id`

          // Self-referencing: disambiguate column names
          const junctionName =
            dbTableName === targetDbName
              ? `${dbTableName}_${dbColumnName}`
              : `${dbTableName}_to_${targetDbName}`

          junctionTables.push({
            dbTableName: junctionName,
            sourceTable: dbTableName,
            targetTable: targetDbName,
            sourceColumn: dbTableName === targetDbName ? `source_${srcCol}` : srcCol,
            targetColumn: dbTableName === targetDbName ? `target_${tgtCol}` : tgtCol,
            reason: "manyToMany",
          })
        } else {
          // M2O → FK column
          relations.push({
            airtableFieldName: field.fieldName,
            dbColumnName: `${dbColumnName}_id`,
            type: "manyToOne",
            targetTable: targetDbName,
            targetAirtableName: targetTable?.tableName ?? lf.linkedTableName ?? lf.linkedTableId,
          })
        }
        continue
      }

      // Regular column
      const { pgType, default: pgDefault } = mapPgType(field)
      const col: Column = {
        airtableName: field.fieldName,
        dbColumnName,
        airtableType: field.fieldType,
        pgType,
        nullable,
        isPrimary: field.isPrimary,
        validation: buildValidation(field),
      }
      if (pgDefault) col.default = pgDefault
      columns.push(col)
    }

    // Deduplicate column names within this table
    deduplicateNames(columns, (c) => c.dbColumnName, (c, n) => { c.dbColumnName = n })

    migrationTables.push({
      airtableId: table.tableId,
      airtableName: table.tableName,
      dbTableName,
      recordCount: table.recordCount,
      importOrder: order,
      columns,
      relations,
      lookupTables,
      skip,
      computedFields,
    })
  }

  // Deduplicate junction table names
  deduplicateNames(junctionTables, (j) => j.dbTableName, (j, n) => { j.dbTableName = n })

  // Build import order array (table db names in dependency order)
  const importOrder = graph.importOrder
    .map((e) => tableNameMap.get(e.tableId))
    .filter((n): n is string => n != null)

  return {
    generatedAt: generatedAt.toISOString(),
    schemaVersion: 1,
    tables: migrationTables,
    junctionTables,
    importOrder,
  }
}
