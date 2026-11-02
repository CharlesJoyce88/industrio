#!/usr/bin/env python3
"""
update-buildings.py
===================

Smart re-import of the master building inventory spreadsheet.

Run this every time you change anything in MASTER_Small-Mid Bay Research.xlsx.
The script:

  1. Parses the spreadsheet (~2 seconds).
  2. Merges with the existing buildings.json:
       - For buildings whose ID already exists, KEEPS their lat/lng and
         geocode_method (so a 93-minute Nominatim run isn't wasted).
       - For new building IDs, leaves lat/lng = null (or fills with the
         city-centroid approximation, see --approx).
       - For buildings whose address changed, clears lat/lng so they'll
         get re-geocoded next time you run geocode-buildings.py --resume.
  3. Recomputes submarket rollups (vacancy %, average rent, totals).
  4. Writes buildings.json back.
  5. Optionally calls geocode-buildings.py --resume to immediately
     geocode any new/changed addresses (--geocode flag).

Usage
-----

    # Just re-import (preserves all existing lat/lng)
    python update-buildings.py "MASTER_Small-Mid Bay Research.xlsx"

    # Re-import AND fill in approximate city-centroid coords for new buildings
    python update-buildings.py "MASTER_Small-Mid Bay Research.xlsx" --approx

    # Re-import AND immediately geocode new/changed addresses via Nominatim
    python update-buildings.py "MASTER_Small-Mid Bay Research.xlsx" --geocode

    # Specify a different output path for testing
    python update-buildings.py "..." --out buildings_test.json

The script is idempotent: running it twice on the same spreadsheet is a no-op.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, date

try:
    from openpyxl import load_workbook
except ImportError:
    print("ERROR: openpyxl is required. Install it with:")
    print("    pip install openpyxl")
    sys.exit(1)

# Header row + column positions in the master sheet (1-indexed)
SHEET_NAME = "KPIs and Consol. Small Bay List"
HEADER_ROW = 4
DATA_START = 5
COLS = {
    "address":         16,
    "submarket":       17,
    "city":            18,
    "postal_code":     19,
    "owner":           20,
    "true_owner":      21,
    "owner_type":      22,
    "acres":           23,
    "status":          24,
    "year_built":      25,
    "stories":         26,
    "tenancy":         27,
    "gla":             28,
    "num_units":       29,
    "avg_unit_sf":     30,
    "avg_rent":        31,
    "available_sf":    32,
    "vacancy_pct":     33,
    "docks":           34,
    "drive_in":        35,
    "clear_ft":        36,
    "parking_ratio":   37,
    "last_sale_date":  38,
    "last_sale_price": 39,
}

CITY_CENTROIDS = {
    "Mississauga":       (43.6200, -79.6600, 0.040, 0.080),
    "Vaughan":           (43.8000, -79.5500, 0.045, 0.075),
    "North York":        (43.7600, -79.4600, 0.030, 0.075),
    "Scarborough":       (43.7800, -79.2700, 0.045, 0.075),
    "Etobicoke":         (43.6500, -79.5500, 0.035, 0.070),
    "Markham":           (43.8500, -79.3500, 0.035, 0.075),
    "Brampton":          (43.7100, -79.7400, 0.045, 0.090),
    "Oakville":          (43.4600, -79.7000, 0.030, 0.070),
    "Richmond Hill":     (43.8700, -79.4200, 0.030, 0.050),
    "Toronto and York":  (43.6600, -79.4200, 0.035, 0.075),
    "Unknown":           (43.7000, -79.5500, 0.050, 0.100),
}

# ---------- helpers ----------

def parse_clear(s):
    if s is None: return None
    m = re.search(r"(\d+)'", str(s))
    if m: return int(m.group(1))
    try: return float(s)
    except (ValueError, TypeError): return None

def parse_doors(s):
    if s is None: return None
    m = re.search(r"^\s*(\d+)\s*[/x]", str(s))
    if m: return int(m.group(1))
    try: return int(float(s))
    except (ValueError, TypeError): return None

def to_int(v):
    if v is None or v == "": return None
    try: return int(float(v))
    except (ValueError, TypeError): return None

def to_float(v):
    if v is None or v == "": return None
    try: return float(v)
    except (ValueError, TypeError): return None

def to_date_str(v):
    if v is None: return None
    if isinstance(v, datetime): return v.date().isoformat()
    if isinstance(v, date):     return v.isoformat()
    return str(v)

def slug_id(addr, city):
    raw = f"{city}-{addr}".lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw).strip("-")
    return raw[:80]

def jitter(seed, scale):
    h = hashlib.sha1(seed.encode("utf-8")).digest()
    n = int.from_bytes(h[:4], "big")
    return ((n / 0xFFFFFFFF) * 2 - 1) * scale

def approx_coords(b):
    city = b.get("city") or "Unknown"
    centroid = CITY_CENTROIDS.get(city) or CITY_CENTROIDS["Unknown"]
    lat0, lng0, dlat, dlng = centroid
    return (
        round(lat0 + jitter(b["building_id"] + ":lat", dlat), 6),
        round(lng0 + jitter(b["building_id"] + ":lng", dlng), 6),
    )

def get_str(s, r, c):
    v = s.cell(r, c).value
    if v is None: return None
    v = str(v).strip()
    return v or None

# ---------- main parse ----------

def parse_excel(path):
    wb = load_workbook(path, data_only=True)
    if SHEET_NAME not in wb.sheetnames:
        raise SystemExit(f"Sheet '{SHEET_NAME}' not found. Available: {wb.sheetnames}")
    s = wb[SHEET_NAME]
    out = []
    seen = set()
    for r in range(DATA_START, s.max_row + 1):
        addr = get_str(s, r, COLS["address"])
        if not addr: continue
        city = get_str(s, r, COLS["city"]) or ""
        bid  = slug_id(addr, city)
        if bid in seen: continue
        seen.add(bid)
        out.append({
            "building_id":             bid,
            "address":                 addr,
            "submarket":               get_str(s, r, COLS["submarket"]),
            "city":                    city or None,
            "postal_code":             get_str(s, r, COLS["postal_code"]),
            "owner":                   get_str(s, r, COLS["owner"]),
            "true_owner":              get_str(s, r, COLS["true_owner"]),
            "owner_type":              get_str(s, r, COLS["owner_type"]),
            "acres":                   to_float(s.cell(r, COLS["acres"]).value),
            "status":                  get_str(s, r, COLS["status"]),
            "year_built":              to_int(s.cell(r, COLS["year_built"]).value),
            "stories":                 to_int(s.cell(r, COLS["stories"]).value),
            "tenancy":                 get_str(s, r, COLS["tenancy"]),
            "total_rentable_sf":       to_int(s.cell(r, COLS["gla"]).value),
            "num_units":               to_int(s.cell(r, COLS["num_units"]).value),
            "avg_unit_sf":             to_int(s.cell(r, COLS["avg_unit_sf"]).value),
            "avg_weighted_rent_psf":   to_float(s.cell(r, COLS["avg_rent"]).value),
            "available_sf":            to_int(s.cell(r, COLS["available_sf"]).value),
            "vacancy_pct":             to_float(s.cell(r, COLS["vacancy_pct"]).value),
            "docks_total":             parse_doors(s.cell(r, COLS["docks"]).value),
            "drive_in_total":          parse_doors(s.cell(r, COLS["drive_in"]).value),
            "clear_ft":                parse_clear(s.cell(r, COLS["clear_ft"]).value),
            "parking_ratio":           str(s.cell(r, COLS["parking_ratio"]).value) if s.cell(r, COLS["parking_ratio"]).value else None,
            "last_sale_date":          to_date_str(s.cell(r, COLS["last_sale_date"]).value),
            "last_sale_price":         to_int(s.cell(r, COLS["last_sale_price"]).value),
            "lat":                     None,
            "lng":                     None,
            "geocode_method":          None,
        })
    return out

def submarket_rollups(buildings):
    from collections import defaultdict
    agg = defaultdict(lambda: {"c":0,"sf":0,"av":0,"rw":0,"rd":0})
    for b in buildings:
        k = b.get("submarket") or "Unknown"
        agg[k]["c"]  += 1
        if b.get("total_rentable_sf"): agg[k]["sf"] += b["total_rentable_sf"]
        if b.get("available_sf"):       agg[k]["av"] += b["available_sf"]
        if b.get("avg_weighted_rent_psf") and b.get("total_rentable_sf"):
            agg[k]["rw"] += b["avg_weighted_rent_psf"] * b["total_rentable_sf"]
            agg[k]["rd"] += b["total_rentable_sf"]
    rows = []
    for k, v in agg.items():
        rows.append({
            "submarket":               k,
            "building_count":          v["c"],
            "total_rentable_sf":       v["sf"],
            "total_available_sf":      v["av"],
            "vacancy_pct":             round(v["av"] / v["sf"], 4) if v["sf"] else None,
            "avg_weighted_rent_psf":   round(v["rw"] / v["rd"], 2) if v["rd"] else None,
        })
    rows.sort(key=lambda r: -r["total_rentable_sf"])
    return rows

# ---------- merge ----------

ADDR_KEY_FIELDS = ("address", "city", "postal_code")

def addr_fingerprint(b):
    return tuple((b.get(k) or "").strip().lower() for k in ADDR_KEY_FIELDS)

def merge(new_list, old_list):
    """
    Returns (merged_list, stats_dict)
    Strategy:
      - Index old by building_id and by address fingerprint
      - For each new building:
          * If old has same building_id AND same address fingerprint  → carry lat/lng/geocode_method
          * Otherwise → leave coords null (will be picked up by --approx or --geocode)
      - Old buildings not in new are dropped (the spreadsheet is the source of truth)
    """
    old_by_id = {b["building_id"]: b for b in old_list if b.get("building_id")}
    stats = {"total":0, "carried_coords":0, "new":0, "address_changed":0, "missing_coords":0, "dropped":0}
    seen_ids = set()
    merged = []
    for nb in new_list:
        stats["total"] += 1
        bid = nb["building_id"]
        seen_ids.add(bid)
        ob = old_by_id.get(bid)
        if ob and addr_fingerprint(ob) == addr_fingerprint(nb) and isinstance(ob.get("lat"), (int, float)):
            nb["lat"] = ob["lat"]
            nb["lng"] = ob["lng"]
            nb["geocode_method"] = ob.get("geocode_method")
            stats["carried_coords"] += 1
        elif ob and addr_fingerprint(ob) != addr_fingerprint(nb):
            stats["address_changed"] += 1
            stats["missing_coords"] += 1
        else:
            stats["new"] += 1
            stats["missing_coords"] += 1
        merged.append(nb)
    for bid in old_by_id:
        if bid not in seen_ids:
            stats["dropped"] += 1
    return merged, stats

# ---------- main ----------

def main():
    p = argparse.ArgumentParser(description="Smart re-import of the master building spreadsheet.")
    p.add_argument("excel", help="Path to MASTER_Small-Mid Bay Research.xlsx (or whatever you renamed it)")
    p.add_argument("--out", default="buildings.json", help="Output JSON path (default: buildings.json)")
    p.add_argument("--approx", action="store_true",
                   help="Fill new buildings with city-centroid approximate coords (~±3 km)")
    p.add_argument("--geocode", action="store_true",
                   help="After merging, immediately call geocode-buildings.py --resume to fetch precise coords for new/changed addresses")
    p.add_argument("--provider", choices=["nominatim", "google"], default="nominatim",
                   help="Used with --geocode (default: nominatim)")
    args = p.parse_args()

    if not os.path.exists(args.excel):
        print(f"ERROR: file not found: {args.excel}")
        sys.exit(1)

    # Step 1: parse Excel
    print(f"[1/4] Parsing {args.excel} ...")
    new_buildings = parse_excel(args.excel)
    print(f"      Found {len(new_buildings)} buildings.")

    # Step 2: load existing buildings.json (if any) and merge
    print(f"[2/4] Merging with existing {args.out} ...")
    old = []
    if os.path.exists(args.out):
        try:
            with open(args.out, "r", encoding="utf-8") as f:
                old_doc = json.load(f)
            old = old_doc.get("buildings", [])
        except Exception as e:
            print(f"      WARN: couldn't read existing file ({e}); treating as fresh import.")
    merged, stats = merge(new_buildings, old)
    print(f"      Carried coords from previous run: {stats['carried_coords']}")
    print(f"      New buildings (need geocoding):   {stats['new']}")
    print(f"      Addresses changed (need re-geo):  {stats['address_changed']}")
    print(f"      Buildings dropped (not in sheet): {stats['dropped']}")

    # Step 3: optional approx fill
    if args.approx:
        print(f"[3/4] Filling missing coords with city-centroid approximation ...")
        filled = 0
        for b in merged:
            if not isinstance(b.get("lat"), (int, float)):
                b["lat"], b["lng"] = approx_coords(b)
                b["geocode_method"] = "city-centroid-approx"
                filled += 1
        print(f"      Approximated coords for {filled} buildings.")
    else:
        print(f"[3/4] Skipping approx fill (use --approx to enable).")

    # Persist (always, even if --geocode is requested)
    out_doc = {
        "meta": {
            "source": os.path.basename(args.excel),
            "last_updated": date.today().isoformat(),
            "count": len(merged),
            "carried_coords": stats["carried_coords"],
            "new_buildings": stats["new"],
            "note": "Building-level inventory layer. Listings reference these via building_id.",
        },
        "submarket_stats": submarket_rollups(merged),
        "buildings":       merged,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out_doc, f, separators=(",", ":"))
    sz_kb = os.path.getsize(args.out) / 1024
    print(f"      Wrote {args.out} ({sz_kb:.1f} KB).")

    # Step 4: optional immediate geocode of new/changed addresses
    if args.geocode and stats["missing_coords"] > 0:
        print(f"[4/4] Running geocode-buildings.py --resume --provider {args.provider} ...")
        try:
            subprocess.run(
                [sys.executable, "geocode-buildings.py", "--provider", args.provider, "--resume"],
                check=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"      Geocoding subprocess failed: {e}")
            sys.exit(1)
    else:
        if stats["missing_coords"] == 0:
            print(f"[4/4] No buildings need geocoding. Done.")
        else:
            print(f"[4/4] {stats['missing_coords']} buildings have no coords yet.")
            print(f"      To geocode them now:  python geocode-buildings.py --provider nominatim --resume")
            print(f"      Or to fake-fill them: python update-buildings.py {args.excel} --approx")

    print()
    print("SUMMARY")
    print(f"  Total buildings : {len(merged)}")
    print(f"  Submarkets      : {len(out_doc['submarket_stats'])}")
    total_sf = sum(b.get('total_rentable_sf') or 0 for b in merged)
    print(f"  Total inventory : {total_sf:,} SF")
    geo_done = sum(1 for b in merged if isinstance(b.get('lat'), (int, float)))
    print(f"  Geocoded (any)  : {geo_done}/{len(merged)}")

if __name__ == "__main__":
    main()
