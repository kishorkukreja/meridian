# Data Masking Convention

## Principle
No real client names, system names, entity names, or employee names are stored in Supabase. All data is anonymized at the point of entry. The DNA Lead (you) maintains a local mental mapping or a separate offline reference.

## Masking Schemes

### Objects
Format: `OBJ-[MODULE_CODE]-[CATEGORY_CODE]-[NNN]`

| Module | Code |
|--------|------|
| Demand Planning | DP |
| Supply Planning | SP |

| Category | Code |
|----------|------|
| Master Data | MD |
| Drivers | DR |
| Priority 1 | P1 |
| Priority 2 | P2 |
| Priority 3 | P3 |

Examples:
- `OBJ-DP-MD-001` = First demand planning master data object
- `OBJ-SP-P2-003` = Third supply planning priority 2 object
- `OBJ-DP-DR-002` = Second demand planning driver object

The description field can contain functional context without real names:
- Good: "Product hierarchy mapping for beverage category"
- Bad: "Unilever product hierarchy for Lipton tea"

### Source Systems
Use the enum codes, not real system names:

| Masked Name | Real System (NOT stored) |
|-------------|------------------------|
| `erp_primary` | SAP SCC |
| `external_1` | Nielsen |
| `external_2` | IRI / RedMail |
| `data_lake` | Enterprise data lake |
| `sub_system` | Various sub-systems |
| `manual_file` | Excel/CSV uploads |

### People / Owners
Format: `[ROLE]-[TEAM_CODE]-[NN]`

| Role Prefix | Meaning |
|-------------|---------|
| LEAD | Team lead / manager |
| SME | Subject matter expert |
| ENG | Engineer / developer |
| BA | Business analyst |
| DS | Data steward |

| Team Code | Meaning |
|-----------|---------|
| DNA | Data & Analytics |
| MDS-DP | MDS team for Demand Planning |
| MDS-SP | MDS team for Supply Planning |
| ENB | Enablement / Data Ingestion |
| O9I | o9 Integration |
| BIZ-DP | Business users - Demand Planning |
| BIZ-SP | Business users - Supply Planning |

Examples:
- `LEAD-DNA-01` = DNA team lead (you)
- `SME-BIZ-DP-03` = Third demand planning business SME
- `ENG-ENB-02` = Second enablement team engineer

### Regions
Already masked in the enum: `region_eu`, `region_na`, etc.

### Issue Titles and Descriptions
Write in functional terms, never using real names:
- Good: "UOM mapping unclear for source ERP_PRIMARY table"
- Bad: "UOM mapping unclear in SAP SCC MARA table"
- Good: "Waiting for SME-BIZ-DP-01 to confirm driver definitions"
- Bad: "Waiting for John from Unilever to confirm driver definitions"

### Decisions
Same principle. Record the decision in functional language:
- Good: "Agreed to use hierarchy level 4 from ERP_PRIMARY as the base mapping"
- Bad: "Agreed to use SAP material group 4 from MARA"

## Local Reference (Optional)

If needed, maintain a local (offline, not in Supabase) mapping file on your laptop that translates masked codes to real names. This file never leaves your machine and is not part of the app.

Example: a simple CSV or note

```
OBJ-DP-MD-001 = Item Master
OBJ-DP-MD-002 = Customer Master
LEAD-DNA-01 = Kish
SME-BIZ-DP-01 = [real name]
```

## Auto-Suggest in the App

The app should auto-suggest the next available code when creating objects or entering owner aliases. For example, if `OBJ-DP-MD-001` through `OBJ-DP-MD-005` exist, the next suggestion is `OBJ-DP-MD-006`.

This is a convenience feature, not a strict enforcement. The user can override the suggestion.
