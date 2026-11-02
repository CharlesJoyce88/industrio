#!/usr/bin/env python3
"""
import-realm-pdfs.py — parse Realm "Broker Full" report PDFs into listings.json.

Usage:
    python import-realm-pdfs.py realm-pdfs/
    python import-realm-pdfs.py realm-pdfs/ --dry-run
    python import-realm-pdfs.py realm-pdfs/page1.pdf --dry-run

Realm's print export uses a fixed broker-full layout per listing:
each listing block contains:
    - ADDRESS, MLS#  (header)
    - photos (1 hero + thumbnails)
    - LISTING INFO key-value table (List, Sold Price, Contract Date, Expiry,
      Sold Date, Closing Date, Taxes, Tax Year, PIN#, ARN#, Landlord,
      Use, Price Code, Category, Sold Area, Min/Max Rental Term,
      Commission Co-Op, Holdover, Legal Description, Possession,
      Occupancy, etc.)
    - PROPERTY INFO key-value table (Lot Size, Cross St, A/C, Zoning,
      Heating, Water, Sewers, Clear Height, Sprinklers, Freestanding,
      Rail, Office Apt Area, Industrial Area, TL Doors, GL Doors, DI
      Doors, Volts, Amps, Parking, Washrooms, Garage, etc.)
    - Client Remarks
    - Contact Details (broker, brokerage, phone)

Output: appends to listings.json under 'leased' bucket with full schema.
"""
import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime

try:
    from pypdf import PdfReader
except ImportError:
    print("Install pypdf first: pip install pypdf --break-system-packages")
    sys.exit(1)


# Regex anchors for finding listing boundaries in the PDF text.
# Each listing block starts with a property-name header followed by an MLS#.
MLS_RX = re.compile(r'\b([WENC]\d{8})\b')
ADDR_RX = re.compile(
    r'(\d{2,5}(?:[-–]\d{2,5})?\s+[A-Z][A-Za-z0-9\s\.\-/]+?\s+'
    r'(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Court|Crt|Crescent|Cres|Place|Pl|Circle|Cir|Lane|Ln|Parkway|Pkwy|Highway|Hwy|Trail|Ct))',
    re.I
)

# Field labels we care about (Realm broker-full report)
FIELDS = {
    # Pricing & dates
    'List': 'list_psf',
    'Original List': 'original_list_psf',
    'Sold Price': 'sold_price',
    'Contract Date': 'contract_date',
    'Expiry Date': 'expiry_date',
    'Sold Date': 'sold_date',
    'Closing Date': 'closing_date',
    'Last Update': 'last_update',
    'Days On Market': 'dom',
    'DOM': 'dom',
    'Taxes': 'taxes',
    'Tax Year': 'tax_year',
    # Identification
    'PIN#': 'pin',
    'ARN#': 'arn',
    'Seller/Landlord Name': 'landlord_name',
    'Legal Description': 'legal_description',
    # Lease terms
    'Use': 'use',
    'Price Code': 'price_code',
    'Category': 'category',
    'Sold Area': 'sold_area_sf',
    'Total Area': 'total_area_sf',
    'Minimum Rental Term': 'min_rental_term_months',
    'Maximum Rental Term': 'max_rental_term_months',
    'Commission Co-Op Brokerage': 'commission_coop',
    'Holdover': 'holdover_days',
    'Possession Remarks': 'possession_remarks',
    'Possession Type': 'possession_type',
    'Occupancy': 'occupancy',
    # Property
    'Lot Size': 'lot_size',
    'Lot Code': 'lot_code',
    'Dir/Cross St': 'cross_streets',
    'Directions': 'directions',
    'A/C': 'ac',
    'Zoning': 'zoning',
    'Heating Type': 'heating',
    'Water': 'water',
    'Sewers': 'sewers',
    'Clear Height': 'clear_ft',
    'Sprinklers': 'sprinklers',
    'Freestanding': 'freestanding',
    'Rail': 'rail',
    'Office Apt Area': 'office_pct',
    'Industrial Area': 'industrial_pct',
    'Truck Level Door No': 'docks_total',
    'Grade Level Door No': 'gl_doors_total',
    'Drive-In Level Door No': 'drive_in_total',
    'Double Door No': 'double_door_total',
    'Volts': 'volts',
    'Amps': 'amps',
    'Parking Spaces': 'parking_spaces',
    'Washrooms': 'washrooms',
    'Garage Type': 'garage_type',
    # Geography
    'Area': 'area',
    'Municipality': 'city',
    'Community': 'community',
    'Apt/Unit': 'unit',
    # Status
    'Status': 'status_code',
}


def extract_pdf_text(path):
    """Read all pages and return concatenated text."""
    reader = PdfReader(path)
    pages = []
    for p in reader.pages:
        try:
            pages.append(p.extract_text() or '')
        except Exception:
            pages.append('')
    return '\n'.join(pages)


def split_into_listings(text):
    """Each listing starts with an MLS# in a known position. Split blocks."""
    # Find all MLS# positions and split text between them
    positions = []
    for m in MLS_RX.finditer(text):
        positions.append((m.start(), m.group(1)))
    blocks = []
    for i, (pos, mls) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        block = text[max(0, pos - 200):end]  # capture some preceding context for address
        blocks.append({'mls': mls, 'text': block})
    # Dedupe — MLS# may appear multiple times per listing (header + table)
    seen = {}
    for b in blocks:
        if b['mls'] not in seen or len(b['text']) > len(seen[b['mls']]['text']):
            seen[b['mls']] = b
    return list(seen.values())


def parse_listing_block(block):
    """Extract structured fields from a single listing's text block."""
    text = block['text']
    record = {'mls': block['mls'], 'source': 'realm_pdf', 'extracted_at': datetime.utcnow().isoformat() + 'Z'}

    # Address — usually appears near the start
    addr_match = ADDR_RX.search(text[:1000])
    if addr_match:
        record['address'] = addr_match.group(1).strip()

    # Each labeled field — pattern: "Label\nValue" or "Label  Value"
    for label, key in FIELDS.items():
        # Try a few patterns
        for pat in [
            rf'{re.escape(label)}\s*\n\s*([^\n]+)',
            rf'{re.escape(label)}\s*[:\t]?\s+([^\n]+)',
        ]:
            m = re.search(pat, text)
            if m:
                value = m.group(1).strip()
                # Stop at a known next-label tail (heuristic)
                value = re.split(r'\s{2,}|\t', value)[0].strip()
                if value and value != label:
                    record[key] = value
                    break

    # Numeric coercion for known integer/float fields
    int_fields = ['dom', 'sold_area_sf', 'total_area_sf', 'min_rental_term_months',
                  'max_rental_term_months', 'holdover_days', 'docks_total',
                  'gl_doors_total', 'drive_in_total', 'double_door_total',
                  'parking_spaces', 'washrooms', 'volts', 'amps']
    for f in int_fields:
        if f in record:
            m = re.search(r'(\d+)', record[f])
            if m: record[f] = int(m.group(1))
    float_fields = ['list_psf', 'original_list_psf', 'sold_price', 'office_pct', 'industrial_pct']
    for f in float_fields:
        if f in record:
            m = re.search(r'(\d+(?:\.\d+)?)', record[f].replace('$', '').replace(',', ''))
            if m: record[f] = float(m.group(1))
    if 'clear_ft' in record:
        m = re.search(r'(\d+)', record['clear_ft'])
        if m: record['clear_ft'] = int(m.group(1))

    record['status'] = 'leased'  # All in this batch are leased

    # ----------------------------------------------------------------
    # Field aliasing — map.js + comps.js expect this canonical schema
    # ----------------------------------------------------------------
    if 'sold_price' in record and 'achieved_net_psf' not in record:
        record['achieved_net_psf'] = record['sold_price']
    if 'list_psf' in record and 'net_rent_psf' not in record:
        record['net_rent_psf'] = record['list_psf']
    if 'sold_area_sf' in record and 'size_sf' not in record:
        record['size_sf'] = record['sold_area_sf']
    if 'total_area_sf' in record and 'size_sf' not in record:
        record['size_sf'] = record['total_area_sf']
    if 'docks_total' in record and 'docks' not in record:
        record['docks'] = record['docks_total']
    if 'drive_in_total' in record and 'drive_in' not in record:
        record['drive_in'] = record['drive_in_total']
    if 'parking_spaces' in record and 'parking_per_1k' not in record and record.get('size_sf'):
        # Approximate parking per 1k SF
        record['parking_per_1k'] = round(record['parking_spaces'] / (record['size_sf'] / 1000), 2)
    if 'industrial_pct' in record and 'warehouse_pct' not in record:
        record['warehouse_pct'] = record['industrial_pct']
    if 'amps' in record and 'power_amps' not in record:
        record['power_amps'] = record['amps']
    if 'taxes' in record and 'additional_rent_psf' not in record:
        # Realm reports TMI as e.g. "$4.85 (2026) T.M.I." — extract first number
        m = re.search(r'(\d+(?:\.\d+)?)', str(record['taxes']).replace(',', ''))
        if m: record['additional_rent_psf'] = float(m.group(1))
    if 'sold_date' in record and 'close_date' not in record:
        record['close_date'] = record['sold_date']
    if 'contract_date' in record and 'list_date' not in record:
        record['list_date'] = record['contract_date']
    if 'landlord_name' in record and 'landlord' not in record:
        record['landlord'] = record['landlord_name']

    return record


def normalize_street_name(addr):
    """Lower, drop suffixes variants, drop leading number — for buildings.json matching."""
    if not addr: return ''
    s = addr.lower().strip()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\bavenue\b', 'ave', s)
    s = re.sub(r'\bstreet\b', 'st', s)
    s = re.sub(r'\bboulevard\b', 'blvd', s)
    s = re.sub(r'\bdrive\b', 'dr', s)
    s = re.sub(r'\broad\b', 'rd', s)
    s = re.sub(r'\bhighway\b', 'hwy', s)
    s = re.sub(r'\bparkway\b', 'pkwy', s)
    s = re.sub(r'[.,]', '', s).strip()
    s = re.sub(r'^\d+(?:-\d+)?\s+', '', s)  # drop leading number
    return s


def first_street_num(addr):
    if not addr: return None
    m = re.match(r'(\d+)', str(addr).strip())
    return int(m.group(1)) if m else None


def geocode_records(records, buildings_path):
    """Inject lat/lng + building_id into each record by matching against buildings.json.
    Falls back to nearest-neighbor on same street if no exact match."""
    if not os.path.exists(buildings_path):
        print(f'  ! buildings.json not found at {buildings_path}; skipping geocoding')
        return 0, 0
    with open(buildings_path) as f:
        b = json.load(f)
    buildings = b.get('buildings', [])
    exact = 0
    neighbor = 0
    for rec in records:
        addr = rec.get('address') or ''
        if not addr: continue
        rec_street = normalize_street_name(addr)
        rec_num = first_street_num(addr)
        if not rec_street or not rec_num: continue
        # Phase 1: exact street + number match
        match = None
        for bld in buildings:
            bld_addr = bld.get('address') or ''
            if first_street_num(bld_addr) == rec_num and normalize_street_name(bld_addr) == rec_street:
                match = bld; break
        if match:
            rec['lat'] = match['lat']; rec['lng'] = match['lng']
            rec['building_id'] = match['building_id']
            rec['geocode_method'] = 'exact'
            exact += 1
            continue
        # Phase 2: nearest neighbor on same street
        candidates = []
        for bld in buildings:
            if normalize_street_name(bld.get('address') or '') == rec_street:
                bn = first_street_num(bld.get('address'))
                if bn is not None and bld.get('lat') and bld.get('lng'):
                    candidates.append((abs(bn - rec_num), bld))
        if candidates:
            candidates.sort(key=lambda x: x[0])
            best = candidates[0][1]
            rec['lat'] = best['lat']; rec['lng'] = best['lng']
            rec['geocode_method'] = 'street-neighbor'
            rec['geocode_neighbor'] = best['address']
            neighbor += 1
    return exact, neighbor


def merge_into_listings(records, listings_path, dry_run=False):
    if dry_run:
        print(f'\n=== DRY RUN — {len(records)} records extracted ===')
        for r in records[:5]:
            print(json.dumps(r, indent=2, default=str)[:600])
        return 0, 0
    if os.path.exists(listings_path):
        with open(listings_path) as f:
            data = json.load(f)
    else:
        data = {'meta': {}, 'leased': [], 'for_lease': [], 'for_sale': [], 'sold': []}
    leased = data.setdefault('leased', [])
    existing_ids = {r.get('mls'): r for r in leased if r.get('mls')}
    added = updated = 0
    for rec in records:
        rec_id = f"realm-{rec['mls']}"
        rec['id'] = rec_id
        existing = existing_ids.get(rec['mls'])
        if existing:
            for k, v in rec.items():
                if v is not None and v != '': existing[k] = v
            updated += 1
        else:
            leased.append(rec)
            added += 1
    data['meta']['last_realm_pdf_import'] = datetime.utcnow().isoformat() + 'Z'
    with open(listings_path, 'w') as f:
        json.dump(data, f, indent=2)
    return added, updated


def main():
    p = argparse.ArgumentParser(description='Parse Realm broker-full PDFs into listings.json')
    p.add_argument('source', help='PDF file or folder of PDFs')
    p.add_argument('--listings', default='listings.json')
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    if os.path.isdir(args.source):
        files = sorted(glob.glob(os.path.join(args.source, '*.pdf')))
    else:
        files = [args.source]
    if not files:
        print(f'No PDFs found at {args.source}')
        sys.exit(1)
    print(f'Parsing {len(files)} PDF(s)...')
    all_records = []
    for f in files:
        print(f'  {f}...')
        text = extract_pdf_text(f)
        blocks = split_into_listings(text)
        records = [parse_listing_block(b) for b in blocks]
        records = [r for r in records if r.get('mls')]
        print(f'    -> {len(records)} listings')
        all_records.extend(records)
    print(f'\nTotal: {len(all_records)} listings extracted')

    # Geocode every record so the map can render dots
    print('Geocoding against buildings.json...')
    buildings_path = os.path.join(os.path.dirname(args.listings) or '.', 'buildings.json')
    exact, neighbor = geocode_records(all_records, buildings_path)
    geocoded = sum(1 for r in all_records if r.get('lat'))
    print(f'  {exact} exact match + {neighbor} street-neighbor = {geocoded}/{len(all_records)} geocoded')

    added, updated = merge_into_listings(all_records, args.listings, dry_run=args.dry_run)
    if not args.dry_run:
        print(f'Wrote {added} new + {updated} updated leased records to {args.listings}')


if __name__ == '__main__':
    main()
