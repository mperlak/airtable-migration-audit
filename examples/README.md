# Sample Report

This folder contains a real audit output from a 6-year-old Airtable base —
an interior design business with 7 tables, 37,688 records, 233 fields
(122 data + 111 computed), and 67 data quality warnings.

Statistics, schema structure, and relationship analysis are unmodified.
Personal information (client names, staff names) and business-sensitive
values (campaign names, internal notes) have been replaced with neutral
equivalents. This was a Polish-language base, so some values (region
names, country codes) reflect that context.

Generated with `npm run discover` (full analysis mode).

## Files

- [`sample-report.md`](./sample-report.md) — full markdown report (browse on GitHub)
- [`sample-report.html`](./sample-report.html) — interactive HTML report (download and open in browser)
- [`sample-MIGRATION.json`](./sample-MIGRATION.json) — machine-readable PostgreSQL migration spec

## What this base looks like

| Metric | Value |
|--------|-------|
| Tables | 7 |
| Total records | 37,688 |
| Total fields | 233 (122 data, 111 computed) |
| Linked record fields | 12 |
| Select fields | 37 |
| Relationships | 3 Many-to-One, 9 Many-to-Many |
| Circular dependencies | 1 |
| Data quality warnings | 67 |
| **Estimated complexity** | **High** |

Target schema: 7 core tables, 9 junction tables, 17 lookup tables
(33 total PostgreSQL tables).
