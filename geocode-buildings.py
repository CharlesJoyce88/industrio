#!/usr/bin/env python3
"""
geocode-buildings.py
====================

Upgrades the lat/lng on every building in buildings.json from approximate
city-centroid placements to precise rooftop coordinates by querying a real
geocoding service.

Run this locally (it makes outbound HTTPS calls — won't work in the sandbox
that doesn't allow arbitrary network).

Two providers are supported:

  1) Nominatim (free, OpenStreetMap)   — slow, polite to use
     - 1 request/sec rate limit per their TOS
     - ~93 minutes for 5,595 buildings
     - No API key required, but set USER_AGENT identifying yourself
     - Quality is good for street addresses in major Canadian cities

  2) Google Geocoding API ($)
     - ~$5 per 1,000 requests = ~$28 for 5,595 buildings
     - ~10 minutes total
     - Best precision and reliability
     - Requires GOOGLE_API_KEY env var

Usage
-----

    # Free / Nominatim
    python geocode-buildings.py --provider nominatim

    # Google
    export GOOGLE_API_KEY=AIza...
    python geocode-buildings.py --provider google

    # Resume after interruption (skips buildings already geocoded with
    # method='nominatim' or 'google')
    python geocode-buildings.py --provider nominatim --resume

    # Only re-geocode a city
    python geocode-buildings.py --provider nominatim --city Mississauga

The script writes back to buildings.json incrementally (every 25 buildings),
so a crash mid-run loses at most a few rows.
"""

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request

USER_AGENT = "industrio-geocode/1.0 (Northbridge Capital — for non-commercial geocoding of GTA industrial inventory)"

DEFAULT_INPUT  = "buildings.json"
DEFAULT_OUTPUT = "buildings.json"

def fetch(url, headers=None, timeout=15):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")

def geocode_nominatim(query):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "format": "json",
        "limit": 1,
        "countrycodes": "ca",
        "q": query,
    })
    raw = fetch(url, headers={"User-Agent": USER_AGENT})
    arr = json.loads(raw)
    if not arr: return None
    return float(arr[0]["lat"]), float(arr[0]["lon"]), arr[0].get("display_name")

def geocode_google(query, api_key):
    url = "https://maps.googleapis.com/maps/api/geocode/json?" + urllib.parse.urlencode({
        "address": query,
        "components": "country:CA",
        "key": api_key,
    })
    raw = fetch(url)
    obj = json.loads(raw)
    if obj.get("status") != "OK" or not obj.get("results"): return None
    res = obj["results"][0]
    loc = res["geometry"]["location"]
    return float(loc["lat"]), float(loc["lng"]), res.get("formatted_address")

def build_query(b):
    parts = [b.get("address"), b.get("city"), "Ontario", "Canada"]
    return ", ".join(p for p in parts if p)

def main():
    p = argparse.ArgumentParser(description="Geocode buildings.json to precise rooftop lat/lng.")
    p.add_argument("--provider", choices=["nominatim", "google"], default="nominatim")
    p.add_argument("--input",  default=DEFAULT_INPUT)
    p.add_argument("--output", default=DEFAULT_OUTPUT)
    p.add_argument("--resume", action="store_true",
                   help="Skip buildings already geocoded with the chosen provider")
    p.add_argument("--city",   help="Only geocode buildings in this city")
    p.add_argument("--limit",  type=int, default=0,
                   help="Only process N buildings (for testing)")
    p.add_argument("--rate",   type=float, default=1.05,
                   help="Seconds to sleep between requests (Nominatim TOS = 1.0+)")
    args = p.parse_args()

    api_key = None
    if args.provider == "google":
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            print("ERROR: GOOGLE_API_KEY env var not set.")
            sys.exit(1)

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    bldgs = data.get("buildings", [])
    todo = []
    for i, b in enumerate(bldgs):
        if args.city and (b.get("city") or "") != args.city: continue
        if args.resume and b.get("geocode_method") in (args.provider,):    continue
        todo.append((i, b))
        if args.limit and len(todo) >= args.limit: break

    print(f"Provider     : {args.provider}")
    print(f"Buildings    : {len(bldgs)} total, {len(todo)} to geocode")
    print(f"Rate         : {args.rate}s between requests")
    print(f"Estimated    : {len(todo) * args.rate / 60:.1f} minutes")
    print(f"Output       : {args.output}")
    print("---")

    ok = miss = err = 0
    for idx, (i, b) in enumerate(todo, 1):
        q = build_query(b)
        try:
            res = (geocode_google(q, api_key) if args.provider == "google" else geocode_nominatim(q))
            if res:
                b["lat"], b["lng"], _ = res[0], res[1], res[2]
                b["geocode_method"] = args.provider
                ok += 1
            else:
                miss += 1
        except Exception as e:
            err += 1
            print(f"  [error] {q!r}: {e}", file=sys.stderr)
        if idx % 10 == 0 or idx == len(todo):
            print(f"  {idx:>5d}/{len(todo)}  ok={ok}  miss={miss}  err={err}  ({q[:60]})")
        # Periodic save so a crash doesn't lose progress
        if idx % 25 == 0:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(data, f, separators=(",", ":"))
        time.sleep(args.rate)

    data["meta"]["geocoded_method"] = args.provider
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    print("---")
    print(f"Done. ok={ok} miss={miss} err={err}")

if __name__ == "__main__":
    main()
