# Airtable Data Analysis Report by [straktur.com](https://straktur.com?utm_source=airtable-migration-audit&utm_medium=report&utm_content=header)

**Generated:** 2026-03-16 11:21:57  
**Bases analyzed:** Interior Design CRM (apptmzouHnhyFTcGe)  
**Mode:** full analysis (schema + record data)

## Summary

| Metric | Value |
|--------|-------|
| Tables | 7 |
| Total records | 37,688 |
| Total fields | 233 (122 data, 111 computed) |
| Linked record fields | 12 |
| Select fields | 37 (213 total choices) |
| Data quality flags | 67 warnings |

---

## Next Steps

### Migration Readiness

| Metric | Value |
|--------|-------|
| Tables to migrate | 7 (7 with data, 0 empty) |
| Computed fields (formulas/rollups) | 111 — must be recreated as app logic |
| Dictionary candidates | 6 text fields → normalize into lookup tables |
| Select fields | 37 → convert to enum types or lookup tables |
| Relationships | 3 Many-to-One (FK), 9 Many-to-Many (junction tables) |
| Data quality warnings | 67 — fix before migrating |
| Circular dependencies | 1 |
| Cross-base links | 0 |
| **Estimated complexity** | **High** |

### Recommended Target Schema

Your Airtable structure maps to approximately:

- **7** core PostgreSQL tables (from Airtable tables with data)
- **9** junction tables (for Many-to-Many relationships)
- **17** lookup tables (from select fields with 4+ choices)
- **33** total tables, **3** foreign key relationships

### How to Proceed

1. **Fix data quality issues** — resolve the 67 warnings flagged above
2. **Design target schema** — use the import order and relationship analysis as your starting point
3. **Handle computed fields** — the 111 formula/rollup/lookup fields must be recreated as application logic or database views
4. **Normalize dictionaries** — the 6 dictionary-candidate text fields should become lookup tables
5. **Import in dependency order** — follow the import order table above to maintain referential integrity
6. **Using [Straktur](https://straktur.com)?** Run `/airtable-import` with the generated MIGRATION.json to scaffold Drizzle schemas, validation, and feature modules automatically

## Data Quality Warnings

### Data cleanup needed

| Table | Field | Issue |
|-------|-------|-------|
| Customers | Region | Only 17 unique values across 1531 records — dictionary candidate |
| Customers | Country | Only 8 unique values across 1531 records — dictionary candidate |
| Customer Orders | Purchase Channel | Choice "Promo" used by only 2 record(s) |
| Customer Orders | Notes | Only 7 unique values across 1759 records — dictionary candidate |
| Customer Orders | Return Status | Single-value field — only value is "Return" (4 records, 100% null). Consider converting to boolean |
| Customer Orders | Promotion | Choice "1,300 Rooms Campaign" used by only 2 record(s) |
| Customer Orders | Promotion | Choice "Flash Sale 20231203" used by only 1 record(s) |
| Customer Orders | Promotion | 1 pair(s) of similar choices — possible duplicates/typos: "Winter Break Discount 2024" ≈ "Winter Break Discount 2025" |
| Customer Orders | Mailing | Single-value field — only value is "Post-order Survey" (123 records, 93% null). Consider converting to boolean |
| Designed Interiors | Lead Designer | Choice "Designer M" used by only 2 record(s) |
| Designed Interiors | Lead Designer | Choice "Designer N" used by only 2 record(s) |
| Designed Interiors | Lead Designer | Choice "Designer O" used by only 1 record(s) |
| Designed Interiors | Type | Choice "House" used by only 2 record(s) |
| Designed Interiors | Type | Choice "Walk-in Closet" used by only 2 record(s) |
| Designed Interiors | Type | Choice "Space Division" used by only 1 record(s) |
| Designed Interiors | Type | Choice "Living Room with Kitchenette" used by only 1 record(s) |
| Designed Interiors | Type | Choice "Laundry Room" used by only 1 record(s) |
| Designed Interiors | GSheets export | Constant field — all 1600 records have value "Exported". Consider removing instead of migrating |
| Designed Interiors | Promo Campaigns | Single-value field — only value is "Partner1 221212" (1 records, 100% null). Consider converting to boolean |
| Designed Interiors | Contact Person | Single-value field — only value is "Designer R" (19 records, 99% null). Consider converting to boolean |
| Designed Interiors | Email Sent | Single-value field — only value is "Sent" (33 records, 98% null). Consider converting to boolean |
| Commissions | Notes | Only 5 unique values across 31898 records — dictionary candidate |
| Stores | Billing Method/Invoice | Choice "Commission-based" used by only 2 record(s) |
| Stores | Order Method S@S | Choice "customer discount code" used by only 2 record(s) |
| Stores | Order Method S@S | Choice "order form" used by only 2 record(s) |
| Stores | Order Method S@S | Choice "proforma" used by only 1 record(s) |
| Stores | Offered Product Categories | Choice "Mattresses" used by only 2 record(s) |
| Stores | Offered Product Categories | Choice "Neon Signs" used by only 1 record(s) |
| Stores | Offered Product Categories | Choice "Custom Blinds" used by only 1 record(s) |
| Stores | Offered Product Categories | Choice "Flower Stands" used by only 1 record(s) |
| Stores | Store Products – Data | Only 1 unique values across 137 records — dictionary candidate |
| Contacts | Topics | Choice "Photo Request" used by only 2 record(s) |

### Schema decisions

| Table | Field | Issue |
|-------|-------|-------|
| Customers | Orders | Records have up to 5 links — Many-to-Many relationship |
| Customer Orders | Customer | All records have 0-1 links — Many-to-One relationship (single FK) |
| Customer Orders | Customer | AT configured as single-record link |
| Customer Orders | Package | Records have up to 3 links — Many-to-Many relationship |
| Customer Orders | Room Projects | Records have up to 10 links — Many-to-Many relationship |
| Designed Interiors | Order | All records have 0-1 links — Many-to-One relationship (single FK) |
| Designed Interiors | Order | AT configured as single-record link |
| Designed Interiors | Commissions | Records have up to 88 links — Many-to-Many relationship |
| Designed Interiors | All Contacts | Records have up to 4 links — Many-to-Many relationship |
| Designed Interiors | Contact History | Max length 2687 chars — use text() instead of varchar() |
| Designed Interiors | Planned Budget | Max length 580 chars — use text() instead of varchar() |
| Commissions | Store | Records have up to 2 links — Many-to-Many relationship |
| Commissions | SKU | Max length 360 chars — use text() instead of varchar() |
| Commissions | Rooms | All records have 0-1 links — Many-to-One relationship (single FK) |
| Commissions | Rooms | AT configured as single-record link |
| Stores | Commissions | Records have up to 4651 links — Many-to-Many relationship |
| Stores | Internal Notes | Max length 918 chars — use text() instead of varchar() |
| Stores | Orders – Login Credentials | Max length 294 chars — use text() instead of varchar() |
| Stores | Store Products – Data | Max length 264 chars — use text() instead of varchar() |
| Service Packages | Customer Orders | Records have up to 775 links — Many-to-Many relationship |
| Contacts | Notes | Max length 970 chars — use text() instead of varchar() |
| Contacts | Interiors | Records have up to 4 links — Many-to-Many relationship |

### Low-priority cleanup

| Table | Field | Issue |
|-------|-------|-------|
| Customer Orders | FB Review | 1 defined choice(s) never used: No Response |
| Customer Orders | Promotion | 1 defined choice(s) never used: 20% |
| Customer Orders | Mailing | 1 defined choice(s) never used: Post-order Survey – to send |
| Designed Interiors | Lead Designer | 1 defined choice(s) never used: Unknown |
| Designed Interiors | Type | 3 defined choice(s) never used: Apartment, Dining Room, Guest Room |
| Designed Interiors | Airtable Export | 1 defined choice(s) never used: Designer S |
| Designed Interiors | Delivered | 1 defined choice(s) never used: No |
| Designed Interiors | GSheets export | 1 defined choice(s) never used: To Export |
| Designed Interiors | Tags | 2 defined choice(s) never used: BF 2023 (phone), BF 2025 |
| Designed Interiors | Email Sent | 1 defined choice(s) never used: To Send |
| Commissions | Paid | 3 defined choice(s) never used: d,  (s)FS-60/06/2023/SEC, t |
| Commissions | Designer Settlement Status | 1 defined choice(s) never used: N/A |
| Commissions | Field 43 | All values are empty |

## Import Order (dependency-based)

| Order | Table | Records | Depends On |
|-------|-------|---------|------------|
| 1 | Customers | 1,531 | Customer Orders |
| 2 | Customer Orders | 1,759 | Customers, Service Packages, Designed Interiors |
| 3 | Designed Interiors | 2,073 | Customer Orders, Commissions, Contacts |
| 4 | Commissions | 31,898 | Stores, Designed Interiors |
| 5 | Stores | 137 | Commissions |
| 6 | Service Packages | 14 | Customer Orders |
| 7 | Contacts | 276 | Designed Interiors |

> **Warning: Circular dependencies detected.**
>
> Cycle: Customers ↔ Customer Orders ↔ Service Packages ↔ Designed Interiors ↔ Contacts ↔ Commissions ↔ Stores
>
> These tables link to each other. Import both without FK values, then resolve in a post-import pass.

---

## Table: Customers (1,531 records)

Created: 2019-02-22 → 2026-03-05

### Fields Overview (11 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Name | singleLineText | 0% | Primary field. Max length: 34 chars. 1,503 unique values |
| 2 | First Name | singleLineText | 0% | Max length: 12 chars. 239 unique values |
| 3 | Last Name | singleLineText | 0% | Max length: 24 chars. 1,392 unique values |
| 4 | Orders | linkedRecord → Customer Orders | 1% | Up to 5 links → Many-to-Many |
| 5 | Email | email | 0% | Max length: 39 chars. 1,527 unique values |
| 6 | Phone | phoneNumber | 10% | Max length: 19 chars. 1,368 unique values |
| 7 | Address | singleLineText | 0% | Max length: 62 chars. 1,493 unique values |
| 8 | City | singleLineText | 0% | Max length: 44 chars. 630 unique values |
| 9 | Postal Code | singleLineText | 0% | Max length: 8 chars. 1,075 unique values |
| 10 | Region | singleLineText | 0% | Max length: 19 chars. Only 17 unique values — dictionary? |
| 11 | Country | singleLineText | 0% | Max length: 6 chars. Only 8 unique values — dictionary? |

### Field Details

#### Name (singleLineText)

- Records: 1,531 | Null: 0 (0%)
- Length: min 6, max 34, avg 16
- Unique values: 1,503 (98%)

#### First Name (singleLineText)

- Records: 1,531 | Null: 0 (0%)
- Length: min 3, max 12, avg 7
- Unique values: 239 (16%)

#### Last Name (singleLineText)

- Records: 1,531 | Null: 0 (0%)
- Length: min 1, max 24, avg 9
- Unique values: 1,392 (91%)

#### Orders (multipleRecordLinks)

- Links to: Customer Orders (tblSdYmRLaON1TzPB)
- Cardinality: 0 links: 11 (1%), 1 link: 1,321 (86%), 2+ links: 199 (13%)
- Max links per record: 5
- **→ Many-to-Many relationship**
- **Records have up to 5 links — Many-to-Many relationship**

#### Email (email)

- Records: 1,531 | Null: 3 (0%)
- Length: min 9, max 39, avg 22
- Unique values: 1,527 (100%)

#### Phone (phoneNumber)

- Records: 1,531 | Null: 146 (10%)
- Length: min 8, max 19, avg 9
- Unique values: 1,368 (99%)

#### Address (singleLineText)

- Records: 1,531 | Null: 3 (0%)
- Length: min 3, max 62, avg 14
- Unique values: 1,493 (98%)

#### City (singleLineText)

- Records: 1,531 | Null: 3 (0%)
- Length: min 3, max 44, avg 8
- Unique values: 630 (41%)

#### Postal Code (singleLineText)

- Records: 1,531 | Null: 3 (0%)
- Length: min 5, max 8, avg 6
- Unique values: 1,075 (70%)

#### Region (singleLineText)

- Records: 1,531 | Null: 7 (0%)
- Length: min 3, max 19, avg 11
- Unique values: 17 (1%)

| Value | Count |
|-------|-------|
| mazowieckie | 538 |
| małopolskie | 173 |
| dolnośląskie | 121 |
| wielkopolskie | 112 |
| śląskie | 112 |
| pomorskie | 90 |
| łódzkie | 88 |
| zachodniopomorskie | 44 |
| lubelskie | 42 |
| lubuskie | 32 |
- **Only 17 unique values across 1531 records — dictionary candidate**

#### Country (singleLineText)

- Records: 1,531 | Null: 3 (0%)
- Length: min 2, max 6, avg 2
- Unique values: 8 (1%)

| Value | Count |
|-------|-------|
| PL | 1498 |
| DE | 16 |
| GB | 7 |
| NL | 2 |
| Poland | 2 |
| CH | 1 |
| PF | 1 |
| IE | 1 |
- **Only 8 unique values across 1531 records — dictionary candidate**

---

## Table: Customer Orders (1,759 records)

Created: 2019-02-23 → 2026-03-13

### Fields Overview (15 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Order Number | singleLineText | 0% | Primary field. Max length: 10 chars. 1,754 unique values |
| 2 | Customer | linkedRecord → Customers | 0% | 100% have 0-1 links → Many-to-One |
| 3 | Quantity | number | 0% | All integers. Range: 0 – 12 |
| 4 | Purchase Date | date | 0% | 2017-10-07 → 2026-03-09 |
| 5 | Purchase Channel | singleSelect | 30% | 4 choices (4 actually used) |
| 6 | Discount | number | 13% | Range: 0 – 100 |
| 7 | Notes | multilineText | 100% | Max length: 53 chars. Only 7 unique values — dictionary? |
| 8 | Order Total | number | 0% | Range: 0 – 26,000 |
| 9 | Package | linkedRecord → Service Packages | 40% | Up to 3 links → Many-to-Many |
| 10 | Invoice Number | singleLineText | 88% | Max length: 10 chars. 209 unique values |
| 11 | Room Projects | linkedRecord → Designed Interiors | 2% | Up to 10 links → Many-to-Many |
| 12 | FB Review | singleSelect | 68% | 4 choices (3 actually used) |
| 13 | Return Status | singleSelect | 100% | 1 choices (1 actually used) |
| 14 | Promotion | singleSelect | 84% | 23 choices (22 actually used) |
| 15 | Mailing | multipleSelects | 93% | 2 choices (1 actually used) |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Purchase Month | formula | singleLineText | App logic or generated column |
| Order Value (net) | formula | currency | App logic or generated column |
| Packages (products) | rollup | singleLineText | SQL aggregate / JOIN |
| Shopping List Value | rollup | number | SQL aggregate / JOIN |
| Paid Commissions | rollup | number | SQL aggregate / JOIN |
| Unpaid Commissions | formula | number | App logic or generated column |
| All Commissions Value | rollup | number | SQL aggregate / JOIN |
| Year | formula | number | App logic or generated column |
| Region | multipleLookupValues | singleLineText | SQL JOIN |
| City | multipleLookupValues | singleLineText | SQL JOIN |
| Country | multipleLookupValues | singleLineText | SQL JOIN |
| Phone | multipleLookupValues | phoneNumber | SQL JOIN |
| Email | multipleLookupValues | email | SQL JOIN |
| Current Month | formula | singleLineText | App logic or generated column |
| Current Month v2 | formula | singleLineText | App logic or generated column |
| Average Price per Project | formula | currency | App logic or generated column |
| First Name | rollup | singleLineText | SQL aggregate / JOIN |
| Last Name | rollup | singleLineText | SQL aggregate / JOIN |
| Completed Orders | rollup | currency | SQL aggregate / JOIN |

### Field Details

#### Order Number (singleLineText)

- Records: 1,759 | Null: 1 (0%)
- Length: min 5, max 10, avg 5
- Unique values: 1,754 (100%)

#### Customer (multipleRecordLinks)

- Links to: Customers (tblH7KEpEcobTs49S)
- Cardinality: 0 links: 1 (0%), 1 link: 1,758 (100%), 2+ links: 0 (0%)
- **→ Many-to-One relationship** (single FK)
- **All records have 0-1 links — Many-to-One relationship (single FK)**
- **AT configured as single-record link**

#### Quantity (number)

- Records: 1,759 | Null: 1 (0%)
- Min: 0 | Max: 12 | Avg: 1.17 | Median: 1
- All integers: yes
- **All values are integers**

#### Purchase Date (date)

- Records: 1,759 | Null: 1 (0%)
- Range: 2017-10-07 → 2026-03-09

#### Purchase Channel (singleSelect)

- Records: 1,759 | Null: 525 (30%)

| Choice | Records | % |
|--------|---------|---|
| WooCommerce | 1,038 | 84% |
| Shoplo | 161 | 13% |
| Direct | 33 | 3% |
| Promo | 2 | 0% |
- **Choice "Promo" used by only 2 record(s)**

#### Discount (number)

- Records: 1,759 | Null: 228 (13%)
- Min: 0 | Max: 100 | Avg: 6.42 | Median: 0
- All integers: no (up to 2 decimal places)

#### Notes (multilineText)

- Records: 1,759 | Null: 1,752 (100%)
- Length: min 14, max 53, avg 31
- Unique values: 7 (100%)

| Value | Count |
|-------|-------|
| Mutual contract withdrawal - money refunded to customer | 1 |
| Changes made to project | 1 |
| Smart Institute | 1 |
| Completion of non-children's room  | 1 |
| Additional changes in project | 1 |
| We withdrew from contract due to missing measurements | 1 |
| Foundation auction  | 1 |
- **Only 7 unique values across 1759 records — dictionary candidate**
- **100% empty — rarely used field**

#### Order Total (number)

- Records: 1,759 | Null: 3 (0%)
- Min: 0 | Max: 26000 | Avg: 2501.8 | Median: 1996
- All integers: no (up to 2 decimal places)

#### Package (multipleRecordLinks)

- Links to: Service Packages (tbl4oUbOaDN7sbizJ)
- Cardinality: 0 links: 703 (40%), 1 link: 939 (53%), 2+ links: 117 (7%)
- Max links per record: 3
- **→ Many-to-Many relationship**
- **Records have up to 3 links — Many-to-Many relationship**

#### Invoice Number (singleLineText)

- Records: 1,759 | Null: 1,540 (88%)
- Length: min 4, max 10, avg 10
- Unique values: 209 (95%)
- **88% empty — rarely used field**

#### Room Projects (multipleRecordLinks)

- Links to: Designed Interiors (tblSg3BjL0zjpw9jK)
- Cardinality: 0 links: 42 (2%), 1 link: 1,438 (82%), 2+ links: 279 (16%)
- Max links per record: 10
- **→ Many-to-Many relationship**
- **Records have up to 10 links — Many-to-Many relationship**

#### FB Review (singleSelect)

- Records: 1,759 | Null: 1,200 (68%)

| Choice | Records | % |
|--------|---------|---|
| Request Sent | 380 | 68% |
| Received | 149 | 27% |
| DO NOT SEND | 30 | 5% |
| No Response | 0 | 0% — **never used** |

> 4 defined choices, only 3 actually used in data.
- **1 defined choice(s) never used: No Response**

#### Return Status (singleSelect)

- Records: 1,759 | Null: 1,755 (100%)

| Choice | Records | % |
|--------|---------|---|
| Return | 4 | 100% |
- **Single-value field — only value is "Return" (4 records, 100% null). Consider converting to boolean**

#### Promotion (singleSelect)

- Records: 1,759 | Null: 1,479 (84%)

| Choice | Records | % |
|--------|---------|---|
| Project Sale 2025 | 31 | 11% |
| Project Sale 202312 | 30 | 11% |
| FinalSale24 | 25 | 9% |
| 1,500 Projects Campaign | 25 | 9% |
| 5-Year Anniversary | 19 | 7% |
| BlackWeek2024 | 15 | 5% |
| Spring Promo 2024 | 14 | 5% |
| Winter Sale Finale 2024 | 13 | 5% |
| FALL20 | 13 | 5% |
| SPRING25 | 12 | 4% |
| Autumn Design 2024 | 12 | 4% |
| Spring Discounts 2024 | 12 | 4% |
| Winter Break Discount 2024 | 11 | 4% |
| BF 2023 | 9 | 3% |
| June Promo 2024 | 8 | 3% |
| Winter Break Discount 2025 | 7 | 3% |
| NOW20 | 7 | 3% |
| DREAMS20 | 6 | 2% |
| OCT17 | 5 | 2% |
| For Her For Him 2024 | 3 | 1% |
| 1,300 Rooms Campaign | 2 | 1% |
| Flash Sale 20231203 | 1 | 0% |
| 20% | 0 | 0% — **never used** |

> 23 defined choices, only 22 actually used in data.
- **1 defined choice(s) never used: 20%**
- **Choice "1,300 Rooms Campaign" used by only 2 record(s)**
- **Choice "Flash Sale 20231203" used by only 1 record(s)**
- **1 pair(s) of similar choices — possible duplicates/typos: "Winter Break Discount 2024" ≈ "Winter Break Discount 2025"**

#### Mailing (multipleSelects)

- Records: 1,759 | Null: 1,636 (93%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Post-order Survey | 123 | 100% |
| Post-order Survey – to send | 0 | 0% — **never used** |

> 2 defined choices, only 1 actually used in data.
- **1 defined choice(s) never used: Post-order Survey – to send**
- **Single-value field — only value is "Post-order Survey" (123 records, 93% null). Consider converting to boolean**

---

## Table: Designed Interiors (2,073 records)

Created: 2019-02-23 → 2026-03-13

### Fields Overview (42 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Children Names | singleLineText | 8% | Max length: 66 chars. 845 unique values |
| 2 | Children Ages | singleLineText | 8% | Max length: 9 chars. 168 unique values |
| 3 | Lead Designer | singleSelect | 6% | 16 choices (15 actually used) |
| 4 | Type | singleSelect | 0% | 17 choices (14 actually used) |
| 5 | Airtable Export | singleSelect | 21% | 3 choices (2 actually used) |
| 6 | Package (Product) | singleSelect | 3% | 6 choices (6 actually used) |
| 7 | Order | linkedRecord → Customer Orders | 0% | 100% have 0-1 links → Many-to-One |
| 8 | Delivered | singleSelect | 4% | 3 choices (2 actually used) |
| 9 | Shopping List Value | currency | 8% | Range: 419 – 73,010.9 |
| 10 | Commissions | linkedRecord → Commissions | 7% | Up to 88 links → Many-to-Many |
| 11 | Room Completion | singleSelect | 83% | 5 choices (5 actually used) |
| 12 | Delivery Date | date | 6% | 2018-04-06 → 2026-03-10 |
| 13 | Building Type | singleSelect | 5% | 2 choices (2 actually used) |
| 14 | Room Condition | singleSelect | 5% | 3 choices (3 actually used) |
| 15 | Room No. (autonumber) | autoNumber | — | All integers. Range: 1 – 2,132 |
| 16 | WordPress Project No. (old) | singleLineText | 93% | Max length: 3 chars. 149 unique values |
| 17 | All Contacts | linkedRecord → Contacts | 89% | Up to 4 links → Many-to-Many |
| 18 | Rooms Count | number | 16% | All integers. Range: 1 – 1 |
| 19 | GSheets export | singleSelect | 23% | 2 choices (1 actually used) |
| 20 | Shopping List | url | 23% | Max length: 146 chars. 1,600 unique values |
| 21 | Survey Link | url | 34% | Max length: 146 chars. 1,371 unique values |
| 22 | Area (m²) | number | 40% | Range: 0 – 54 |
| 23 | Contact Status | singleSelect | 71% | 4 choices (4 actually used) |
| 24 | Next Contact Date | date | 90% | 2022-12-06 → 2026-08-10 |
| 25 | Promo Campaigns | multipleSelects | 100% | 1 choices (1 actually used) |
| 26 | Shopping List Expiry | date | 41% | 2022-01-31 → 2026-04-10 |
| 27 | Free Shipping Until | date | 41% | 2021-10-12 → 2026-03-17 |
| 28 | Contact History | richText | 48% | **Max length: 2,687 chars**. 1,012 unique values |
| 29 | Promo Campaign | multipleSelects | 98% | 2 choices (2 actually used) |
| 30 | Contact Date (auto) | lastModifiedTime | — | 2022-12-12 → 2026-03-16 |
| 31 | Contact After Delivery | checkbox | 0% | 10% checked |
| 32 | Free Shipping Notice | checkbox | 0% | 7% checked |
| 33 | Contact re List End | checkbox | 0% | 2% checked |
| 34 | Contact Person | singleSelect | 99% | 1 choices (1 actually used) |
| 35 | Tags | multipleSelects | 94% | 6 choices (4 actually used) |
| 36 | Email Sent | singleSelect | 98% | 2 choices (1 actually used) |
| 37 | Automated Emails | multipleSelects | 72% | 6 choices (6 actually used) |
| 38 | Contact Status (new) | singleSelect | 70% | 7 choices (7 actually used) |
| 39 | Planned Renovation Date | date | 85% | 2024-09-13 → 2026-11-16 |
| 40 | Notes | richText | 98% | Max length: 71 chars. 20 unique values |
| 41 | Planned Budget | singleLineText | 77% | **Max length: 580 chars**. 90 unique values |
| 42 | Modified At (Airtable Export) | lastModifiedTime | — | 2020-09-02 → 2026-03-10 |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Room Number | formula | singleLineText | App logic or generated column |
| Order Number EXP | formula | singleLineText | App logic or generated column |
| WordPress Current Project Number | formula | singleLineText | App logic or generated column |
| Order Date | multipleLookupValues | date | SQL JOIN |
| Children Count | formula | number | App logic or generated column |
| Customer | multipleLookupValues | multipleRecordLinks | SQL JOIN |
| Package | multipleLookupValues | multipleRecordLinks | SQL JOIN |
| Commission Shopping List (net) | rollup | currency | SQL aggregate / JOIN |
| Potential Commissions Value | rollup | number | SQL aggregate / JOIN |
| Commission Products Share (net) | formula | percent | App logic or generated column |
| Commissions to Total Purchases | formula | percent | App logic or generated column |
| Purchase Month | formula | singleLineText | App logic or generated column |
| Paid Commissions | rollup | number | SQL aggregate / JOIN |
| Likely Revenue >90% | formula | number | App logic or generated column |
| Completion Status (by paid invoices) | formula | singleLineText | App logic or generated column |
| Commissions Completed (%) | formula | percent | App logic or generated column |
| Region | multipleLookupValues | singleLineText | SQL JOIN |
| City | multipleLookupValues | singleLineText | SQL JOIN |
| Commissions Paid to Designer | rollup | number | SQL aggregate / JOIN |
| Interior_No | formula | singleLineText | App logic or generated column |
| Paid Commissions Amount | rollup | currency | SQL aggregate / JOIN |
| Commissions Paid/To Pay (net) | rollup | number | SQL aggregate / JOIN |
| Phone | multipleLookupValues | phoneNumber | SQL JOIN |
| Email | multipleLookupValues | email | SQL JOIN |
| Delivery Month | formula | singleLineText | App logic or generated column |
| Contacts Count (all) | count | — | SQL COUNT or app logic |
| Commissions to Allocate | formula | currency | App logic or generated column |
| FB Review | rollup | singleLineText | SQL aggregate / JOIN |
| Carpenter | formula | singleLineText | App logic or generated column |
| Express | formula | singleLineText | App logic or generated column |
| Interior_No_wordpress_current | formula | singleLineText | App logic or generated column |
| Commissions for Designer | rollup | number | SQL aggregate / JOIN |
| Completed Orders (net) | rollup | currency | SQL aggregate / JOIN |
| Free Shipping | formula | singleLineText | App logic or generated column |
| First Purchase Date | rollup | date | SQL aggregate / JOIN |
| Discount | rollup | number | SQL aggregate / JOIN |
| Paid Commissions (net) | rollup | currency | SQL aggregate / JOIN |
| Shopping List (net) | formula | currency | App logic or generated column |
| Potential Commissions (net) | rollup | currency | SQL aggregate / JOIN |
| Commissions Completed Net (%) | formula | percent | App logic or generated column |
| Completed Orders Net (%) | formula | percent | App logic or generated column |
| Completion Started (by paid invoices) | formula | singleLineText | App logic or generated column |
| Free Shipping Ends in x Days | formula | singleLineText | App logic or generated column |
| Package Price | rollup | singleLineText | SQL aggregate / JOIN |
| Shopping List Expiry End | formula | singleLineText | App logic or generated column |
| Customer EXP | rollup | singleLineText | SQL aggregate / JOIN |
| Purchase Year | formula | number | App logic or generated column |
| Delivery Year | formula | number | App logic or generated column |
| Delivery Date (for Rollup) | formula | date | App logic or generated column |
| Delivery Week | formula | singleLineText | App logic or generated column |
| Planned Budget (numeric) | formula | singleLineText | App logic or generated column |

### Field Details

#### Children Names (singleLineText)

- Records: 2,073 | Null: 161 (8%)
- Length: min 3, max 66, avg 8
- Unique values: 845 (44%)

#### Children Ages (singleLineText)

- Records: 2,073 | Null: 167 (8%)
- Length: min 1, max 9, avg 2
- Unique values: 168 (9%)

#### Lead Designer (singleSelect)

- Records: 2,073 | Null: 125 (6%)

| Choice | Records | % |
|--------|---------|---|
| Designer A | 611 | 31% |
| Designer B | 363 | 19% |
| Designer C | 264 | 14% |
| Designer D | 229 | 12% |
| Designer E | 213 | 11% |
| Designer F | 123 | 6% |
| Designer G | 62 | 3% |
| Designer H | 29 | 1% |
| Designer I | 16 | 1% |
| Designer J | 15 | 1% |
| Designer K | 15 | 1% |
| Designer L | 3 | 0% |
| Designer M | 2 | 0% |
| Designer N | 2 | 0% |
| Designer O | 1 | 0% |
| Unknown | 0 | 0% — **never used** |

> 16 defined choices, only 15 actually used in data.
- **1 defined choice(s) never used: Unknown**
- **Choice "Designer M" used by only 2 record(s)**
- **Choice "Designer N" used by only 2 record(s)**
- **Choice "Designer O" used by only 1 record(s)**

#### Type (singleSelect)

- Records: 2,073 | Null: 9 (0%)

| Choice | Records | % |
|--------|---------|---|
| Children's Room | 1,937 | 94% |
| Bedroom | 32 | 2% |
| Living Room | 24 | 1% |
| Office | 19 | 1% |
| Bathroom | 14 | 1% |
| Entryway | 10 | 0% |
| Living Room | 10 | 0% |
| Kitchen | 8 | 0% |
| Hallway | 3 | 0% |
| House | 2 | 0% |
| Walk-in Closet | 2 | 0% |
| Space Division | 1 | 0% |
| Living Room with Kitchenette | 1 | 0% |
| Laundry Room | 1 | 0% |
| Apartment | 0 | 0% — **never used** |
| Dining Room | 0 | 0% — **never used** |
| Guest Room | 0 | 0% — **never used** |

> 17 defined choices, only 14 actually used in data.
- **3 defined choice(s) never used: Apartment, Dining Room, Guest Room**
- **Choice "House" used by only 2 record(s)**
- **Choice "Walk-in Closet" used by only 2 record(s)**
- **Choice "Space Division" used by only 1 record(s)**
- **Choice "Living Room with Kitchenette" used by only 1 record(s)**
- **Choice "Laundry Room" used by only 1 record(s)**

#### Airtable Export (singleSelect)

- Records: 2,073 | Null: 433 (21%)

| Choice | Records | % |
|--------|---------|---|
| Exported | 1,635 | 100% |
| To Export | 5 | 0% |
| Designer S | 0 | 0% — **never used** |

> 3 defined choices, only 2 actually used in data.
- **1 defined choice(s) never used: Designer S**

#### Package (Product) (singleSelect)

- Records: 2,073 | Null: 52 (3%)

| Choice | Records | % |
|--------|---------|---|
| PREMIUM | 1,131 | 56% |
| PREMIUM+ | 363 | 18% |
| ONE | 277 | 14% |
| GO | 120 | 6% |
| OTHER | 83 | 4% |
| SMART | 47 | 2% |

#### Order (multipleRecordLinks)

- Links to: Customer Orders (tblSdYmRLaON1TzPB)
- Cardinality: 0 links: 2 (0%), 1 link: 2,071 (100%), 2+ links: 0 (0%)
- **→ Many-to-One relationship** (single FK)
- **All records have 0-1 links — Many-to-One relationship (single FK)**
- **AT configured as single-record link**

#### Delivered (singleSelect)

- Records: 2,073 | Null: 90 (4%)

| Choice | Records | % |
|--------|---------|---|
| Yes | 1,950 | 98% |
| Cancelled | 33 | 2% |
| No | 0 | 0% — **never used** |

> 3 defined choices, only 2 actually used in data.
- **1 defined choice(s) never used: No**

#### Shopping List Value (currency)

- Records: 2,073 | Null: 159 (8%)
- Min: 419 | Max: 73010.9 | Avg: 18123.1 | Median: 17152.4
- All integers: no (up to 2 decimal places)

#### Commissions (multipleRecordLinks)

- Links to: Commissions (tbl94C771ANGtmgxz)
- Cardinality: 0 links: 153 (7%), 1 link: 11 (1%), 2+ links: 1,909 (92%)
- Max links per record: 88
- **→ Many-to-Many relationship**
- **Records have up to 88 links — Many-to-Many relationship**

#### Room Completion (singleSelect)

- Records: 2,073 | Null: 1,723 (83%)

| Choice | Records | % |
|--------|---------|---|
| Completed | 138 | 39% |
| In Progress | 120 | 34% |
| Will be Implemented | 72 | 21% |
| Not Completed | 16 | 5% |
| No Info | 4 | 1% |

#### Delivery Date (date)

- Records: 2,073 | Null: 126 (6%)
- Range: 2018-04-06 → 2026-03-10

#### Building Type (singleSelect)

- Records: 2,073 | Null: 103 (5%)

| Choice | Records | % |
|--------|---------|---|
| House | 1,277 | 65% |
| Apartment | 693 | 35% |

#### Room Condition (singleSelect)

- Records: 2,073 | Null: 103 (5%)

| Choice | Records | % |
|--------|---------|---|
| Renovation | 1,404 | 71% |
| Developer Finish | 399 | 20% |
| Shell Stage | 167 | 8% |

#### Room No. (autonumber) (autoNumber)

- Records: 2,073 | Null: 0 (0%)
- Min: 1 | Max: 2132 | Avg: 1056.05 | Median: 1055
- All integers: yes
- **All values are integers**

#### WordPress Project No. (old) (singleLineText)

- Records: 2,073 | Null: 1,924 (93%)
- Length: min 2, max 3, avg 2
- Unique values: 149 (100%)
- **93% empty — rarely used field**

#### All Contacts (multipleRecordLinks)

- Links to: Contacts (tblG15dxwxRdXaXH9)
- Cardinality: 0 links: 1,844 (89%), 1 link: 148 (7%), 2+ links: 81 (4%)
- Max links per record: 4
- **→ Many-to-Many relationship**
- **Records have up to 4 links — Many-to-Many relationship**

#### Rooms Count (number)

- Records: 2,073 | Null: 329 (16%)
- Min: 1 | Max: 1 | Avg: 1 | Median: 1
- All integers: yes
- **All values are integers**

#### GSheets export (singleSelect)

- Records: 2,073 | Null: 473 (23%)

| Choice | Records | % |
|--------|---------|---|
| Exported | 1,600 | 100% |
| To Export | 0 | 0% — **never used** |

> 2 defined choices, only 1 actually used in data.
- **1 defined choice(s) never used: To Export**
- **Constant field — all 1600 records have value "Exported". Consider removing instead of migrating**

#### Shopping List (url)

- Records: 2,073 | Null: 473 (23%)
- Length: min 115, max 146, avg 120
- Unique values: 1,600 (100%)
- Longest value (truncated): "https://docs.google.com/spreadsheets/d/1abcdefghijklmnopqrstuvwxyz012345678ABCDEFG/edit?ouid=000000000000000000000&urlBuilderDomain=designer-f.example.com"

#### Survey Link (url)

- Records: 2,073 | Null: 696 (34%)
- Length: min 3, max 146, avg 118
- Unique values: 1,371 (100%)
- Longest value (truncated): "https://studio.typeform.com/to/T0H0H8JQ#fname=Customer1&email=customer1@example.com&lname=Customer1Surname&project_no=#5459_1466"

#### Area (m²) (number)

- Records: 2,073 | Null: 820 (40%)
- Min: 0 | Max: 54 | Avg: 15.13 | Median: 13.8
- All integers: no (up to 2 decimal places)

#### Contact Status (singleSelect)

- Records: 2,073 | Null: 1,467 (71%)

| Choice | Records | % |
|--------|---------|---|
| After Call – next steps | 420 | 69% |
| After Call – nothing further | 140 | 23% |
| Call Attempt | 37 | 6% |
| To Contact | 9 | 1% |

#### Next Contact Date (date)

- Records: 2,073 | Null: 1,869 (90%)
- Range: 2022-12-06 → 2026-08-10
- **90% null — rarely used**

#### Promo Campaigns (multipleSelects)

- Records: 2,073 | Null: 2,072 (100%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Partner1 221212 | 1 | 100% |
- **Single-value field — only value is "Partner1 221212" (1 records, 100% null). Consider converting to boolean**

#### Shopping List Expiry (date)

- Records: 2,073 | Null: 842 (41%)
- Range: 2022-01-31 → 2026-04-10

#### Free Shipping Until (date)

- Records: 2,073 | Null: 858 (41%)
- Range: 2021-10-12 → 2026-03-17

#### Contact History (richText)

- Records: 2,073 | Null: 986 (48%)
- Length: min 1, max 2,687, avg 534
- Unique values: 1,012 (93%)
- Longest value (truncated): "1.08 - no answer, sent SMS - replied that the projects are complete 5.07 - emailed asking about completion  1.07 - voicemail, phone off - will try in a few days  29/0..."
- **Max length 2687 chars — use text() instead of varchar()**

#### Promo Campaign (multipleSelects)

- Records: 2,073 | Null: 2,024 (98%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Partner2 04/2023 | 30 | 61% |
| Partner1 04/2024 | 20 | 41% |

#### Contact Date (auto) (lastModifiedTime)

- Records: 2,073 | Null: 986 (48%)
- Range: 2022-12-12 → 2026-03-16

#### Contact After Delivery (checkbox)

- Records: 2,073 | True: 210 (10%) | False: 1,863 (90%)

#### Free Shipping Notice (checkbox)

- Records: 2,073 | True: 151 (7%) | False: 1,922 (93%)

#### Contact re List End (checkbox)

- Records: 2,073 | True: 35 (2%) | False: 2,038 (98%)
- **Only 2% checked — rarely used**

#### Contact Person (singleSelect)

- Records: 2,073 | Null: 2,054 (99%)

| Choice | Records | % |
|--------|---------|---|
| Designer R | 19 | 100% |
- **Single-value field — only value is "Designer R" (19 records, 99% null). Consider converting to boolean**

#### Tags (multipleSelects)

- Records: 2,073 | Null: 1,946 (94%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| BF 2023 (to contact) | 57 | 45% |
| BF 2024 | 56 | 44% |
| BF 2023 (mail) | 35 | 28% |
| Partner2 03/2024 | 14 | 11% |
| BF 2023 (phone) | 0 | 0% — **never used** |
| BF 2025 | 0 | 0% — **never used** |

> 6 defined choices, only 4 actually used in data.
- **2 defined choice(s) never used: BF 2023 (phone), BF 2025**

#### Email Sent (singleSelect)

- Records: 2,073 | Null: 2,040 (98%)

| Choice | Records | % |
|--------|---------|---|
| Sent | 33 | 100% |
| To Send | 0 | 0% — **never used** |

> 2 defined choices, only 1 actually used in data.
- **1 defined choice(s) never used: To Send**
- **Single-value field — only value is "Sent" (33 records, 98% null). Consider converting to boolean**

#### Automated Emails (multipleSelects)

- Records: 2,073 | Null: 1,490 (72%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| List Expiry – last day | 473 | 81% |
| List Expiry – 5 days | 458 | 79% |
| Free Shipping – last day | 413 | 71% |
| Free Shipping – 2 days | 392 | 67% |
| DO NOT SEND | 78 | 13% |
|  | 19 | 3% |

#### Contact Status (new) (singleSelect)

- Records: 2,073 | Null: 1,459 (70%)

| Choice | Records | % |
|--------|---------|---|
| Project Completed – most ordered with us | 289 | 47% |
| Won't Order | 119 | 19% |
| No Contact | 101 | 16% |
| Order within a month | 50 | 8% |
| Order later (renovation/build in progress) | 38 | 6% |
| Order within 2 months | 12 | 2% |
| Finalizing Details | 5 | 1% |

#### Planned Renovation Date (date)

- Records: 2,073 | Null: 1,757 (85%)
- Range: 2024-09-13 → 2026-11-16
- **85% null — rarely used**

#### Notes (richText)

- Records: 2,073 | Null: 2,031 (98%)
- Length: min 1, max 71, avg 16
- Unique values: 20 (48%)

| Value | Count |
|-------|-------|
|   | 13 |
| now what here?  | 5 |
| reach out  | 3 |
| what status?  | 3 |
| what status here? she asked to unlock list and what happened... | 2 |
| reach out - SMS  | 2 |
| why won't she order?  | 1 |
| does she have everything yet  | 1 |
| call    | 1 |
| do we have an answer?  | 1 |
- **98% empty — rarely used field**

#### Planned Budget (singleLineText)

- Records: 2,073 | Null: 1,602 (77%)
- Length: min 4, max 580, avg 22
- Unique values: 90 (19%)
- Longest value (truncated): "since we already have the bed and mattress, we're planning IKEA Trofast for storage and skipping the custom wardrobe from the carpenter I assume we should fit within a few thousand PLN - i.e. below 10 or..."
- **Max length 580 chars — use text() instead of varchar()**
- **77% empty — rarely used field**

#### Modified At (Airtable Export) (lastModifiedTime)

- Records: 2,073 | Null: 430 (21%)
- Range: 2020-09-02 → 2026-03-10

---

## Table: Commissions (31,898 records)

Created: 2019-02-22 → 2026-03-13

### Fields Overview (19 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Paid | singleSelect | 0% | 9 choices (6 actually used) |
| 2 | Store | linkedRecord → Stores | 0% | Up to 2 links → Many-to-Many |
| 3 | Invoice No | singleLineText | 57% | Max length: 24 chars. 5,208 unique values |
| 4 | Commission Invoice Date | date | 57% | 0221-12-31 → 2026-03-06 |
| 5 | Designer Settlement Date | date | 59% | 2019-07-09 → 2026-02-28 |
| 6 | Designer Settlement Status | singleSelect | 59% | 3 choices (2 actually used) |
| 7 | Order Amount | currency | 0% | Range: 0 – 41,056 |
| 8 | SKU | singleLineText | 19% | **Max length: 360 chars**. 25,491 unique values |
| 9 | Theoretical Commission (gross) | currency | 1% | Range: 0 – 7,250 |
| 10 | Order Status | singleSelect | 56% | 7 choices (7 actually used) |
| 11 | Rooms | linkedRecord → Designed Interiors | 0% | 100% have 0-1 links → Many-to-One |
| 12 | Proforma | multilineText | 89% | Max length: 64 chars. 3,093 unique values |
| 13 | Payment Date | date | 57% | 0221-12-31 → 2026-03-06 |
| 14 | Modified At | lastModifiedTime | — | 2019-12-04 → 2026-03-13 |
| 15 | Issued By | singleSelect | 57% | 3 choices (3 actually used) |
| 16 | Notes | richText | 100% | Max length: 76 chars. Only 5 unique values — dictionary? |
| 17 | Order Method | singleSelect | 0% | 4 choices (4 actually used) |
| 18 | Promo Email Sent | checkbox | 0% | 0% checked |
| 19 | Field 43 | singleLineText | 100% |  |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Name | formula | singleLineText | App logic or generated column |
| Designer | multipleLookupValues | singleLineText | SQL JOIN |
| Designer Settlement Amount | formula | currency | App logic or generated column |
| Commission Paid | formula | currency | App logic or generated column |
| Designer Settlement Amount (minus Designer N) | formula | number | App logic or generated column |
| Customer | multipleLookupValues | multipleRecordLinks | SQL JOIN |
| Commission Invoice Month | formula | singleLineText | App logic or generated column |
| Commission Paid/To Pay | formula | currency | App logic or generated column |
| Room Completion Status | multipleLookupValues | singleLineText | SQL JOIN |
| Project Order Month | multipleLookupValues | singleLineText | SQL JOIN |
| Commissions Paid to Designer | formula | number | App logic or generated column |
| Commission Purchases Completion | multipleLookupValues | percent | SQL JOIN |
| City | multipleLookupValues | singleLineText | SQL JOIN |
| Current Month | formula | singleLineText | App logic or generated column |
| Paid Commissions Amount (net) | formula | currency | App logic or generated column |
| Commission Invoice Year | formula | number | App logic or generated column |
| Order Amount EXP | formula | number | App logic or generated column |
| Commission Paid EXP | formula | number | App logic or generated column |
| Carpenter | rollup | singleLineText | SQL aggregate / JOIN |
| Shopping List Value | rollup | currency | SQL aggregate / JOIN |
| Email | rollup | singleLineText | SQL aggregate / JOIN |
| Delivery Month | rollup | singleLineText | SQL aggregate / JOIN |
| Package | rollup | singleLineText | SQL aggregate / JOIN |
| Tags | rollup | singleLineText | SQL aggregate / JOIN |
| Project Delivery Date | rollup | date | SQL aggregate / JOIN |

### Field Details

#### Paid (singleSelect)

- Records: 31,898 | Null: 30 (0%)

| Choice | Records | % |
|--------|---------|---|
| No | 18,098 | 57% |
| Yes | 13,656 | 43% |
| To Settle (order confirmed) | 72 | 0% |
| Customer Return | 28 | 0% |
| N/A | 9 | 0% |
| Invoice Issued | 5 | 0% |
| d | 0 | 0% — **never used** |
|  (s)FS-60/06/2023/SEC | 0 | 0% — **never used** |
| t | 0 | 0% — **never used** |

> 9 defined choices, only 6 actually used in data.
- **3 defined choice(s) never used: d,  (s)FS-60/06/2023/SEC, t**

#### Store (multipleRecordLinks)

- Links to: Stores (tbll0HM2n4QeRaDjd)
- Cardinality: 0 links: 17 (0%), 1 link: 31,880 (100%), 2+ links: 1 (0%)
- Max links per record: 2
- **→ Many-to-Many relationship**
- **Records have up to 2 links — Many-to-Many relationship**

#### Invoice No (singleLineText)

- Records: 31,898 | Null: 18,150 (57%)
- Length: min 2, max 24, avg 11
- Unique values: 5,208 (38%)
- **57% empty — rarely used field**

#### Commission Invoice Date (date)

- Records: 31,898 | Null: 18,288 (57%)
- Range: 0221-12-31 → 2026-03-06
- **57% null — rarely used**

#### Designer Settlement Date (date)

- Records: 31,898 | Null: 18,788 (59%)
- Range: 2019-07-09 → 2026-02-28
- **59% null — rarely used**

#### Designer Settlement Status (singleSelect)

- Records: 31,898 | Null: 18,758 (59%)

| Choice | Records | % |
|--------|---------|---|
| Settled | 13,074 | 99% |
| To Settle | 66 | 1% |
| N/A | 0 | 0% — **never used** |

> 3 defined choices, only 2 actually used in data.
- **1 defined choice(s) never used: N/A**

#### Order Amount (currency)

- Records: 31,898 | Null: 36 (0%)
- Min: 0 | Max: 41056 | Avg: 901.68 | Median: 499
- All integers: no (up to 16 decimal places)

#### SKU (singleLineText)

- Records: 31,898 | Null: 6,157 (19%)
- Length: min 14, max 360, avg 48
- Unique values: 25,491 (99%)
- Longest value (truncated): "Hevea-Mattressfor-Bed-Antiallergic,highlyelasticmattressforchildrenandyouth.Hardside,zonelessforyoungerchildrenandmedium-hardzoneside-forolderheavierchildren.Acomfortableanddurablema..."
- **Max length 360 chars — use text() instead of varchar()**

#### Theoretical Commission (gross) (currency)

- Records: 31,898 | Null: 171 (1%)
- Min: 0 | Max: 7250 | Avg: 197.88 | Median: 108
- All integers: no (up to 17 decimal places)

#### Order Status (singleSelect)

- Records: 31,898 | Null: 17,784 (56%)

| Choice | Records | % |
|--------|---------|---|
| Ordered by Us | 13,618 | 96% |
| Not Ordered (won't be) | 136 | 1% |
| Not Ordered (yet) | 131 | 1% |
| Ordered Directly | 126 | 1% |
| Ordered Elsewhere | 36 | 0% |
| Unknown | 35 | 0% |
| Different Product Ordered | 32 | 0% |

#### Rooms (multipleRecordLinks)

- Links to: Designed Interiors (tblSg3BjL0zjpw9jK)
- Cardinality: 0 links: 0 (0%), 1 link: 31,898 (100%), 2+ links: 0 (0%)
- **→ Many-to-One relationship** (single FK)
- **All records have 0-1 links — Many-to-One relationship (single FK)**
- **AT configured as single-record link**

#### Proforma (multilineText)

- Records: 31,898 | Null: 28,487 (89%)
- Length: min 2, max 64, avg 14
- Unique values: 3,093 (91%)
- **89% empty — rarely used field**

#### Payment Date (date)

- Records: 31,898 | Null: 18,273 (57%)
- Range: 0221-12-31 → 2026-03-06
- **57% null — rarely used**

#### Modified At (lastModifiedTime)

- Records: 31,898 | Null: 17,723 (56%)
- Range: 2019-12-04 → 2026-03-13
- **56% null — rarely used**

#### Issued By (singleSelect)

- Records: 31,898 | Null: 18,319 (57%)

| Choice | Records | % |
|--------|---------|---|
| Designer P | 13,119 | 97% |
| Designer Q | 436 | 3% |
| Direct | 24 | 0% |

#### Notes (richText)

- Records: 31,898 | Null: 31,892 (100%)
- Length: min 1, max 76, avg 35
- Unique values: 5 (83%)

| Value | Count |
|-------|-------|
|   | 2 |
| This was a top-up order outside our project for 1132 PLN  | 1 |
| To be done in early June  | 1 |
| Ordered over the weekend during 20% discount - no commission... | 1 |
| Reduced by customer's partial return of goods  | 1 |
- **Only 5 unique values across 31898 records — dictionary candidate**
- **100% empty — rarely used field**

#### Order Method (singleSelect)

- Records: 31,898 | Null: 52 (0%)

| Choice | Records | % |
|--------|---------|---|
| Shopping@Studio | 28,226 | 89% |
| Proforma | 3,604 | 11% |
| Studio Store | 11 | 0% |
| Direct | 5 | 0% |

#### Promo Email Sent (checkbox)

- Records: 31,898 | True: 34 (0%) | False: 31,864 (100%)
- **Only 0% checked — rarely used**

#### Field 43 (singleLineText)

- Records: 31,898 | Null: 31,898 (100%)
- Unique values: 0 (0%)
- **All values are empty**

---

## Table: Stores (137 records)

Created: 2019-02-22 → 2026-01-22

### Fields Overview (24 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Name | singleLineText | 0% | Primary field. Max length: 32 chars. 137 unique values |
| 2 | MainCompany | singleLineText | 6% | Max length: 32 chars. 128 unique values |
| 3 | Commission Rate | multilineText | 11% | Max length: 55 chars. 26 unique values |
| 4 | Partnership Type | singleSelect | 2% | 2 choices (2 actually used) |
| 5 | Commissions | linkedRecord → Commissions | 3% | Up to 4651 links → Many-to-Many |
| 6 | Delivery Cost | richText | 37% | Max length: 184 chars. 76 unique values |
| 7 | Delivery Time | richText | 41% | Max length: 232 chars. 75 unique values |
| 8 | Partnership Status | singleSelect | 1% | 3 choices (3 actually used) |
| 9 | Billing Method/Invoice | singleSelect | 18% | 3 choices (3 actually used) |
| 10 | Company | singleLineText | 23% | Max length: 63 chars. 103 unique values |
| 11 | Internal Notes | richText | 19% | **Max length: 918 chars**. 89 unique values |
| 12 | Bank Account | singleLineText | 32% | Max length: 33 chars. 93 unique values |
| 13 | Contract Sending Status | singleSelect | 51% | 2 choices (2 actually used) |
| 14 | Address | multilineText | 29% | Max length: 134 chars. 97 unique values |
| 15 | Order Method S@S | singleSelect | 34% | 7 choices (7 actually used) |
| 16 | NIP | singleLineText | 31% | Max length: 13 chars. 93 unique values |
| 17 | Offer Details | richText | 48% | Max length: 142 chars. 47 unique values |
| 18 | Offered Product Categories | multipleSelects | 37% | 36 choices (36 actually used) |
| 19 | Address on studio.com | url | 75% | Max length: 44 chars. 33 unique values |
| 20 | Manufacturer/Store URL | url | 38% | Max length: 192 chars. 84 unique values |
| 21 | Visible to External Designers | checkbox | 0% | 47% checked |
| 22 | Orders – Website | url | 85% | Max length: 100 chars. 21 unique values |
| 23 | Orders – Login Credentials | multilineText | 77% | **Max length: 294 chars**. 30 unique values |
| 24 | Store Products – Data | multilineText | 99% | **Max length: 264 chars**. Only 1 unique values — dictionary? |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Theoretical Commissions | rollup | currency | SQL aggregate / JOIN |
| Paid/To-Pay Commissions | rollup | currency | SQL aggregate / JOIN |
| Orders Value | rollup | currency | SQL aggregate / JOIN |
| Paid Orders | rollup | currency | SQL aggregate / JOIN |
| Paid Commissions % | formula | percent | App logic or generated column |
| Completed Orders % (by value) | formula | percent | App logic or generated column |
| Projects | rollup | number | SQL aggregate / JOIN |
| Average Order Value | formula | currency | App logic or generated column |
| Completed Orders | count | — | SQL COUNT or app logic |
| Avg Order Value for Completed | formula | currency | App logic or generated column |
| Website URL | formula | singleLineText | App logic or generated column |

### Field Details

#### Name (singleLineText)

- Records: 137 | Null: 0 (0%)
- Length: min 3, max 32, avg 9
- Unique values: 137 (100%)

#### MainCompany (singleLineText)

- Records: 137 | Null: 8 (6%)
- Length: min 3, max 32, avg 9
- Unique values: 128 (99%)

#### Commission Rate (multilineText)

- Records: 137 | Null: 15 (11%)
- Length: min 2, max 55, avg 4
- Unique values: 26 (21%)

| Value | Count |
|-------|-------|
| 20% | 40 |
| 10% | 17 |
| 15% | 13 |
| 30% | 10 |
| 25% | 9 |
| 5% | 3 |
| 25%  | 3 |
| 30%  | 3 |
| 35% | 3 |
| 20%  | 2 |

#### Partnership Type (singleSelect)

- Records: 137 | Null: 3 (2%)

| Choice | Records | % |
|--------|---------|---|
| Dropshipping | 76 | 57% |
| Reseller | 58 | 43% |

#### Commissions (multipleRecordLinks)

- Links to: Commissions (tbl94C771ANGtmgxz)
- Cardinality: 0 links: 4 (3%), 1 link: 14 (10%), 2+ links: 119 (87%)
- Max links per record: 4651
- **→ Many-to-Many relationship**
- **Records have up to 4651 links — Many-to-Many relationship**

#### Delivery Cost (richText)

- Records: 137 | Null: 51 (37%)
- Length: min 1, max 184, avg 43
- Unique values: 76 (88%)
- Longest value (truncated): "Cost given on proforma, depends on kilograms  (from 20 PLN (small table) - 350.00 PLN for larger orders; I see it on issued invoices, could not get more info from them) "

#### Delivery Time (richText)

- Records: 137 | Null: 56 (41%)
- Length: min 1, max 232, avg 43
- Unique values: 75 (93%)
- Longest value (truncated): "- with assembly - arranged individually by Partner Employee 2 (he contacts the customer directly and sets a convenient date) - shipping - usually within 5 business days but better to confirm (Partner Em..."

#### Partnership Status (singleSelect)

- Records: 137 | Null: 2 (1%)

| Choice | Records | % |
|--------|---------|---|
| Active | 85 | 63% |
| Suspended | 25 | 19% |
| Occasional | 25 | 19% |

#### Billing Method/Invoice (singleSelect)

- Records: 137 | Null: 25 (18%)

| Choice | Records | % |
|--------|---------|---|
| Monthly | 72 | 64% |
| Per Order | 38 | 34% |
| Commission-based | 2 | 2% |
- **Choice "Commission-based" used by only 2 record(s)**

#### Company (singleLineText)

- Records: 137 | Null: 32 (23%)
- Length: min 5, max 63, avg 24
- Unique values: 103 (98%)

#### Internal Notes (richText)

- Records: 137 | Null: 26 (19%)
- Length: min 8, max 918, avg 198
- Unique values: 89 (80%)
- Longest value (truncated): "- email order preceded by quote - we place order referring to the quote  - we state our value - we calculate amount after discount relative to quote (gross cost - 25% + surcharge) - ..."
- **Max length 918 chars — use text() instead of varchar()**

#### Bank Account (singleLineText)

- Records: 137 | Null: 44 (32%)
- Length: min 26, max 33, avg 32
- Unique values: 93 (100%)

#### Contract Sending Status (singleSelect)

- Records: 137 | Null: 70 (51%)

| Choice | Records | % |
|--------|---------|---|
| Signed | 59 | 88% |
| Sent | 8 | 12% |

#### Address (multilineText)

- Records: 137 | Null: 40 (29%)
- Length: min 22, max 134, avg 41
- Unique values: 97 (100%)
- Longest value (truncated): "123 Oak Street, Apt 1/1,  Smallville                                                      55-440 Bigtown                                      "

#### Order Method S@S (singleSelect)

- Records: 137 | Null: 46 (34%)

| Choice | Records | % |
|--------|---------|---|
| Email | 43 | 47% |
| Via Store | 20 | 22% |
| Email after quote | 12 | 13% |
| Via B2B Platform | 11 | 12% |
| customer discount code | 2 | 2% |
| order form | 2 | 2% |
| proforma | 1 | 1% |
- **Choice "customer discount code" used by only 2 record(s)**
- **Choice "order form" used by only 2 record(s)**
- **Choice "proforma" used by only 1 record(s)**

#### NIP (singleLineText)

- Records: 137 | Null: 43 (31%)
- Length: min 10, max 13, avg 10
- Unique values: 93 (99%)

#### Offer Details (richText)

- Records: 137 | Null: 66 (48%)
- Length: min 5, max 142, avg 23
- Unique values: 47 (66%)
- Longest value (truncated): "- braided cables/lamps - alternative to chandeliers from vendor-YD (you can order a chandelier with rubber cables there but it costs more than YD) "

#### Offered Product Categories (multipleSelects)

- Records: 137 | Null: 51 (37%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Beds | 23 | 27% |
| Desks | 20 | 23% |
| Shelving Units | 19 | 22% |
| Shelves | 19 | 22% |
| Dressers | 17 | 20% |
| Wardrobes | 17 | 20% |
| Decorations | 14 | 16% |
| Accessories | 13 | 15% |
| Poufs and Seating | 11 | 13% |
| Side Tables | 11 | 13% |
| Wallpapers | 11 | 13% |
| Lighting | 10 | 12% |
| Bunk Beds | 10 | 12% |
| Nightstands | 10 | 12% |
| Chairs Highchairs and Tables | 10 | 12% |
| Stickers | 9 | 10% |
| Lamps - Ceiling | 8 | 9% |
| Loft Beds | 8 | 9% |
| Storage Bins | 7 | 8% |
| Wall Panels | 7 | 8% |
| Lamps - Wall Sconces | 6 | 7% |
| Other | 6 | 7% |
| Extendable Beds | 6 | 7% |
| Trunks | 6 | 7% |
| Rugs | 5 | 6% |
| Upholstered Beds | 4 | 5% |
| Handles | 4 | 5% |
| Climbing Walls | 4 | 5% |
| Ladders and Accessories | 3 | 3% |
| Boards | 3 | 3% |
| Desk Chairs | 3 | 3% |
| Decorative Lights | 3 | 3% |
| Mattresses | 2 | 2% |
| Neon Signs | 1 | 1% |
| Custom Blinds | 1 | 1% |
| Flower Stands | 1 | 1% |
- **Choice "Mattresses" used by only 2 record(s)**
- **Choice "Neon Signs" used by only 1 record(s)**
- **Choice "Custom Blinds" used by only 1 record(s)**
- **Choice "Flower Stands" used by only 1 record(s)**

#### Address on studio.com (url)

- Records: 137 | Null: 103 (75%)
- Length: min 30, max 44, avg 34
- Unique values: 33 (97%)
- **75% empty — rarely used field**

#### Manufacturer/Store URL (url)

- Records: 137 | Null: 52 (38%)
- Length: min 16, max 192, avg 26
- Unique values: 84 (99%)
- Longest value (truncated): "https://www.vendor-moma.example.com/?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_term=search&gclid=CjwKCAjw0000000000000000000000000000000000000000000000000000000000000000000000"

#### Visible to External Designers (checkbox)

- Records: 137 | True: 65 (47%) | False: 72 (53%)

#### Orders – Website (url)

- Records: 137 | Null: 116 (85%)
- Length: min 8, max 100, avg 32
- Unique values: 21 (100%)

| Value | Count |
|-------|-------|
| https://vendor-1.example.com/ | 1 |
| https://b2b.vendor-2.example.com/login | 1 |
| https://vendor-3.example.com/my-account/ | 1 |
| https://vendor-4.example.com/ | 1 |
| https://b2b.vendor-5.example.com/shop/ | 1 |
| vendor-2.example.com | 1 |
| https://shop.vendor-6.example.com/ | 1 |
| https://www.vendor-7.example.com/ | 1 |
| https://mos.vendor-8.example.com/prod/ | 1 |
| www.vendor-9.example.com/b2b_system | 1 |
- **85% empty — rarely used field**

#### Orders – Login Credentials (multilineText)

- Records: 137 | Null: 106 (77%)
- Length: min 26, max 294, avg 50
- Unique values: 30 (97%)

| Value | Count |
|-------|-------|
| shopping@studio.com [password removed] | 2 |
| shopping@studio.com password: [removed] | 1 |
| https://vendor-portal.example.com/enterprise/XXXXXXX/b2b/in... | 1 |
| shopping@studio.com password: [removed] | 1 |
| Company: XXXXXXXXXX Employee: Partner Employee 1 Password: [removed] | 1 |
| shopping@studio.com [password removed] | 1 |
| shopping@studio.com password: [removed] | 1 |
| shopping@studio.com [password removed] | 1 |
| shopping@studio.com [password removed] | 1 |
| shopping@studio.com password: [removed] | 1 |
- Longest value (truncated): "https://vendor-portal.example.com/enterprise/XXXXXXX/b2b/index.php?client=[REDACTED]&p=3 - for projects  https://vendor-portal.example.com/enterprise/XXXXXXX..."
- **Max length 294 chars — use text() instead of varchar()**
- **77% empty — rarely used field**

#### Store Products – Data (multilineText)

- Records: 137 | Null: 136 (99%)
- Length: min 264, max 264, avg 264
- Unique values: 1 (100%)

| Value | Count |
|-------|-------|
| XML file: https://www.vendor-sk.example.com/wp-content/uploa... | 1 |
- Longest value (truncated): "XML file: https://www.vendor-sk.example.com/wp-content/uploads/woo-feed/google/xml/b2b-partner.xml and CSV file https://drive.google.com/file/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/view?usp=drive_link Stock levels..."
- **Only 1 unique values across 137 records — dictionary candidate**
- **Max length 264 chars — use text() instead of varchar()**
- **99% empty — rarely used field**

---

## Table: Service Packages (14 records)

Created: 2019-04-06 → 2023-03-22

### Fields Overview (3 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Name | singleLineText | 0% | Primary field. Max length: 19 chars. 14 unique values |
| 2 | Price | currency | 50% | All integers. Range: 199 – 2,949 |
| 3 | Customer Orders | linkedRecord → Customer Orders | 7% | Up to 775 links → Many-to-Many |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Sold Packages Value | rollup | — | SQL aggregate / JOIN |

### Field Details

#### Name (singleLineText)

- Records: 14 | Null: 0 (0%)
- Length: min 3, max 19, avg 9
- Unique values: 14 (100%)

| Value | Count |
|-------|-------|
| VIP | 1 |
| VIP_2019_09 | 1 |
| ONE | 1 |
| PREMIUM_OTHER_ROOMS | 1 |
| PREMIUM | 1 |
| PREMIUM_2018 | 1 |
| MINI | 1 |
| FIRST | 1 |
| other | 1 |
| EXPRESS_SURCHARGE | 1 |

#### Price (currency)

- Records: 14 | Null: 7 (50%)
- Min: 199 | Max: 2949 | Avg: 1720.57 | Median: 1599
- All integers: yes
- **All values are integers**

#### Customer Orders (multipleRecordLinks)

- Links to: Customer Orders (tblSdYmRLaON1TzPB)
- Cardinality: 0 links: 1 (7%), 1 link: 2 (14%), 2+ links: 11 (79%)
- Max links per record: 775
- **→ Many-to-Many relationship**
- **Records have up to 775 links — Many-to-Many relationship**

---

## Table: Contacts (276 records)

Created: 2020-09-11 → 2021-08-30

### Fields Overview (8 data fields)

| # | Field | AT Type | Null% | Notes |
|---|-------|---------|-------|-------|
| 1 | Status | singleSelect | 0% | 3 choices (3 actually used) |
| 2 | Notes | richText | 0% | **Max length: 970 chars**. 263 unique values |
| 3 | Contact Type | singleSelect | 7% | 3 choices (3 actually used) |
| 4 | Contact Date | date | 0% | 2020-09-01 → 2021-11-01 |
| 5 | Interiors | linkedRecord → Designed Interiors | 0% | Up to 4 links → Many-to-Many |
| 6 | Assigned To | multipleSelects | 0% | 2 choices (2 actually used) |
| 7 | Topics | multipleSelects | 38% | 6 choices (6 actually used) |
| 8 | Last Modified | lastModifiedTime | — | 2020-10-26 → 2021-09-23 |

### Computed Fields (skip during import)

| Field | AT Type | Result Type | Recreate As |
|-------|---------|-------------|-------------|
| Contact | formula | singleLineText | App logic or generated column |
| Customer | rollup | singleLineText | SQL aggregate / JOIN |
| Phone | rollup | singleLineText | SQL aggregate / JOIN |
| Email | rollup | singleLineText | SQL aggregate / JOIN |

### Field Details

#### Status (singleSelect)

- Records: 276 | Null: 0 (0%)

| Choice | Records | % |
|--------|---------|---|
| Done | 218 | 79% |
| In Progress (waiting) | 33 | 12% |
| To Do | 25 | 9% |

#### Notes (richText)

- Records: 276 | Null: 0 (0%)
- Length: min 19, max 970, avg 196
- Unique values: 263 (95%)
- Longest value (truncated): "FB review to monitor -- We're not asking again for reviews due to the problem below (after project delivery): **Designer A:** _dimensions of the hideout house were incorrectly stated by the manufacturer - ..."
- **Max length 970 chars — use text() instead of varchar()**

#### Contact Type (singleSelect)

- Records: 276 | Null: 19 (7%)

| Choice | Records | % |
|--------|---------|---|
| Phone ☎️ | 168 | 65% |
| Task ✅ | 67 | 26% |
| Email ✉️ | 22 | 9% |

#### Contact Date (date)

- Records: 276 | Null: 1 (0%)
- Range: 2020-09-01 → 2021-11-01

#### Interiors (multipleRecordLinks)

- Links to: Designed Interiors (tblSg3BjL0zjpw9jK)
- Cardinality: 0 links: 0 (0%), 1 link: 224 (81%), 2+ links: 52 (19%)
- Max links per record: 4
- **→ Many-to-Many relationship**
- **Records have up to 4 links — Many-to-Many relationship**

#### Assigned To (multipleSelects)

- Records: 276 | Null: 1 (0%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Designer N | 205 | 75% |
| Designer P | 70 | 25% |

#### Topics (multipleSelects)

- Records: 276 | Null: 105 (38%)
- Type: multipleSelects (array of choices per record)

| Choice | Records | % |
|--------|---------|---|
| Partnership Review | 80 | 47% |
| FB Review | 40 | 23% |
| Post-delivery – orders | 31 | 18% |
| Proforma Updates | 25 | 15% |
| Order Verification | 21 | 12% |
| Photo Request | 2 | 1% |
- **Choice "Photo Request" used by only 2 record(s)**

#### Last Modified (lastModifiedTime)

- Records: 276 | Null: 0 (0%)
- Range: 2020-10-26 → 2021-09-23

---

*Generated by [airtable-migration-audit](https://github.com/mperlak/airtable-migration-audit) — free, open-source Airtable migration analysis.*

*Ready to build what comes next? [Straktur](https://straktur.com?utm_source=airtable-migration-audit&utm_medium=report&utm_content=footer-cta) is a production-ready Next.js starter for internal tools.*
