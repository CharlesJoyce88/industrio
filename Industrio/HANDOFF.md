# industrio — session handoff (May 2026)

## Where we left off

**Goal:** populate the website with real GTA industrial comps from TRREB/Realm. User has 7 broker-full PDFs being emailed by Realm covering all 610 leased industrial deals across Peel/Toronto/York/Halton/Durham, lease-closed in 2026.

**Status:** 1 of 7 PDFs saved (`realm-pdfs/realm-page2.pdf`). The other 6 are still in the user's email or being generated.

**Blocked on:** the Linux shell environment that runs the PDF parser got stuck booting and never recovered this session. All other work is unblocked.

---

## What to do first in the new session

```
python import-realm-pdfs.py realm-pdfs/ --dry-run
```

Verify the parser extracts ~85 leased records from `realm-page2.pdf` with addresses, MLS#s, rent, DOM, full specs. Then drop the `--dry-run` and let it merge into `listings.json`.

If the dry-run looks bad, the parser is at `import-realm-pdfs.py` and the field mapping is at the bottom of `parse_listing_block()`. Realm uses label/value pairs in the printed PDF — labels like "Sold Price", "Contract Date", "PIN#", "Clear Height", "Truck Level Door No", "Volts", "Amps", "Industrial Area" etc.

---

## What's already built and ready

### Data pipeline
- `parse-emails.py` — broker email parser (CBRE, Colliers, Vanguard, etc.) tested against 4 sample .msg files. Currently extracts 10 records into `listings.json` under for_lease.
- `import-realm-pdfs.py` — Realm PDF parser. Aliases fields to map.js schema (sold_price → achieved_net_psf, sold_area_sf → size_sf, etc.) and geocodes every record against `buildings.json` by address match + nearest-neighbor fallback.

### Data already in listings.json
- 10 for_lease records (Vanguard 810-820 Flint + 102 Martin Ross, CBRE 112 Orfus, 7 Colliers units at 2140 Winston Park) — all geocoded
- 49 leased records (400-450 Matheson Blvd E rent roll)

### Captured aggregate stats — realm-aggregate-2026.json
Full GTA 2026 industrial-leased snapshot, captured directly from Realm's Statistics & Counts dialog:
- 610 total leased deals
- Median asking $18 / median achieved $18 / median TMI $6 / median DOM 74 days
- Peel 230, Toronto 161, York 142, Halton 41, Durham 36
- Top submarkets: Northeast 106, Concord 41, Milliken Mills West 34, West Humber-Clairville 26, Western Business Park 25, etc.

### Dashboards already built (using the aggregate)
1. **map.html** — `.market-stats-strip` at top of page, 6 cells
2. **market-intelligence.html** — `.mi-snapshot` panel with 5 headline tiles + region bars + community chips
3. **comps.html** — `.comps-dashboard` with two histograms (rent + DOM) + regional rent table
4. **realm-dashboard-preview.html** — single-file demo of all three, double-click to view

---

## What still needs to happen (in order)

1. **Run the parser on realm-page2.pdf** — first verify, then merge. Should yield ~85 leased records with full data.
2. **Verify map renders the new leased dots** — open map.html, console should show "[industrio] DONE: added 95 real comps" (49 existing + ~85 new + 10 for_lease - some overlap)
3. **Wire stats strip to actual filtered data** — currently hard-coded numbers in the strip. Add `stats.js` that recomputes median rent, median DOM, etc. from the filtered listings array and updates `#statTotal`, `#statRent`, `#statTmi`, `#statDom`, `#statPct` live.
4. **Per-listing comp-set in popups** — when user clicks a map dot, show "This deal: $X.XX vs submarket median $Y.YY (N comps, X-Y SF range)" in the popup. Requires per-listing data.
5. **Process the remaining 6 PDFs** — when user saves realm-page1.pdf through realm-page7.pdf, run the importer again. It dedupes by MLS#.
6. **iCloud / Gmail email pipeline** — user said Realm emails go to iCloud. Set up iCloud rule to forward `@realmmlp.ca` / `@matrix.proptx.ca` / `@proptx.ca` senders to a Gmail address. Then parse-emails.py can pick up daily digests automatically.

---

## Key files reference

| File | Purpose |
|------|---------|
| `listings.json` | All comp data — for_lease, leased, for_sale, sold buckets |
| `buildings.json` | 5,595 GTA buildings with lat/lng (FSA-centroid geocoded) |
| `map.html` + `map.js` | Map page — Leaflet + sidebar listing cards |
| `parse-emails.py` | Broker email parser (CBRE, Colliers, Vanguard) |
| `import-realm-pdfs.py` | Realm broker-full PDF parser |
| `realm-aggregate-2026.json` | GTA 2026 stats captured from Realm dialog |
| `lease-abstract-prompt.md` | AI prompt for lease PDF extraction |
| `realm-pdfs/` | Drop Realm PDFs here for import |
| `photos/realm/` | Per-MLS# photo storage (TODO when photo extraction works) |

---

## Known issues to watch for

- **OneDrive sync truncation** — map.html and parse-emails.py have been truncated/corrupted multiple times when edited via the file tools. After any edit, check file length matches expectations. If truncated, the fix is to use bash `cat >>` to append the tail back.
- **Browser-side PDF read** — Read tool can't pdftoppm a Realm PDF (security restriction). Must use the bash sandbox with pypdf.
- **Realm rate limiting** — the Print/Email feature took 30+ seconds per 100-listing batch. 7 batches were queued in sequence ~30 min apart. Don't re-queue if PDFs eventually arrive.

---

## Pending tasks (from the task list)

- #127: Vanguard image-only emails — download brochure PDF + extract specs (low priority)
- #134: Process 7 Realm PDFs when they arrive in Gmail (the main blocker right now)
- The 4-dashboard stats display work is done

---

## User's preferences captured this session

- Email account for ingestion: **iCloud Mail** (filters/rules go to icloud.com → Settings gear → Rules)
- Geographic scope: **Peel + Toronto + York + Halton + Durham**
- Property class: **Industrial only** — filter out residential at the iCloud rule level + parser safety check
- Tenant focus: **under 30,000 SF** (but the user requested all sizes for the Realm pull)
- Backend: Cloudflare Worker pattern (WORKER-DEPLOY.md describes this)

---

When resuming, the new session can just read this file and the realm-aggregate-2026.json and pick up the work. The most valuable single next action is running the parser on `realm-pdfs/realm-page2.pdf`.
