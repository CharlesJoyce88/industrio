#!/usr/bin/env python3
"""
parse-emails.py — industrio email-listing parser.
Reads broker .msg/.eml files, classifies source, extracts listing data,
merges into listings.json.
"""
import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, date

try:
    import extract_msg
    from bs4 import BeautifulSoup
except ImportError:
    print("ERROR: install dependencies first:")
    print("  pip install extract-msg beautifulsoup4")
    sys.exit(1)

SOURCE_RULES = [
    ('TRREB',         re.compile(r'@(matrix\.proptx\.ca|trreb\.ca|proptx\.ca)$', re.I)),
    ('CBRE',          re.compile(r'@cbre\.(com|ca)$', re.I)),
    ('Colliers',      re.compile(r'@colliers\.(com|ca)$', re.I)),
    ('JLL',           re.compile(r'@(am\.jll|jll)\.com$', re.I)),
    ('Cushman',       re.compile(r'@(cushwake|cushmanwakefield)\.com$', re.I)),
    ('Avison Young',  re.compile(r'@avisonyoung\.(com|ca)$', re.I)),
    ('Lee',           re.compile(r'@lee-associates\.com$', re.I)),
    ('Newmark',       re.compile(r'@newmark\.com$', re.I)),
    ('Vanguard',      re.compile(r'@vanguardrealty\.ca$', re.I)),
    ('Lennard',       re.compile(r'@lennard\.com$', re.I)),
]

def classify(sender_email):
    if not sender_email: return 'Generic'
    addr = sender_email.lower().strip()
    for name, rx in SOURCE_RULES:
        if rx.search(addr): return name
    return 'Generic'

def clean_html(s):
    if not s: return ''
    if isinstance(s, bytes): s = s.decode('utf-8', errors='replace')
    soup = BeautifulSoup(s, 'html.parser')
    for tag in soup(['style', 'script', 'head', 'meta', 'link']): tag.decompose()
    text = soup.get_text(separator='\n')
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

SIZE_RX = re.compile(r'(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:SF|sq\.?\s*ft\.?|sf)', re.I)

ADDR_RX = re.compile(
    r'(?<![\d,])'
    r'(\d{2,5}(?:[-–]\d{2,5})?\s+[A-Z][A-Za-z\s\.\-]+?\s+'
    r'(?:Avenue|Ave|Street|St|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Court|Crt|Crescent|Cres|Place|Pl|Circle|Cir|Lane|Ln|Parkway|Pkwy|Highway|Hwy|Ct)'
    r')\b',
    re.I
)

CITY_RX = re.compile(
    r'\b(Mississauga|Brampton|Vaughan|Etobicoke|Scarborough|Markham|Oakville|Burlington|Richmond Hill|Toronto|North York|Concord|Woodbridge|Maple|Aurora|Newmarket)\b',
    re.I
)

STATUS_RX = [
    (re.compile(r'\bFOR\s+LEASE\b', re.I),  'for_lease'),
    (re.compile(r'\bFOR\s+SALE\b',  re.I),  'for_sale'),
    (re.compile(r'\bJUST\s+LEASED\b', re.I),'leased'),
    (re.compile(r'\bJUST\s+SOLD\b', re.I),  'sold'),
    (re.compile(r'\b(LEASED|SUBLEASED)\b', re.I), 'leased'),
    (re.compile(r'\b(SOLD|CLOSED)\b', re.I),'sold'),
    (re.compile(r'\bPRICE\s+REDUCED\b', re.I), 'for_lease'),
    (re.compile(r'\bAVAILABLE\b', re.I),    'for_lease'),
]

def parse_subject(subject):
    out = {'subject_address': None, 'subject_size_sf': None, 'subject_size_range': None,
           'subject_city': None, 'subject_status': None}
    if not subject: return out
    sub = subject
    for rx, status in STATUS_RX:
        if rx.search(sub):
            out['subject_status'] = status; break
    am = ADDR_RX.search(sub)
    if am: out['subject_address'] = am.group(1).strip()
    cm = CITY_RX.search(sub)
    if cm: out['subject_city'] = cm.group(1).title()
    sizes = SIZE_RX.findall(sub)
    if sizes:
        nums = [int(s.replace(',', '').split('.')[0]) for s in sizes]
        if len(nums) == 1:
            out['subject_size_sf'] = nums[0]
        else:
            out['subject_size_range'] = [min(nums), max(nums)]
            out['subject_size_sf'] = max(nums)
    return out

def parse_money_psf(text):
    m = re.search(r'\$\s*(\d+(?:\.\d{1,2})?)', text)
    if m: return float(m.group(1))
    return None

def parse_clear_ft(text):
    m = re.search(r"(\d{2})\s*(?:ft|'|′|feet)", text, re.I)
    if m: return int(m.group(1))
    return None

def parse_doors(text):
    tl = di = 0
    m = re.search(r'(\d+)\s*(?:Truck\s*Level|TL\b)', text, re.I)
    if m: tl = int(m.group(1))
    m = re.search(r'(\d+)\s*(?:Drive[\s-]*[Ii]n|DI\b)', text, re.I)
    if m: di = int(m.group(1))
    return tl, di

def extract_cbre(body, subject_data):
    out = {}
    lines = [l.strip() for l in body.split('\n') if l.strip()]
    label_map = {
        'available space': 'size_text',
        'clear height': 'clear_text',
        'shipping doors': 'doors_text',
        'heating': 'heating',
        'sprinklers': 'sprinklers',
        'zoning': 'zoning',
        'asking rate': 'rent_text',
        'tmi': 'tmi_text',
        'possession': 'possession',
        'location': 'cross_streets'
    }
    for i, line in enumerate(lines):
        lower = line.lower().rstrip(':').strip()
        for needle, key in label_map.items():
            if lower == needle and i + 1 < len(lines):
                out[key] = lines[i + 1]; break
            if lower.startswith(needle) and i + 1 < len(lines):
                out[key] = lines[i + 1]
    listing = {
        'size_sf': None, 'clear_ft': None, 'docks_total': 0, 'drive_in_total': 0,
        'heating': out.get('heating'),
        'sprinklers': out.get('sprinklers') == 'Yes' if out.get('sprinklers') else None,
        'zoning': out.get('zoning'),
        'net_rent_psf': None, 'additional_rent_psf': None,
        'possession': out.get('possession'),
        'cross_streets': out.get('cross_streets')
    }
    if 'size_text' in out:
        s = SIZE_RX.search(out['size_text'])
        if s: listing['size_sf'] = int(s.group(1).replace(',', '').split('.')[0])
    if 'clear_text' in out:
        listing['clear_ft'] = parse_clear_ft(out['clear_text'])
    if 'doors_text' in out:
        tl, di = parse_doors(out['doors_text'])
        listing['docks_total'] = tl; listing['drive_in_total'] = di
    if 'rent_text' in out:
        listing['net_rent_psf'] = parse_money_psf(out['rent_text'])
    if 'tmi_text' in out:
        listing['additional_rent_psf'] = parse_money_psf(out['tmi_text'])
    return listing

def extract_colliers(body, subject_data):
    seen = {}
    for m in re.finditer(r'Unit\s+([\w\-]+)\s*\|\s*([\d,]+)\s*SF', body, re.I):
        unit_name = m.group(1).strip()
        if unit_name in seen: continue
        seen[unit_name] = {'unit': unit_name, 'size_sf': int(m.group(2).replace(',', ''))}
    units = list(seen.values())
    rent_match = re.search(r'\$\s*([\d.]+)\s*(?:[-–]\s*\$?\s*([\d.]+))?\s*(?:PSF|/SF|per\s*sq)', body, re.I)
    rent_low = rent_high = None
    if rent_match:
        rent_low = float(rent_match.group(1))
        rent_high = float(rent_match.group(2)) if rent_match.group(2) else rent_low
    office_match = re.search(r'office\s+(?:space\s+)?(?:ranges?\s+)?(?:from\s+)?(\d+)\s*[-–]\s*(\d+)\s*%', body, re.I)
    office_pct = int(office_match.group(1)) if office_match else None
    addr = None
    am = ADDR_RX.search(body)
    if am: addr = am.group(1).strip()
    cm = CITY_RX.search(body)
    body_city = cm.group(1).title() if cm else None
    common_unit_fields = {
        'net_rent_psf_low': rent_low,
        'net_rent_psf_high': rent_high,
        'net_rent_psf': rent_low,
        'office_pct': office_pct,
        'body_address': addr,
        'body_city': body_city,
    }
    if not units:
        return [{**common_unit_fields, 'size_sf': subject_data.get('subject_size_sf')}]
    return [{**u, **common_unit_fields} for u in units]

def extract_vanguard(body, subject_data):
    return {
        'extraction_confidence': 'low',
        'extraction_note': 'Image-only email; full specs require brochure PDF download.',
        'size_sf': subject_data.get('subject_size_sf'),
        'size_range_sf': subject_data.get('subject_size_range'),
    }

def extract_generic(body, subject_data):
    out = {
        'size_sf': subject_data.get('subject_size_sf'),
        'clear_ft': parse_clear_ft(body),
    }
    tl, di = parse_doors(body)
    out['docks_total'] = tl; out['drive_in_total'] = di
    rent_match = re.search(r'\$\s*(\d+\.\d{2})\s*(?:/SF|net|psf)', body, re.I)
    if rent_match:
        out['net_rent_psf'] = float(rent_match.group(1))
    am = ADDR_RX.search(body)
    if am: out['body_address'] = am.group(1).strip()
    cm = CITY_RX.search(body)
    if cm: out['body_city'] = cm.group(1).title()
    return out

SOURCE_EXTRACTORS = {
    'CBRE':         extract_cbre,
    'Colliers':     extract_colliers,
    'Vanguard':     extract_vanguard,
    'Generic':      extract_generic,
}

def extract_brokers(body):
    emails = re.findall(r'\b([\w._-]+@[\w.-]+\.\w+)\b', body)
    phones = re.findall(r'(?:\+?1[\s.\-]*)?\(?\d{3}\)?[\s.\-]*\d{3}[\s.\-]*\d{4}', body)
    # filter out the email signatures for the broker, exclude tracking/social/dev domains
    filt = [e for e in set(emails) if not re.search(r'(noreply|donotreply|mailtrack|sendgrid|amazonaws|notify)', e, re.I)]
    return {'emails': filt[:10], 'phones': list(set(phones))[:5]}

def parse_msg_file(path):
    m = extract_msg.Message(path)
    sender = m.sender or ''
    sender_addr = sender.split('<')[-1].rstrip('>').strip() if '<' in sender else sender.strip()
    source = classify(sender_addr)
    body = clean_html(m.htmlBody) if m.htmlBody else (m.body or '')
    subject = m.subject or ''
    sub_data = parse_subject(subject)
    extractor = SOURCE_EXTRACTORS.get(source, extract_generic)
    extracted = extractor(body, sub_data)
    common = {
        'source': 'broker_email_extraction',
        'source_brokerage': source,
        'source_sender': sender_addr,
        'source_email_subject': subject,
        'source_email_date': str(m.date) if m.date else None,
        'extracted_at': datetime.utcnow().isoformat() + 'Z',
        'address_from_subject': sub_data.get('subject_address'),
        'city': sub_data.get('subject_city'),
        'status': sub_data.get('subject_status') or 'for_lease',
        'broker_contacts': extract_brokers(body),
    }
    # Generic body-city fallback for extractors that didn't pull one
    body_city_match = CITY_RX.search(body)
    body_city_fallback = body_city_match.group(1).title() if body_city_match else None

    if isinstance(extracted, list):
        listings = []
        for unit in extracted:
            rec = {**common, **unit}
            rec['address'] = unit.get('body_address') or sub_data.get('subject_address')
            rec['city']    = unit.get('body_city')    or sub_data.get('subject_city') or body_city_fallback or rec.get('city')
            rec['extraction_confidence'] = (
                'high'   if (rec.get('size_sf') and rec.get('net_rent_psf') and rec.get('address')) else
                'medium' if rec.get('size_sf') else 'low'
            )
            listings.append(rec)
        m.close()
        return listings
    rec = {**common, **extracted}
    rec['address'] = extracted.get('body_address') or sub_data.get('subject_address')
    rec['city']    = extracted.get('body_city')    or sub_data.get('subject_city') or body_city_fallback or rec.get('city')
    rec['extraction_confidence'] = rec.get('extraction_confidence') or (
        'high'   if (rec.get('size_sf') and rec.get('net_rent_psf') and rec.get('address')) else
        'medium' if rec.get('size_sf') else 'low'
    )
    m.close()
    return [rec]

def listing_id(rec):
    addr = (rec.get('address') or rec.get('address_from_subject') or 'unknown').lower()
    addr = re.sub(r'[^a-z0-9]+', '-', addr).strip('-')[:60]
    unit = rec.get('unit', '')
    return f"email-{addr}-u{unit}" if unit else f"email-{addr}"

def merge_into_listings(new_records, listings_path):
    if os.path.exists(listings_path):
        with open(listings_path) as f:
            data = json.load(f)
    else:
        data = {'meta': {}, 'for_lease': [], 'leased': [], 'for_sale': [], 'sold': [],
                'delisted_lease': [], 'delisted_sale': []}
    bucket_map = {'for_lease': 'for_lease', 'leased': 'leased',
                  'for_sale': 'for_sale', 'sold': 'sold'}
    added = updated = 0
    for rec in new_records:
        bucket = bucket_map.get(rec['status'], 'for_lease')
        rec['id'] = listing_id(rec)
        existing = next((x for x in data.setdefault(bucket, []) if x.get('id') == rec['id']), None)
        if existing:
            for k, v in rec.items():
                if v is not None and v != '': existing[k] = v
            updated += 1
        else:
            data[bucket].append(rec); added += 1
    data['meta']['last_email_parse'] = datetime.utcnow().isoformat() + 'Z'
    with open(listings_path, 'w') as f:
        json.dump(data, f, indent=2)
    return added, updated

def main():
    p = argparse.ArgumentParser(description='Parse broker emails into industrio listings.json')
    p.add_argument('source', help='Folder of .msg/.eml files')
    p.add_argument('--listings', default='listings.json')
    p.add_argument('--dry-run', action='store_true', help="Parse but don't write")
    args = p.parse_args()
    files = []
    if os.path.isdir(args.source):
        files = sorted(glob.glob(os.path.join(args.source, '*.msg')) +
                       glob.glob(os.path.join(args.source, '*.eml')))
    elif os.path.isfile(args.source):
        files = [args.source]
    else:
        print(f'No .msg/.eml files found at {args.source}'); sys.exit(1)
    print(f'Parsing {len(files)} email file(s)...')
    print('=' * 80)
    all_records = []
    for f in files:
        records = parse_msg_file(f)
        for r in records:
            badge = '+' if r['extraction_confidence'] == 'high' else \
                    '~' if r['extraction_confidence'] == 'medium' else '?'
            size = f"{r.get('size_sf'):,} SF" if r.get('size_sf') else 'size?'
            rent_val = r.get('net_rent_psf') or r.get('net_rent_psf_low')
            rent = f"${rent_val:.2f}" if rent_val else 'rent?'
            addr = (r.get('address') or r.get('address_from_subject') or '(no address)')
            unit_val = r.get('unit')
            unit_tag = ' U' + str(unit_val) if unit_val else ''
            brokerage = r.get('source_brokerage', '')
            status = r.get('status', '')
            print(f'  {badge} [{brokerage:12s}] {addr[:35]:35s}{unit_tag:8s} '
                  f'{size:>12} {rent:>8}  {status}')
        all_records.extend(records)
    print('=' * 80)
    if args.dry_run:
        print(f'DRY RUN - extracted {len(all_records)} listings (not written).')
        return
    added, updated = merge_into_listings(all_records, args.listings)
    print(f'Wrote {added} new + {updated} updated listings to {args.listings}.')

if __name__ == '__main__':
    main()
