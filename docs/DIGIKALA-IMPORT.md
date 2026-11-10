# Digikala refrigerator catalog import

The import adds 200 source-verified refrigerator listings to the configured MongoDB database. It preserves existing products and skips previously imported SKUs. It uses the existing product and brand services, including image-reference handling; no application routes or dependencies are added.

Run from the repository root:

```powershell
npx tsx --conditions=react-server --env-file=.env.local scripts/import-digikala-refrigerators.ts --collect
npx tsx --conditions=react-server --env-file=.env.local scripts/import-digikala-refrigerators.ts
npx tsx --conditions=react-server --env-file=.env.local scripts/import-digikala-refrigerators.ts --apply
```

Collection and database writes are separate operations. The second command previews the database name, additions, existing records and categories. `--apply` creates a timestamped local backup of products, brands and categories before adding records. Keep image cleanup stopped while importing, as required by AGENTS.md for database maintenance.

Source responses, normalized data, backups and created-record identifiers are stored under the ignored `tmp/digikala-refrigerators/` directory. Preserve that directory if the collected catalog must be moved to another environment; source data and backups are intentionally excluded from Git. Each detail response is validated with Zod. Listings without a supported category, valid title, image or positive price are skipped. Collection requires 200 valid records before writing the final snapshot.

Digikala API prices are converted from rials to integer tomans. These are observed source prices, not an approved LaunchoX pricing schedule. Products are active with **zero stock**, so they can be reviewed in the storefront without claiming inventory. No seller inventory, warranty, reviews or sales counts are imported. Descriptions are assembled from factual specifications rather than copied editorial reviews. Original specification names are preserved, with aliases for existing capacity and energy filters. Images use the original external CDN URLs, up to eight per product; remote availability remains controlled by the source.

Products use `DKP-<source ID>` SKUs and `digikala-<source ID>` slugs. Their specifications include the original product URL. Existing brand identities are reused by normalized name; missing brands are created through the existing service. A repeat import skips existing products and does not refresh their price, stock or content. A failed run can be resumed after resolving its error; successfully created records retain their identity and are skipped.

## Completed local import

On 2026-11-10, the import added 200 products from 34 source brand labels to `launchox_local`. The existing 24 products were verified unchanged, resulting in 224 total products. This operation did not publish data to a production server.

| Category | Added |
| --- | ---: |
| Twin refrigerator/freezer | 42 |
| Bottom freezer | 47 |
| Side by side | 44 |
| Top freezer | 24 |
| French door / four door | 5 |
| Hotel / mini | 23 |
| Other combination refrigerator/freezer | 15 |

Five candidate listings exceeded the existing 150-character title limit and were replaced with other validated listings. Source responses and import receipts are available in the local artifact directory above.
