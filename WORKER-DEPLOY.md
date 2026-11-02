# Cloudflare Worker — deploy guide

This document walks through deploying `worker.js` as a real backend at
something like `https://api.industrio.ai`. End-to-end takes about 20 minutes
the first time.

## What you get

A small server-side API that handles:

- `POST /api/leases` — tenant submits a lease (private record + optional opt-in to comp pool)
- `GET /api/leases?email=...` — list one user's leases
- `PATCH /api/leases/:id` — toggle opt-in
- `DELETE /api/leases/:id` — withdraw + remove from comp pool
- `GET /api/comps-pool` — public aggregated benchmarks (recomputed live, with all the policy guardrails: ≥5 comps, ≥3 buildings, 12-month delay)

Storage is Cloudflare KV (key-value). Free tier is 100,000 reads/day and 1,000 writes/day — easily covers the first ~10,000 users.

## One-time setup

### 1. Sign up for Cloudflare

Free account at [cloudflare.com](https://cloudflare.com). No credit card required for the Workers free tier.

### 2. Install Wrangler (Cloudflare's CLI)

In a terminal:

```bash
npm install -g wrangler
wrangler login
```

The `login` command opens a browser to authorize.

### 3. Create the three KV namespaces

KV namespaces are like simple databases. The Worker uses three:

```bash
wrangler kv:namespace create LEASES
wrangler kv:namespace create USERS
wrangler kv:namespace create COMPS
```

Each command prints something like:

```
🌀 Creating namespace with title "industrio-LEASES"
✨ Success!
Add the following to your configuration file:
{ binding = "LEASES", id = "abc123def456..." }
```

Save those IDs. You'll paste them into `wrangler.toml` next.

### 4. Create `wrangler.toml`

In the project folder, alongside `worker.js`, create a file named **`wrangler.toml`** with:

```toml
name = "industrio-api"
main = "worker.js"
compatibility_date = "2024-04-01"

# Replace these IDs with the ones from `wrangler kv:namespace create` above
kv_namespaces = [
  { binding = "LEASES", id = "PASTE_LEASES_ID_HERE" },
  { binding = "USERS",  id = "PASTE_USERS_ID_HERE" },
  { binding = "COMPS",  id = "PASTE_COMPS_ID_HERE" }
]

# Optional: custom domain (after you set up DNS)
# routes = [
#   { pattern = "api.industrio.ai/*", zone_name = "industrio.ai" }
# ]
```

### 5. Deploy

```bash
wrangler deploy
```

Wrangler will publish the Worker and print the URL — something like
`https://industrio-api.<your-subdomain>.workers.dev`.

That's a working backend. Test it with curl:

```bash
curl -X POST https://industrio-api.<your-subdomain>.workers.dev/api/leases \
  -H 'content-type: application/json' \
  -d '{
    "email": "test@example.com",
    "attested": true,
    "opt_in_benchmarks": true,
    "submarket": "Mississauga",
    "bucket_size": "10–15k",
    "bucket_rent": "$15-16/SF",
    "private": { "address": "test", "size_sf": 12000, "net_rent": 15.5 }
  }'
```

You should get `{"ok":true,"id":"...","submitted_at":"..."}`.

```bash
curl https://industrio-api.<your-subdomain>.workers.dev/api/comps-pool
```

Returns the live aggregated comps (note: time-delay filter means brand-new
submissions don't show up in benchmarks for 12 months).

### 6. Custom domain (optional but recommended)

If you have `industrio.ai` (or your domain) on Cloudflare:

1. In the Cloudflare dashboard → Workers → industrio-api → Triggers → Add Custom Domain
2. Enter `api.industrio.ai`
3. Cloudflare auto-creates the DNS record.

Then update `ALLOWED_ORIGINS` in `worker.js` to include your real domain:

```js
const ALLOWED_ORIGINS = [
  'https://industrio.ai',
  'https://www.industrio.ai',
  'http://localhost:8000'
];
```

…and re-deploy with `wrangler deploy`.

### 7. Wire the frontend to use the API

In the project, edit `lease-upload.js` to call the API instead of writing
to localStorage. The current code stores submissions to localStorage as a
demo. To switch:

1. Find the `saveLeaseLocally(payload)` function near the top of `lease-upload.js`.
2. Replace its body with:

```js
function saveLeaseLocally(payload){
  // Try the API first; fall back to localStorage if it fails (offline / 404 / 500)
  var apiBase = window.INDUSTRIO_API || 'https://api.industrio.ai';
  var email = (localStorage.getItem('industrio.userEmail') || '').trim();
  if (!email){
    // Not logged in — store locally only
    return _saveLeaseLocalOnly(payload);
  }
  fetch(apiBase + '/api/leases', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(Object.assign({}, payload, { email: email }))
  }).then(function(r){ return r.ok ? r.json() : Promise.reject(r); })
    .then(function(){ /* server-stored, success */ })
    .catch(function(){ _saveLeaseLocalOnly(payload); });
}
function _saveLeaseLocalOnly(payload){
  try {
    var arr = JSON.parse(localStorage.getItem('industrio.myLeases') || '[]');
    arr.unshift(payload);
    localStorage.setItem('industrio.myLeases', JSON.stringify(arr));
  } catch(e){}
}
```

3. Also edit `account.html`'s contributions panel to fetch from
   `GET /api/leases?email=...` and call
   `DELETE /api/leases/:id?email=...` for withdraw. The localStorage
   fallback stays as a graceful degradation when the API is unreachable.

4. (Optional) Update `market.js` to fetch
   `https://api.industrio.ai/api/comps-pool` instead of the static
   `comps-pool.json` file. That way the benchmarks update live as new
   tenants contribute, with no rebuild step.

## Operations

### Logs / debugging

```bash
wrangler tail
```

Streams live logs from the Worker. Errors and `console.log` output show up
here.

### Inspect the data

```bash
# How many leases stored?
wrangler kv:key list --binding=LEASES | wc -l

# How many anonymized comps in the pool?
wrangler kv:key list --binding=COMPS | wc -l
```

### Costs

- **Workers free tier**: 100,000 requests/day. ~$5/month above that.
- **KV free tier**: 1,000 writes/day, 100,000 reads/day, 1 GB storage. ~$0.50/M reads beyond.

For industrio's expected first-year volume (a few thousand uploads, low-thousands daily searches), all of this is **$0**. You'd hit paid tiers around 1,000 daily active users.

### Privacy guardrails baked in

The Worker enforces the data-policy.html promises in code:

- `MIN_COMPS_PER_CELL = 5` — no benchmark cell appears with fewer than 5 comps.
- `MIN_BUILDINGS_PER_CELL = 3` — must span 3+ buildings.
- `TIME_DELAY_DAYS = 365` — submissions don't influence displayed numbers for a year.
- Email is **hashed** before being used as a key. Raw email never appears in storage.
- Private payload is encrypted at rest (Cloudflare KV is AES-256 by default).
- DELETE removes both the private record AND the corresponding comp pool entry within seconds.

### Backups

KV doesn't have built-in snapshots. For disaster recovery, run a daily export:

```bash
wrangler kv:bulk get --binding=LEASES > backups/leases-$(date +%Y%m%d).json
wrangler kv:bulk get --binding=COMPS  > backups/comps-$(date +%Y%m%d).json
```

Cron this on whatever server runs the rest of your ops. Restore with
`wrangler kv:bulk put`.

## When to outgrow this

The Worker + KV setup scales to ~1,000s of users without changes. You'd
move to a real database (Cloudflare D1, Postgres, Supabase) when:

- You need **search across leases** (KV is key-value only)
- You need **transactions** (a deposit-and-withdrawal flow)
- You need **complex joins** (e.g. "find me the top 10 most expensive
  comps in this submarket grouped by year")
- You hit **>10,000 daily writes**

For now, this is the right tool. Cheap, fast, regulatory-friendly (Canadian
data residency available), and no servers to manage.
