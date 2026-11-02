// industrio-worker — Cloudflare Worker backend for lease comp uploads
// =========================================================================
//
// Endpoints:
//   POST   /api/leases              — submit a new lease (private + optional opt-in)
//   GET    /api/leases?email=...    — list my leases (private + my comp metadata)
//   PATCH  /api/leases/:id          — toggle opt-in or update fields
//   DELETE /api/leases/:id          — withdraw + delete (also removes from comp pool)
//   GET    /api/comps-pool          — public aggregated benchmarks (no auth)
//
// Storage:
//   - LEASES   (KV)  — full private lease records, keyed by lease_id
//   - USERS    (KV)  — index of lease_ids per user email (so /api/leases?email=
//                      doesn't need to scan the whole namespace)
//   - COMPS    (KV)  — anonymized data points keyed by comp_id, used by the
//                      aggregator to compute /api/comps-pool
//
// Deploy with `wrangler deploy` after binding the three KV namespaces in
// wrangler.toml. See WORKER-DEPLOY.md.
// =========================================================================

const ALLOWED_ORIGINS = [
  'https://industrio.ai',
  'https://www.industrio.ai',
  'http://localhost:8000'  // local dev
];

// Aggregation rules (must match data-policy.html promises)
const MIN_COMPS_PER_CELL = 5;
const MIN_BUILDINGS_PER_CELL = 3;
const TIME_DELAY_DAYS = 365;

// -------------------------------------------------------------------------
// HTTP entry point
// -------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = buildCors(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let res;
      if (path === '/api/leases' && request.method === 'POST') {
        res = await createLease(request, env);
      } else if (path === '/api/leases' && request.method === 'GET') {
        res = await listLeases(request, env);
      } else if (path.match(/^\/api\/leases\/[^/]+$/) && request.method === 'PATCH') {
        res = await patchLease(request, env, path.split('/').pop());
      } else if (path.match(/^\/api\/leases\/[^/]+$/) && request.method === 'DELETE') {
        res = await deleteLease(request, env, path.split('/').pop());
      } else if (path === '/api/comps-pool' && request.method === 'GET') {
        res = await getCompsPool(env);
      } else {
        res = json({ error: 'not_found' }, 404);
      }
      // Splice CORS into the response
      const merged = new Headers(res.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => merged.set(k, v));
      return new Response(res.body, { status: res.status, headers: merged });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: 'server_error', detail: String(err) }), {
        status: 500,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }
  },
};

// -------------------------------------------------------------------------
// Endpoint handlers
// -------------------------------------------------------------------------

async function createLease(request, env) {
  const body = await request.json();
  if (!body.attested) return json({ error: 'attestation_required' }, 400);
  if (!body.email) return json({ error: 'email_required' }, 400);

  // Hash the email so we don't store the raw address as a queryable key
  const emailHash = await sha256(body.email.trim().toLowerCase());
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id: id,
    email_hash: emailHash,
    submitted_at: now,
    attested: true,
    opt_in_benchmarks: !!body.opt_in_benchmarks,
    bucket_size: body.bucket_size || null,
    bucket_rent: body.bucket_rent || null,
    submarket: body.submarket || null,
    building_id: body.building_id || null,
    // The full private payload — only ever read by the owning user
    private: body.private || {},
  };

  // Persist
  await env.LEASES.put(id, JSON.stringify(record));

  // Index by user
  const userKey = 'user:' + emailHash;
  const existing = await env.USERS.get(userKey, { type: 'json' }) || { lease_ids: [] };
  existing.lease_ids.unshift(id);
  await env.USERS.put(userKey, JSON.stringify(existing));

  // Add to anonymized comp pool if opted in
  if (record.opt_in_benchmarks && record.bucket_size && record.bucket_rent && record.submarket) {
    const compId = 'comp:' + id;
    await env.COMPS.put(compId, JSON.stringify({
      comp_id: compId,
      submarket: record.submarket,
      size_class: record.bucket_size,
      rent_class: record.bucket_rent,
      building_id: record.building_id || null,
      submitted_at: now,
      lease_id: id,
      source: 'tenant_attested_upload',
    }));
  }

  return json({ ok: true, id: id, submitted_at: now });
}

async function listLeases(request, env) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) return json({ error: 'email_required' }, 400);

  const emailHash = await sha256(email.trim().toLowerCase());
  const idx = await env.USERS.get('user:' + emailHash, { type: 'json' });
  if (!idx || !idx.lease_ids?.length) return json({ leases: [] });

  const leases = [];
  for (const id of idx.lease_ids) {
    const raw = await env.LEASES.get(id);
    if (raw) leases.push(JSON.parse(raw));
  }
  return json({ leases });
}

async function patchLease(request, env, id) {
  const body = await request.json();
  const raw = await env.LEASES.get(id);
  if (!raw) return json({ error: 'not_found' }, 404);
  const record = JSON.parse(raw);

  // Verify caller owns this record
  if (!body.email) return json({ error: 'email_required' }, 401);
  const emailHash = await sha256(body.email.trim().toLowerCase());
  if (emailHash !== record.email_hash) return json({ error: 'forbidden' }, 403);

  // Permitted patches
  if (typeof body.opt_in_benchmarks === 'boolean') {
    record.opt_in_benchmarks = body.opt_in_benchmarks;
  }

  await env.LEASES.put(id, JSON.stringify(record));

  // Sync the comp pool
  const compId = 'comp:' + id;
  if (record.opt_in_benchmarks && record.bucket_size && record.bucket_rent && record.submarket) {
    await env.COMPS.put(compId, JSON.stringify({
      comp_id: compId,
      submarket: record.submarket,
      size_class: record.bucket_size,
      rent_class: record.bucket_rent,
      building_id: record.building_id || null,
      submitted_at: record.submitted_at,
      lease_id: id,
      source: 'tenant_attested_upload',
    }));
  } else {
    await env.COMPS.delete(compId);
  }

  return json({ ok: true });
}

async function deleteLease(request, env, id) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) return json({ error: 'email_required' }, 401);

  const raw = await env.LEASES.get(id);
  if (!raw) return json({ ok: true }); // already gone
  const record = JSON.parse(raw);

  const emailHash = await sha256(email.trim().toLowerCase());
  if (emailHash !== record.email_hash) return json({ error: 'forbidden' }, 403);

  // Remove the record + its comp pool entry
  await env.LEASES.delete(id);
  await env.COMPS.delete('comp:' + id);

  // Update the user index
  const userKey = 'user:' + emailHash;
  const idx = await env.USERS.get(userKey, { type: 'json' });
  if (idx?.lease_ids) {
    idx.lease_ids = idx.lease_ids.filter(x => x !== id);
    await env.USERS.put(userKey, JSON.stringify(idx));
  }

  return json({ ok: true });
}

async function getCompsPool(env) {
  // Walk the COMPS namespace, group by (submarket, size_class), aggregate
  const allComps = [];
  let cursor = undefined;
  do {
    const list = await env.COMPS.list({ cursor, limit: 1000 });
    cursor = list.cursor;
    for (const k of list.keys) {
      const raw = await env.COMPS.get(k.name);
      if (raw) allComps.push(JSON.parse(raw));
    }
    if (list.list_complete) break;
  } while (cursor);

  // Time-delay filter: comps must be >= TIME_DELAY_DAYS old to count
  const cutoff = Date.now() - TIME_DELAY_DAYS * 86400 * 1000;
  const eligible = allComps.filter(c => {
    const t = Date.parse(c.submitted_at);
    return isNaN(t) ? true : t <= cutoff;
  });

  const cells = {};
  for (const c of eligible) {
    if (!c.rent_class || !c.submarket || !c.size_class) continue;
    const key = c.submarket + '|' + c.size_class;
    if (!cells[key]) cells[key] = { submarket: c.submarket, size_class: c.size_class, comps: [], buildings: new Set() };
    cells[key].comps.push(c);
    if (c.building_id) cells[key].buildings.add(c.building_id);
  }

  const benchmarks = [];
  for (const k in cells) {
    const cell = cells[k];
    if (cell.comps.length < MIN_COMPS_PER_CELL) continue;
    if (cell.buildings.size < MIN_BUILDINGS_PER_CELL) continue;
    const rents = cell.comps.map(c => parseInt(c.rent_class.replace(/[^0-9]/g, ''), 10)).filter(n => !isNaN(n));
    if (!rents.length) continue;
    rents.sort((a,b) => a - b);
    benchmarks.push({
      submarket: cell.submarket,
      size_class: cell.size_class,
      comp_count: cell.comps.length,
      rent_low: rents[0],
      rent_high: rents[rents.length - 1] + 1,
      rent_avg: Math.round((rents.reduce((a,b)=>a+b,0) / rents.length) * 10) / 10,
    });
  }
  benchmarks.sort((a,b) => -(a.comp_count - b.comp_count));

  return json({
    meta: {
      total_comps: allComps.length,
      eligible_comps: eligible.length,
      generated_at: new Date().toISOString(),
      rules: { MIN_COMPS_PER_CELL, MIN_BUILDINGS_PER_CELL, TIME_DELAY_DAYS },
    },
    benchmarks,
  });
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function buildCors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'access-control-allow-origin': ok,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, x-industrio-email',
    'vary': 'Origin',
  };
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
