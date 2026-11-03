#!/usr/bin/env python3
"""
build-public.py — populate /docs/ with a public-safe copy of the industrio site.

What it does:
  1. Reads listings.json (full PII, local-only).
  2. Strips broker name/phone/email from every listing.
  3. Writes docs/listings.json (scrubbed, committed to git).
  4. Copies all static site assets (HTML, JS, CSS, SVG, public JSON) to /docs/.
  5. Skips Python scripts, raw PDFs/emails, worker.js, markdown notes, and
     anything else that isn't needed to serve the public site.

Usage:
    python scripts/build-public.py
    python scripts/build-public.py --dry-run   # print plan, write nothing
    python scripts/build-public.py --verbose   # list every file copied

GitHub Pages setting:
    Deploy from branch: main   Folder: /docs
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

# -- PII fields to strip from every listing record ----------------------------
# If you add new broker-contact fields to the parser schema, add them here too.
PII_FIELDS = {
    "broker",
    "broker_phone",
    "broker_email",
    "listing_broker",
    "listing_broker_phone",
    "listing_agent",
    "listing_agent_phone",
    "co_broker",
    "co_broker_phone",
    "agent_name",
    "agent_phone",
    "agent_email",
}

# -- Asset copy rules ---------------------------------------------------------
# Extensions that get copied verbatim from root to docs/.
STATIC_EXTS = {".html", ".js", ".css", ".svg", ".png", ".jpg", ".jpeg",
               ".webp", ".ico", ".woff", ".woff2", ".ttf"}

# Explicit JSON files to copy to docs/ (not listings.json — that's scrubbed
# separately above).
PUBLIC_JSON = {
    "buildings.json",
    "comps-pool.json",
    "realm-aggregate-2026.json",
}

# Files and folders to never copy, even if their extension would otherwise
# qualify. These are either server-side, raw sources, or local-only.
NEVER_COPY = {
    "worker.js",         # Cloudflare Worker, not frontend
    "ai-broker.js.new",  # editor backup
    "start-local-server.bat",
}
NEVER_COPY_DIRS = {
    "realm-pdfs",
    "photos",            # add back once photos are scrubbed/optimised
    "scripts",
    "docs",
    "__pycache__",
    "Industrio",         # older backup subfolder
    ".git",
    ".github",
    "node_modules",
    ".venv",
    "venv",
}


def strip_pii(record: dict) -> dict:
    """Return a copy of `record` with PII fields removed."""
    return {k: v for k, v in record.items() if k not in PII_FIELDS}


def scrub_listings(src_path: Path, dst_path: Path, verbose: bool) -> dict:
    """Load listings.json, strip PII from every record in every bucket,
    write to dst_path, and return summary stats."""
    with src_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    stats = {"buckets": {}, "pii_fields_removed": 0}
    buckets = ("for_lease", "leased", "for_sale", "sold",
               "delisted_lease", "delisted_sale")

    for bucket in buckets:
        rows = data.get(bucket) or []
        scrubbed = []
        for row in rows:
            fields_present = sum(1 for k in row if k in PII_FIELDS)
            stats["pii_fields_removed"] += fields_present
            scrubbed.append(strip_pii(row))
        data[bucket] = scrubbed
        stats["buckets"][bucket] = len(scrubbed)
        if verbose:
            print(f"  {bucket:>16}: {len(scrubbed)} records")

    # Note in meta so viewers of the public file know what was done.
    meta = data.get("meta") or {}
    meta["public_build"] = True
    meta["pii_stripped"] = sorted(PII_FIELDS)
    data["meta"] = meta

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    with dst_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return stats


def should_copy(path: Path) -> bool:
    """Decide whether a root-level file should be mirrored into docs/."""
    if path.name in NEVER_COPY:
        return False
    if path.name.startswith("."):
        return False
    if path.suffix.lower() in STATIC_EXTS:
        return True
    if path.name in PUBLIC_JSON:
        return True
    return False


def copy_assets(dry_run: bool, verbose: bool) -> int:
    """Copy every eligible root-level file into docs/. Return count copied."""
    copied = 0
    for item in sorted(ROOT.iterdir()):
        if item.is_dir():
            continue
        if not should_copy(item):
            continue
        dst = DOCS / item.name
        if verbose or dry_run:
            print(f"  copy  {item.name}")
        if not dry_run:
            DOCS.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dst)
        copied += 1
    return copied


def wipe_stale(dry_run: bool, verbose: bool) -> int:
    """Remove files from docs/ that no longer exist at root (keep listings.json
    which is written separately)."""
    if not DOCS.exists():
        return 0
    root_names = {p.name for p in ROOT.iterdir() if p.is_file()}
    removed = 0
    for item in DOCS.iterdir():
        if not item.is_file():
            continue
        if item.name == "listings.json":
            continue  # we regenerate this
        if item.name == "CNAME":
            continue  # custom-domain file; keep across rebuilds
        if item.name not in root_names:
            if verbose or dry_run:
                print(f"  rm    {item.name}  (stale)")
            if not dry_run:
                item.unlink()
            removed += 1
    return removed


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would happen without writing")
    ap.add_argument("--verbose", "-v", action="store_true",
                    help="list every file touched")
    args = ap.parse_args()

    listings_src = ROOT / "listings.json"
    listings_dst = DOCS / "listings.json"

    if not listings_src.exists():
        print(f"ERROR: {listings_src} not found. Run the parsers first.",
              file=sys.stderr)
        return 2

    print(f"industrio build-public  (root: {ROOT})")
    print(f"  docs/: {DOCS}")
    print()
    print("Scrubbing listings.json...")
    if args.dry_run:
        with listings_src.open("r", encoding="utf-8") as f:
            data = json.load(f)
        hit = 0
        for bucket in ("for_lease", "leased", "for_sale", "sold",
                       "delisted_lease", "delisted_sale"):
            for row in data.get(bucket) or []:
                hit += sum(1 for k in row if k in PII_FIELDS)
        print(f"  would remove {hit} PII field values across all buckets")
    else:
        stats = scrub_listings(listings_src, listings_dst, args.verbose)
        print(f"  removed {stats['pii_fields_removed']} PII field values")
        for bucket, n in stats["buckets"].items():
            print(f"  {bucket:>16}: {n} records")

    print()
    print("Copying static assets to docs/ ...")
    copied = copy_assets(args.dry_run, args.verbose)
    print(f"  {copied} files {'would be ' if args.dry_run else ''}copied")

    print()
    print("Removing stale files from docs/ ...")
    removed = wipe_stale(args.dry_run, args.verbose)
    print(f"  {removed} files {'would be ' if args.dry_run else ''}removed")

    print()
    if args.dry_run:
        print("DRY RUN complete. Re-run without --dry-run to write.")
    else:
        print("DONE. Commit docs/ and push to publish:")
        print("  git add docs/ && git commit -m 'publish: refresh site' && git push")
    return 0


if __name__ == "__main__":
    sys.exit(main())
