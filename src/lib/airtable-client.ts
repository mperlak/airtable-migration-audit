/**
 * Airtable API client for schema discovery and record fetching.
 * Uses native fetch — no npm dependencies. Zero boilerplate imports.
 */

const AIRTABLE_API_URL = "https://api.airtable.com/v0"

// ---------------------------------------------------------------------------
// Schema types (GET /v0/meta/bases/{baseId}/tables)
// ---------------------------------------------------------------------------

export interface AirtableBaseMeta {
  id: string
  name: string
  permissionLevel: string
}

export interface AirtableBaseSchema {
  tables: AirtableTable[]
}

export interface AirtableTable {
  id: string
  name: string
  primaryFieldId: string
  description?: string | null
  fields: AirtableField[]
  views: AirtableView[]
}

export interface AirtableView {
  id: string
  type: string
  name: string
  personalForUserId?: string | null
}

// --- Field discriminated union ---

export type AirtableFieldType =
  | "singleLineText"
  | "email"
  | "url"
  | "multilineText"
  | "richText"
  | "phoneNumber"
  | "singleSelect"
  | "multipleSelects"
  | "singleCollaborator"
  | "multipleCollaborators"
  | "multipleRecordLinks"
  | "number"
  | "percent"
  | "currency"
  | "autoNumber"
  | "rating"
  | "duration"
  | "date"
  | "dateTime"
  | "createdTime"
  | "lastModifiedTime"
  | "createdBy"
  | "lastModifiedBy"
  | "checkbox"
  | "formula"
  | "rollup"
  | "count"
  | "multipleLookupValues"
  | "multipleAttachments"
  | "barcode"
  | "button"
  | "externalSyncSource"
  | "aiText"
  | "manualSort"

export interface SelectChoice {
  id: string
  name: string
  color?: string | null
}

export interface LinkedRecordOptions {
  linkedTableId: string
  isReversed: boolean
  prefersSingleRecordLink: boolean
  inverseLinkFieldId?: string | null
}

export interface ComputedFieldResult {
  type: string
  options?: Record<string, unknown>
}

export interface AirtableField {
  id: string
  name: string
  type: AirtableFieldType | string
  description?: string | null
  options?: {
    // Select fields
    choices?: SelectChoice[]
    // Linked records
    linkedTableId?: string
    isReversed?: boolean
    prefersSingleRecordLink?: boolean
    inverseLinkFieldId?: string | null
    // Numeric
    precision?: number
    symbol?: string
    // Rating
    max?: number
    icon?: string
    color?: string
    // Duration
    durationFormat?: string
    // Date/time
    dateFormat?: { format: string; name: string }
    timeFormat?: { format: string; name: string }
    timeZone?: string
    // Computed fields
    formula?: string
    isValid?: boolean
    referencedFieldIds?: string[] | null
    recordLinkFieldId?: string | null
    fieldIdInLinkedTable?: string | null
    result?: ComputedFieldResult | null
    // Checkbox
    // (icon, color already above)
    // Attachments
    // AI text
    prompt?: unknown[]
    // Catch-all
    [key: string]: unknown
  }
}

// ---------------------------------------------------------------------------
// Record types
// ---------------------------------------------------------------------------

export interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
  createdTime: string
}

interface AirtableListResponse {
  records: AirtableRecord[]
  offset?: string
}

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

export interface AirtableClientOptions {
  apiKey: string
  /** Delay between requests in ms (default: 25ms = ~40 req/sec) */
  delayMs?: number
}

interface FetchRecordsOptions {
  baseId: string
  tableId: string
  /** Use field IDs as keys instead of field names (stable across renames) */
  returnFieldsByFieldId?: boolean
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class AirtableClient {
  private apiKey: string
  private delayMs: number
  private lastRequestTime = 0

  constructor(options: AirtableClientOptions) {
    this.apiKey = options.apiKey
    this.delayMs = options.delayMs ?? 25
  }

  private async throttledFetch(url: string): Promise<Response> {
    // Ensure minimum delay between requests
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.delayMs) {
      await sleep(this.delayMs - elapsed)
    }

    let retries = 0
    const maxRetries = 5

    while (retries <= maxRetries) {
      this.lastRequestTime = Date.now()
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })

      if (response.status === 429) {
        retries++
        const retryAfter = Number(response.headers.get("Retry-After") || "30")
        console.warn(
          `   ⏳ Rate limited (429). Waiting ${retryAfter}s... (attempt ${retries}/${maxRetries})`
        )
        await sleep(retryAfter * 1000)
        continue
      }

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Airtable API error ${response.status}: ${body}`)
      }

      return response
    }

    throw new Error(`Airtable API: exceeded max retries (${maxRetries}) due to rate limiting`)
  }

  // -------------------------------------------------------------------------
  // Base listing
  // -------------------------------------------------------------------------

  /**
   * List all bases accessible by the current token.
   * Uses the Metadata API — requires `schema.bases:read` scope.
   */
  async listBases(): Promise<AirtableBaseMeta[]> {
    const all: AirtableBaseMeta[] = []
    let offset: string | undefined

    do {
      const url = new URL(`${AIRTABLE_API_URL}/meta/bases`)
      if (offset) url.searchParams.set("offset", offset)

      const response = await this.throttledFetch(url.toString())
      const data = (await response.json()) as { bases: AirtableBaseMeta[]; offset?: string }

      all.push(...data.bases)
      offset = data.offset
    } while (offset)

    return all
  }

  // -------------------------------------------------------------------------
  // Schema discovery
  // -------------------------------------------------------------------------

  /**
   * Fetch the full schema for a base (all tables, fields, views).
   * Uses the Metadata API — requires `schema.bases:read` scope.
   */
  async fetchBaseSchema(baseId: string): Promise<AirtableBaseSchema> {
    const url = `${AIRTABLE_API_URL}/meta/bases/${baseId}/tables`
    const response = await this.throttledFetch(url)
    return (await response.json()) as AirtableBaseSchema
  }

  // -------------------------------------------------------------------------
  // Record fetching
  // -------------------------------------------------------------------------

  /**
   * Fetch all records from a table, handling pagination automatically.
   */
  async fetchAllRecords(options: FetchRecordsOptions): Promise<AirtableRecord[]> {
    const { baseId, tableId, returnFieldsByFieldId = false, pageSize = 100 } = options

    const allRecords: AirtableRecord[] = []
    let offset: string | undefined
    let page = 0

    do {
      page++
      const url = new URL(`${AIRTABLE_API_URL}/${baseId}/${tableId}`)
      url.searchParams.set("pageSize", String(pageSize))
      if (offset) url.searchParams.set("offset", offset)
      if (returnFieldsByFieldId) {
        url.searchParams.set("returnFieldsByFieldId", "true")
      }

      const response = await this.throttledFetch(url.toString())
      const data = (await response.json()) as AirtableListResponse

      allRecords.push(...data.records)
      offset = data.offset

      console.log(
        `   📄 Page ${page}: ${data.records.length} records (total: ${allRecords.length})`
      )
    } while (offset)

    return allRecords
  }
}
