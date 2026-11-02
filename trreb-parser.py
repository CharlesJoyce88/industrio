"""
industrio — TRREB email → listings.json ingestion.

Architecture:
  1. Fetch previous-day TRREB digest emails via Microsoft 365 connector (outlook_email_search).
  2. Parse each HTML listing block into structured dicts.
  3. Deduplicate by MLS number.
  4. Append to listings.json under for_lease / leased / for_sale / sold.
  5. Update meta.last_updated.

Runs daily at 07:00 ET via a scheduled task.

BLOCKED pending:
  - Microsoft 365 connector authorization (so this script can read the inbox).
  - Sample TRREB email (to finalize the HTML selectors below).

Once both are in place, fill in parse_for_lease(), parse_leased(), parse_sale(), parse_sold().
"""
import json, re, datetime, pathlib
from html.parser import HTMLParser

LISTINGS_FILE = pathlib.Path(__file__).parent / "listings.json"

# TRREB digest subject patterns — refine with real examples.
SUBJECT_FOR_LEASE = "TRREB Industrial Lease Listings"
SUBJECT_LEASED    = "TRREB Industrial Leased"
SUBJECT_FOR_SALE  = "TRREB Industrial Sale Listings"
SUBJECT_SOLD      = "TRREB Industrial Sold"


def parse_for_lease(html: str) -> list[dict]:
    """Return a list of for-lease listings from a TRREB digest email body.

    Expected fields per listing:
      mls, address, city, size_sf, asking_rent_psf, tmi_psf, clear_ht_ft,
      office_pct, doors, parking_per_1000, landlord, tags (list), listing_agent.

    TODO: finalize selectors against a real TRREB for-lease digest.
    """
    return []


def parse_leased(html: str) -> list[dict]:
    """Leased comps: + achieved_rent_psf, free_months, ti_psf, term_years, days_on_market, leased_date."""
    return []


def parse_sale(html: str) -> list[dict]:
    """For-sale industrial condos: + asking_psf, condo_fee_psf_yr, year_built."""
    return []


def parse_sold(html: str) -> list[dict]:
    """Sold condos: + asking_psf, sold_psf, days_on_market, sold_date."""
    return []


def load():
    if LISTINGS_FILE.exists():
        return json.loads(LISTINGS_FILE.read_text())
    return {"meta": {}, "for_lease": [], "leased": [], "for_sale": [], "sold": []}


def save(data: dict):
    data.setdefault("meta", {})
    data["meta"]["last_updated"] = datetime.datetime.utcnow().isoformat() + "Z"
    data["meta"]["source"] = "TRREB MLS daily digest"
    LISTINGS_FILE.write_text(json.dumps(data, indent=2))


def dedupe_by_mls(existing: list[dict], incoming: list[dict]) -> list[dict]:
    by_mls = {x.get("mls"): x for x in existing if x.get("mls")}
    for row in incoming:
        if row.get("mls"):
            by_mls[row["mls"]] = row  # latest wins
    return list(by_mls.values())


def run(new_for_lease=None, new_leased=None, new_sale=None, new_sold=None):
    """Entry point — call with parsed lists from today's digest."""
    data = load()
    if new_for_lease is not None:
        data["for_lease"] = dedupe_by_mls(data["for_lease"], new_for_lease)
    if new_leased is not None:
        data["leased"] = dedupe_by_mls(data["leased"], new_leased)
    if new_sale is not None:
        data["for_sale"] = dedupe_by_mls(data["for_sale"], new_sale)
    if new_sold is not None:
        data["sold"] = dedupe_by_mls(data["sold"], new_sold)
    save(data)
    print(f"listings.json updated: "
          f"{len(data['for_lease'])} lease, "
          f"{len(data['leased'])} leased, "
          f"{len(data['for_sale'])} sale, "
          f"{len(data['sold'])} sold")


if __name__ == "__main__":
    # Dry run — real integration pulls emails via the Microsoft 365 MCP,
    # then passes parsed lists into run().
    run()
