/**
 * AT Record ID <-> target UUID persistence.
 *
 * Saves mappings as JSON for:
 * - Idempotent reruns of the same import step
 * - Cross-step lookups (e.g., orders referencing customer UUIDs)
 *
 * Zero external dependencies (only node:fs, node:path).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, "..", "..", "data")

export class MigrationMapping {
  private map = new Map<string, string>()
  private filePath: string

  constructor(entityName: string) {
    this.filePath = resolve(DATA_DIR, `${entityName}-mapping.json`)
  }

  /** Load existing mapping from disk (no-op if file doesn't exist) */
  load(): void {
    if (!existsSync(this.filePath)) return

    const raw = readFileSync(this.filePath, "utf-8")
    const entries = JSON.parse(raw) as [string, string][]
    this.map = new Map(entries)
  }

  /** Persist mapping to disk */
  save(): void {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    const entries = Array.from(this.map.entries())
    writeFileSync(this.filePath, JSON.stringify(entries, null, 2), "utf-8")
  }

  get(atId: string): string | undefined {
    return this.map.get(atId)
  }

  set(atId: string, targetId: string): void {
    this.map.set(atId, targetId)
  }

  has(atId: string): boolean {
    return this.map.has(atId)
  }

  get size(): number {
    return this.map.size
  }
}
