# industrio — TRREB email ingestion runbook

## Architecture

```
TRREB daily digest emails
      ↓  Microsoft 365 MCP (outlook_email_search)
trreb-parser.py
      ↓  HTML parse + dedupe by MLS
listings.json  ←  site reads this on page load
      ↓
Alerts / Map / Lease-vs-Own
```

## `listings.json` schema (the contract between parser and site JS)

```jsonc
{
  "meta": { "last_updated": "2026-04-23T12:00:00Z", "source": "TRREB" },

  "for_lease": [
    {
      "mls": "W1234567",            // dedup key (required)
      "addr": "2400 Meadowvale Blvd, Unit 6",
      "city": "Mississauga",
      "size": 12400,                // SF
      "rent": 15.50,                // net rent $/SF/yr
      "tmi":  6.20,                 // additional rent $/SF/yr
      "clear": 26,                  // clear height ft
      "office": 12,                 // office %
      "doors": 3,                   // shipping doors total
      "parking": 1.4,               // stalls per 1,000 SF
      "ll": "ACME Industrial Holdings",
      "llScore": 8.2,               // landlord score (null if unknown)
      "env": 2,                     // env risk 1-5 (null if not yet screened)
      "tags": ["Whitebox","3 TL doors","600A @ 600V","Drive-in"],
      "hasWhitebox": true, "has600A": true, "hasDriveIn": true,
      "hasCrane": false, "hasRail": false, "hasHvac": true, "hasOS": false,
      "daysOld": 0                  // days since listed
    }
  ],

  "leased": [
    {
      "mls": "...", "addr": "...", "city": "...", "size": 11200,
      "askRent": 15.75, "askTmi": 6.10,
      "achRent": 14.80, "achTmi": 6.10,
      "clear": 22, "office": 14, "doors": 2, "parking": 1.2,
      "ll": "...", "llScore": 8.2,
      "term": 5, "freeMonths": 2, "tiPerSf": 3.00,
      "tenant": "Light manufacturing",
      "daysOnMarket": 41, "leasedDaysAgo": 12,
      "tags": [...]
    }
  ],

  "for_sale": [
    {
      "mls": "...", "addr": "...", "city": "...", "size": 12400,
      "askPsf": 440, "condoFee": 4.80,
      "clear": 26, "office": 12, "doors": 3, "parking": 1.4,
      "daysOld": 8, "tags": [...]
    }
  ],

  "sold": [
    {
      "mls": "...", "addr": "...", "city": "...", "size": 11200,
      "askPsf": 425, "soldPsf": 412,
      "daysOnMarket": 37, "soldDaysAgo": 18,
      "clear": 22, "office": 14, "parking": 1.2,
      "tags": [...]
    }
  ]
}
```

## Runtime behaviour

`alerts.js` and `condo-market.js` try to `fetch('listings.json')` on page load:

- **Success AND non-empty array** → use real TRREB data.
- **Failure OR empty** → fall back to the embedded sample data already in the JS file.

This means the site works:
- **Today** (pipeline not live) — shows sample data.
- **After** (pipeline live) — automatically shows real TRREB data on next refresh.

## Daily job

Runs at 07:00 ET via the scheduled-tasks skill. Pulls yesterday's digest from
the connected inbox, parses, and writes `listings.json`.

## Status

- [ ] Microsoft 365 connector authorized (action: charles)
- [ ] Sample TRREB email provided, one per digest type (action: charles)
- [ ] Parser selectors finalized against real emails
- [ ] Scheduled task created (daily 07:00 ET)
- [x] Site JS updated to fetch listings.json with fallback
