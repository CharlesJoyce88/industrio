// ============================================================================
// market-intel.js — Market Intelligence page logic
//
// DATA SOURCE SWAP POINT:
//   Today this page is powered by MI_DEMO_DATA + REGION_PROFILES below. Time
//   series are generated deterministically from per-region baseline profiles
//   so the page feels fully populated even with no live data.
//
//   When the Realm / TRREB API is ready, the swap is:
//     1. loadMIData() -> fetch('/api/market-intel/baseline')
//     2. generateTimeseries() -> fetch('/api/market-intel/series?region=&size=&status=&months=')
//   Every renderer reads from the same shape, so no UI code needs to change.
// ============================================================================

(function(){
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. TRREB municipality list (used by the Region filter)
  // ---------------------------------------------------------------------------
  var TRREB_REGIONS = [
    { value: 'gta',                    label: 'All GTA',      parent: null },
    // Toronto (W01-W10, E01-E11, C01-C15 — collapsed to one entry for v1)
    { value: 'toronto',                label: 'Toronto',               parent: 'Toronto' },
    // Peel
    { value: 'mississauga',            label: 'Mississauga',           parent: 'Peel' },
    { value: 'brampton',               label: 'Brampton',              parent: 'Peel' },
    { value: 'caledon',                label: 'Caledon',               parent: 'Peel' },
    // York
    { value: 'vaughan',                label: 'Vaughan',               parent: 'York' },
    { value: 'markham',                label: 'Markham',               parent: 'York' },
    { value: 'richmond-hill',          label: 'Richmond Hill',         parent: 'York' },
    { value: 'aurora',                 label: 'Aurora',                parent: 'York' },
    { value: 'newmarket',              label: 'Newmarket',             parent: 'York' },
    { value: 'king',                   label: 'King',                  parent: 'York' },
    { value: 'whitchurch-stouffville', label: 'Whitchurch-Stouffville',parent: 'York' },
    // Halton
    { value: 'oakville',               label: 'Oakville',              parent: 'Halton' },
    { value: 'burlington',             label: 'Burlington',            parent: 'Halton' },
    { value: 'milton',                 label: 'Milton',                parent: 'Halton' },
    { value: 'halton-hills',           label: 'Halton Hills',          parent: 'Halton' },
    // Durham
    { value: 'pickering',              label: 'Pickering',             parent: 'Durham' },
    { value: 'ajax',                   label: 'Ajax',                  parent: 'Durham' },
    { value: 'whitby',                 label: 'Whitby',                parent: 'Durham' },
    { value: 'oshawa',                 label: 'Oshawa',                parent: 'Durham' },
    { value: 'clarington',             label: 'Clarington',            parent: 'Durham' }
  ];

  // Size bands — exactly the brackets Charles specified.
  var SIZE_BANDS = [
    { value: 'all',         label: 'All sizes',           min: 0,       max: 999999999 },
    { value: '0-2500',      label: '0 – 2,500 SF',        min: 0,       max: 2500      },
    { value: '2501-5000',   label: '2,501 – 5,000 SF',    min: 2501,    max: 5000      },
    { value: '5001-10000',  label: '5,001 – 10,000 SF',   min: 5001,    max: 10000     },
    { value: '10001-20000', label: '10,001 – 20,000 SF',  min: 10001,   max: 20000     },
    { value: '20001-30000', label: '20,001 – 30,000 SF',  min: 20001,   max: 30000     },
    { value: '30001-40000', label: '30,001 – 40,000 SF',  min: 30001,   max: 40000     },
    { value: '40001-50000', label: '40,001 – 50,000 SF',  min: 40001,   max: 50000     }
  ];

  var TIMELINES = [
    { value: '6m', label: '6 months', months: 6 },
    { value: '1y', label: '1 year',   months: 12 },
    { value: '3y', label: '3 years',  months: 36 },
    { value: '5y', label: '5 years',  months: 60 }
  ];
  var PROP_TYPES = [
    { value: 'all',          label: 'All types' },
    { value: 'freestanding', label: 'Freestanding' },
    { value: 'multi-tenant', label: 'Multi-tenant' }
  ];
  var STATUSES = [
    { value: 'leased', label: 'Leased' },
    { value: 'sold',   label: 'Sold' }
  ];

  // ---------------------------------------------------------------------------
  // 2. Per-region baseline profiles that feed the time-series generator.
  //    Numbers are plausible 2026 GTA industrial figures.
  // ---------------------------------------------------------------------------
  var REGION_PROFILES = {
    // key: { base_rent ($/SF net), base_dom (days), base_listings (per month), growth_1y (decimal) }
    'gta':                    { base_rent: 17.80, base_dom: 74,  base_listings: 42, growth_1y: 0.055 },
    'toronto':                { base_rent: 19.50, base_dom: 62,  base_listings: 28, growth_1y: 0.048 },
    'mississauga':            { base_rent: 17.80, base_dom: 68,  base_listings: 36, growth_1y: 0.062 },
    'brampton':               { base_rent: 17.20, base_dom: 72,  base_listings: 18, growth_1y: 0.058 },
    'caledon':                { base_rent: 16.50, base_dom: 110, base_listings: 4,  growth_1y: 0.050 },
    'vaughan':                { base_rent: 18.80, base_dom: 68,  base_listings: 22, growth_1y: 0.070 },
    'markham':                { base_rent: 18.25, base_dom: 65,  base_listings: 14, growth_1y: 0.065 },
    'richmond-hill':          { base_rent: 18.50, base_dom: 78,  base_listings: 7,  growth_1y: 0.060 },
    'aurora':                 { base_rent: 16.80, base_dom: 92,  base_listings: 3,  growth_1y: 0.045 },
    'newmarket':              { base_rent: 16.20, base_dom: 85,  base_listings: 4,  growth_1y: 0.040 },
    'king':                   { base_rent: 15.80, base_dom: 130, base_listings: 1,  growth_1y: 0.035 },
    'whitchurch-stouffville': { base_rent: 16.00, base_dom: 115, base_listings: 2,  growth_1y: 0.040 },
    'oakville':               { base_rent: 17.60, base_dom: 78,  base_listings: 8,  growth_1y: 0.055 },
    'burlington':             { base_rent: 16.90, base_dom: 85,  base_listings: 7,  growth_1y: 0.050 },
    'milton':                 { base_rent: 17.40, base_dom: 72,  base_listings: 5,  growth_1y: 0.060 },
    'halton-hills':           { base_rent: 15.90, base_dom: 105, base_listings: 2,  growth_1y: 0.045 },
    'pickering':              { base_rent: 15.80, base_dom: 92,  base_listings: 5,  growth_1y: 0.050 },
    'ajax':                   { base_rent: 15.50, base_dom: 95,  base_listings: 4,  growth_1y: 0.048 },
    'whitby':                 { base_rent: 15.40, base_dom: 90,  base_listings: 4,  growth_1y: 0.046 },
    'oshawa':                 { base_rent: 14.80, base_dom: 102, base_listings: 5,  growth_1y: 0.044 },
    'clarington':             { base_rent: 14.50, base_dom: 115, base_listings: 2,  growth_1y: 0.040 }
  };

  // Size-band multipliers applied to the base profile.
  // Smaller units: higher $/SF, fewer listings, slightly longer DOM.
  function sizeBandAdjust(bandValue){
    var m = {
      'all':         { rent: 1.00, price: 1.00, listings: 1.00, dom: 1.00 },
      '0-2500':      { rent: 1.15, price: 1.25, listings: 0.40, dom: 1.00 },
      '2501-5000':   { rent: 1.10, price: 1.15, listings: 0.60, dom: 0.95 },
      '5001-10000':  { rent: 1.05, price: 1.08, listings: 0.80, dom: 0.92 },
      '10001-20000': { rent: 1.00, price: 1.00, listings: 0.90, dom: 0.95 },
      '20001-30000': { rent: 0.95, price: 0.95, listings: 0.50, dom: 1.05 },
      '30001-40000': { rent: 0.92, price: 0.92, listings: 0.30, dom: 1.15 },
      '40001-50000': { rent: 0.90, price: 0.90, listings: 0.20, dom: 1.25 }
    };
    return m[bandValue] || m['all'];
  }
  // Property-type multiplier.
  function propTypeAdjust(pt){
    if (pt === 'freestanding') return { rent: 1.06, price: 1.10, listings: 0.35, dom: 1.10 };
    if (pt === 'multi-tenant') return { rent: 0.97, price: 0.94, listings: 1.20, dom: 0.90 };
    return { rent: 1.00, price: 1.00, listings: 1.00, dom: 1.00 };
  }

  // Deterministic RNG so the same filter combo always generates the same data.
  function hashSeed(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function seededRng(seed){ var s = seed >>> 0; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; }; }

  // Generate 60 months of history. Callers slice to the requested timeline.
  function generateTimeseries(region, status, size, prop){
    var p = REGION_PROFILES[region] || REGION_PROFILES['gta'];
    var sb = sizeBandAdjust(size);
    var ptAdj = propTypeAdjust(prop);
    var rng = seededRng(hashSeed([region, status, size, prop].join('|')));

    // Today's "end" value, then walk backwards applying growth and noise.
    var baseRateEnd = (status === 'sold')
      ? (p.base_rent * 17) * sb.price * ptAdj.price      // ~17x gross income multiple for a crude sale $/SF
      : (p.base_rent)       * sb.rent  * ptAdj.rent;
    var baseDomEnd = p.base_dom * sb.dom * ptAdj.dom;
    var baseListEnd = p.base_listings * sb.listings * ptAdj.listings;
    var growth = p.growth_1y * (status === 'sold' ? 1.5 : 1.0);  // sale prices grew faster

    var now = new Date();
    var out = [];
    for (var i = 59; i >= 0; i--){
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var years = i / 12;
      // Rate: deflate from today's level to show historical trend
      var rate = baseRateEnd / Math.pow(1 + growth, years);
      // ± noise so the line isn't a boring curve
      var rnoise = 1 + (rng() - 0.5) * 0.06;
      var lnoise = 1 + (rng() - 0.5) * 0.4;
      var dnoise = 1 + (rng() - 0.5) * 0.25;
      // Seasonal bump: more listings Mar-Jun & Sep-Nov
      var month = d.getMonth();
      var seasonal = (month >= 2 && month <= 5) || (month >= 8 && month <= 10) ? 1.15 : 0.9;
      out.push({
        month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        date: d,
        median_rate: Math.max(1, rate * rnoise),
        new_listings: Math.max(1, Math.round(baseListEnd * seasonal * lnoise)),
        median_dom: Math.max(14, Math.round(baseDomEnd * dnoise))
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // 3. Snapshot data for the existing four secondary charts (unchanged).
  // ---------------------------------------------------------------------------
  var MI_DEMO_DATA = {
    meta: { period: "GTA 2026", deal_count: 610, last_updated: "2026-05-05", source: "DEMO" },
    regions: [
      { name: "Peel",    deals: 230, median_asking: 17.75, median_achieved: 17.50, median_dom: 68, median_tmi: 6.10 },
      { name: "Toronto", deals: 161, median_asking: 19.25, median_achieved: 18.90, median_dom: 62, median_tmi: 7.20 },
      { name: "York",    deals: 142, median_asking: 18.50, median_achieved: 18.20, median_dom: 71, median_tmi: 6.40 },
      { name: "Halton",  deals: 41,  median_asking: 17.00, median_achieved: 16.65, median_dom: 85, median_tmi: 5.80 },
      { name: "Durham",  deals: 36,  median_asking: 15.50, median_achieved: 15.10, median_dom: 95, median_tmi: 5.20 }
    ],
    top_communities: [
      { name: "Northeast (Mississauga)",  region: "Peel",    deals: 106 },
      { name: "Concord (Vaughan)",        region: "York",    deals: 41 },
      { name: "Milliken Mills West",      region: "York",    deals: 34 },
      { name: "West Humber-Clairville",   region: "Toronto", deals: 26 },
      { name: "Western Business Park",    region: "Peel",    deals: 25 },
      { name: "QE Queen Elizabeth",       region: "Peel",    deals: 20 },
      { name: "York University Heights",  region: "Toronto", deals: 20 },
      { name: "Humber Summit",            region: "Toronto", deals: 18 },
      { name: "Milliken",                 region: "York",    deals: 13 },
      { name: "Dixie",                    region: "Peel",    deals: 12 },
      { name: "Gateway",                  region: "Peel",    deals: 12 },
      { name: "Brock Industrial",         region: "Durham",  deals: 11 }
    ],
    dom_buckets: [
      { label: "0–14",   count: 148 }, { label: "15–30",  count: 92 },
      { label: "31–60",  count: 114 }, { label: "61–90",  count: 103 },
      { label: "91–180", count: 108 }, { label: "181+",   count: 44 }
    ],
    spread: { gta_median_asking: 18.00, gta_median_achieved: 18.00, pct_close: 99 },
    sample_comps: [
      { address: "1030 Kamato Rd, Unit 13-15", city: "Mississauga", submarket: "Northeast",  size_sf: 9055,  net_rent_psf: 15.00, achieved_psf: 14.50, status: "leased" },
      { address: "5511 Tomken Rd, Unit 4-5",   city: "Mississauga", submarket: "Northeast",  size_sf: 4182,  net_rent_psf: 15.00, achieved_psf: null,  status: "for_lease" },
      { address: "2446 Cawthra Rd, Unit B4-6", city: "Mississauga", submarket: "Dixie",      size_sf: 2268,  net_rent_psf: 16.50, achieved_psf: 15.50, status: "leased" },
      { address: "2446 Cawthra Rd, Unit B4-2", city: "Mississauga", submarket: "Dixie",      size_sf: 2283,  net_rent_psf: 16.50, achieved_psf: 16.00, status: "leased" },
      { address: "7700 Pine Valley Dr",        city: "Vaughan",     submarket: "Concord",    size_sf: 16500, net_rent_psf: 18.20, achieved_psf: null,  status: "for_lease" },
      { address: "2700 Steeles Ave W, Unit 8", city: "Vaughan",     submarket: "Concord",    size_sf: 16800, net_rent_psf: 17.25, achieved_psf: null,  status: "for_lease" },
      { address: "8500 Keele St Unit 12",      city: "Vaughan",     submarket: "Concord",    size_sf: 13500, net_rent_psf: 18.75, achieved_psf: 17.40, status: "leased" },
      { address: "120 Walker Dr",              city: "Brampton",    submarket: "Brampton N", size_sf: 15800, net_rent_psf: 17.00, achieved_psf: 15.85, status: "leased" },
      { address: "80 Dynamic Dr",              city: "Scarborough", submarket: "Golden Mile",size_sf: 12200, net_rent_psf: 15.60, achieved_psf: null,  status: "for_lease" },
      { address: "500 Main St N",              city: "Markham",     submarket: "Markham E",  size_sf: 18000, net_rent_psf: 19.00, achieved_psf: 18.40, status: "leased" }
    ]
  };

  function loadMIData(){ return Promise.resolve(MI_DEMO_DATA); }

  var COLORS = {
    primary:  '#0d9488', deep: '#0f1e4e', accent: '#5b21b6',
    warm:     '#b45309', muted: '#94a3b8', grid: '#e5e7eb'
  };

  // ---------------------------------------------------------------------------
  // 4. Filter state (single source of truth)
  // ---------------------------------------------------------------------------
  var state = {
    region: 'gta',
    propType: 'all',
    timeline: '1y',
    status: 'leased',
    size: 'all'
  };

  function labelFor(list, value){
    var hit = list.find(function(x){ return x.value === value; });
    return hit ? hit.label : value;
  }

  // ---------------------------------------------------------------------------
  // 5. Headline tiles
  // ---------------------------------------------------------------------------
  function renderHeadline(){
    // Always use the full 60-month series so we can compute 1y/3y/5y deltas.
    var series = generateTimeseries(state.region, state.status, state.size, state.propType);
    var last = series[series.length - 1];
    var oneAgo = series[series.length - 13]  || series[0];
    var threeAgo = series[series.length - 37] || series[0];
    var fiveAgo  = series[0];

    setText('miHeadMedian',       '$' + last.median_rate.toFixed(2));
    setText('miHeadMedianUnit',   state.status === 'sold' ? ' / SF' : ' / SF net');
    setText('miHeadListings',     last.new_listings);
    setText('miHeadDom',          last.median_dom + ' days');

    paintPct('miHead1y', last.median_rate, oneAgo.median_rate);
    paintPct('miHead3y', last.median_rate, threeAgo.median_rate);
    paintPct('miHead5y', last.median_rate, fiveAgo.median_rate);

    var reg = labelFor(TRREB_REGIONS, state.region);
    var sb  = labelFor(SIZE_BANDS, state.size);
    var st  = labelFor(STATUSES, state.status);
    var pt  = labelFor(PROP_TYPES, state.propType);
    setText('miHeadContext', reg + ' · ' + sb + ' · ' + pt + ' · ' + st);
  }
  function paintPct(id, now, then){
    var el = document.getElementById(id);
    if (!el || !isFinite(now) || !isFinite(then) || then === 0) { if (el) el.textContent = '—'; return; }
    var pct = (now - then) / then * 100;
    el.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    el.style.color = pct >= 0 ? '#047857' : '#b91c1c';
  }
  function setText(id, v){ var el = document.getElementById(id); if (el) el.textContent = v; }

  // ---------------------------------------------------------------------------
  // 6. Time-series combined chart (median rate line + DOM bar)
  // ---------------------------------------------------------------------------
  var timeseriesChart = null;
  function renderTimeseriesChart(){
    var ctx = document.getElementById('chartTimeseries');
    if (!ctx || typeof Chart === 'undefined') return;
    if (timeseriesChart) { timeseriesChart.destroy(); timeseriesChart = null; }
    var months = (TIMELINES.find(function(t){ return t.value === state.timeline; }) || {months: 12}).months;
    var full = generateTimeseries(state.region, state.status, state.size, state.propType);
    var series = full.slice(full.length - months);
    var isSale = state.status === 'sold';
    var labels = series.map(function(p){
      var m = p.date.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
      return m;
    });

    timeseriesChart = new Chart(ctx, {
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: isSale ? 'Median $/SF sold' : 'Median $/SF net',
            data: series.map(function(p){ return +p.median_rate.toFixed(2); }),
            borderColor: COLORS.primary,
            backgroundColor: 'rgba(13, 148, 136, 0.14)',
            fill: true, tension: 0.35, pointRadius: 2, yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Median DOM (days)',
            data: series.map(function(p){ return p.median_dom; }),
            backgroundColor: 'rgba(91, 33, 182, 0.55)',
            borderRadius: 3, yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: {
            label: function(c){
              if (c.dataset.label.indexOf('DOM') >= 0) return 'DOM: ' + c.raw + ' days';
              return (isSale ? 'Sold: $' : 'Net: $') + c.raw;
            }
          } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y:  { position: 'left',  grid: { color: COLORS.grid }, ticks: { font: { size: 11 }, callback: function(v){ return '$' + v; } }, title: { display: true, text: isSale ? '$/SF sold' : '$/SF net', color: COLORS.muted, font: { size: 11 } } },
          y1: { position: 'right', grid: { display: false },    ticks: { font: { size: 11 } },                                  title: { display: true, text: 'Days on market',       color: COLORS.muted, font: { size: 11 } } }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Existing four secondary charts (preserved; they show GTA-wide snapshot)
  // ---------------------------------------------------------------------------
  function sharedChartOpts(){
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { padding: 10, boxPadding: 4 } },
      scales: { x: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } },
                y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } } }
    };
  }
  function renderRegionChart(data){
    var ctx = document.getElementById('chartRegion'); if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: { labels: data.regions.map(function(r){ return r.name; }),
              datasets: [{ label: 'Deals closed',
                data: data.regions.map(function(r){ return r.deals; }),
                backgroundColor: COLORS.primary, borderRadius: 4 }] },
      options: Object.assign(sharedChartOpts(), {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: function(c){
            return c.raw + ' deals · ' + Math.round(c.raw / data.meta.deal_count * 100) + '% of GTA';
          } }
        } }
      })
    });
  }
  function renderSubmarketsChart(data){
    var ctx = document.getElementById('chartSubmarkets'); if (!ctx) return;
    var short = function(n){ return n.length > 22 ? n.slice(0, 20) + '…' : n; };
    new Chart(ctx, {
      type: 'bar',
      data: { labels: data.top_communities.map(function(c){ return short(c.name); }),
              datasets: [{ label: 'Deals',
                data: data.top_communities.map(function(c){ return c.deals; }),
                backgroundColor: COLORS.accent, borderRadius: 3 }] },
      options: Object.assign(sharedChartOpts(), {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: {
            title: function(items){ return data.top_communities[items[0].dataIndex].name; },
            label: function(c){ var row = data.top_communities[c.dataIndex]; return row.deals + ' deals · ' + row.region; }
          }
        } }
      })
    });
  }
  function renderSpreadChart(data){
    var ctx = document.getElementById('chartSpread'); if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: { labels: data.regions.map(function(r){ return r.name; }),
              datasets: [
                { label: 'Median asking',   data: data.regions.map(function(r){ return r.median_asking; }),   backgroundColor: COLORS.muted,   borderRadius: 3 },
                { label: 'Median achieved', data: data.regions.map(function(r){ return r.median_achieved; }), backgroundColor: COLORS.primary, borderRadius: 3 }
              ] },
      options: Object.assign(sharedChartOpts(), {
        plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': $' + c.raw.toFixed(2) + ' / SF net'; } } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 }, callback: function(v){ return '$' + v; } } } }
      })
    });
  }
  function renderDomChart(data){
    var ctx = document.getElementById('chartDom'); if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: { labels: data.dom_buckets.map(function(b){ return b.label; }),
              datasets: [{ label: 'Deals',
                data: data.dom_buckets.map(function(b){ return b.count; }),
                backgroundColor: data.dom_buckets.map(function(b){
                  return b.label === '0–14' ? COLORS.primary :
                         b.label === '15–30' ? '#14b8a6' :
                         b.label === '31–60' ? '#64748b' :
                         b.label === '61–90' ? '#94a3b8' :
                         b.label === '91–180' ? '#b45309' : '#7c2d12';
                }), borderRadius: 3 }] },
      options: Object.assign(sharedChartOpts(), {
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: function(c){ return c.raw + ' deals (' + Math.round(c.raw / data.meta.deal_count * 100) + '% of GTA)'; } } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } }, title: { display: true, text: 'Days on market', font: { size: 11 }, color: COLORS.muted } },
                  y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } } }
      })
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Region drill-down (unchanged)
  // ---------------------------------------------------------------------------
  function renderRegionPicker(data){
    var el = document.getElementById('miRegionPicker'); if (!el) return;
    el.innerHTML = data.regions.map(function(r){
      return '<button class="mi-region-btn" type="button" data-region="' + r.name + '"><b>' + r.name + '</b><span>' + r.deals + ' deals</span></button>';
    }).join('');
    el.addEventListener('click', function(e){
      var b = e.target.closest('.mi-region-btn'); if (!b) return;
      el.querySelectorAll('.mi-region-btn').forEach(function(x){ x.classList.toggle('active', x === b); });
      renderRegionDetail(data, b.dataset.region);
    });
  }
  function renderRegionDetail(data, name){
    var el = document.getElementById('miRegionDetail'); if (!el) return;
    var r = data.regions.find(function(x){ return x.name === name; }); if (!r) return;
    var communities = data.top_communities.filter(function(c){ return c.region === name; });
    var pct = Math.round((r.deals / data.meta.deal_count) * 100);
    el.removeAttribute('hidden');
    el.innerHTML =
      '<h4>' + r.name + ' — ' + r.deals + ' deals (' + pct + '% of GTA)</h4>' +
      '<div class="mi-region-stats">' +
        '<div class="mi-region-stat"><div class="lbl">Median asking</div><div class="val">$' + r.median_asking.toFixed(2) + '</div></div>' +
        '<div class="mi-region-stat"><div class="lbl">Median achieved</div><div class="val">$' + r.median_achieved.toFixed(2) + '</div></div>' +
        '<div class="mi-region-stat"><div class="lbl">Median TMI</div><div class="val">$' + r.median_tmi.toFixed(2) + '</div></div>' +
        '<div class="mi-region-stat"><div class="lbl">Median DOM</div><div class="val">' + r.median_dom + ' days</div></div>' +
      '</div>' +
      (communities.length ?
        '<div style="font-size:0.84rem; color:var(--text-muted); margin-bottom:6px;">Top communities in ' + r.name + ':</div>' +
        '<div class="mi-comm-pills">' + communities.map(function(c){ return '<span class="mi-comm-pill">' + c.name.replace(/\(.+\)/, '').trim() + '<b>' + c.deals + '</b></span>'; }).join('') + '</div>'
      : '<div style="font-size:0.84rem; color:var(--text-muted);">No top-12 communities from this region in the sample.</div>');
  }

  // ---------------------------------------------------------------------------
  // 9. Address report widget (unchanged)
  // ---------------------------------------------------------------------------
  function initReport(data){
    var btn = document.getElementById('miReportBtn'); var input = document.getElementById('miReportAddress');
    if (!btn || !input) return;
    function go(){ var q = (input.value || '').trim().toLowerCase(); if (!q){ input.focus(); return; } runReport(data, q); }
    btn.addEventListener('click', go);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
  }
  function runReport(data, q){
    var tokens = q.split(/[,\s]+/).filter(Boolean);
    var hitCity = null, hitSubmarket = null;
    data.sample_comps.forEach(function(c){
      if (tokens.indexOf(c.city.toLowerCase()) >= 0) hitCity = c.city;
      if (tokens.indexOf((c.submarket || '').toLowerCase()) >= 0) hitSubmarket = c.submarket;
    });
    var scored = data.sample_comps.map(function(c){
      var hay = (c.address + ' ' + c.city + ' ' + (c.submarket || '')).toLowerCase();
      var score = 0; tokens.forEach(function(t){ if (hay.indexOf(t) >= 0) score += t.length; });
      if (hitCity && c.city === hitCity) score += 10;
      if (hitSubmarket && c.submarket === hitSubmarket) score += 15;
      return { comp: c, score: score };
    }).sort(function(a, b){ return b.score - a.score; });
    var top = scored.filter(function(s){ return s.score > 0; }).slice(0, 5);
    if (!top.length) top = scored.slice(0, 5);
    var subRents = (hitSubmarket ? data.sample_comps.filter(function(c){ return c.submarket === hitSubmarket; }).map(function(c){ return c.net_rent_psf; }) : []).filter(function(x){ return x; });
    var subMedian = subRents.length ? median(subRents) : null;
    var wrap = document.getElementById('miReportResults'); wrap.classList.add('on');
    var subLabel = hitSubmarket ? hitSubmarket : (hitCity || 'GTA avg');
    document.getElementById('miReportSubMedian').textContent = subMedian ? '$' + subMedian.toFixed(2) : '$' + data.spread.gta_median_asking.toFixed(2);
    document.getElementById('miReportGtaMedian').textContent = '$' + data.spread.gta_median_asking.toFixed(2);
    var vs = document.getElementById('miReportVs');
    if (subMedian) {
      var pct = (subMedian - data.spread.gta_median_asking) / data.spread.gta_median_asking * 100;
      vs.textContent = subLabel + ' runs ' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '% vs. GTA median';
      vs.style.color = Math.abs(pct) < 3 ? 'var(--text-muted)' : (pct > 0 ? '#b45309' : '#047857');
    } else {
      vs.textContent = 'No submarket-specific median in demo data yet.';
      vs.style.color = 'var(--text-muted)';
    }
    document.getElementById('miReportCompsTitle').textContent = top.length ? ('Top ' + top.length + ' matches') : 'No matches';
    document.getElementById('miReportComps').innerHTML = top.map(function(s){
      var c = s.comp; var rate = c.achieved_psf || c.net_rent_psf;
      return '<div class="mi-report-comp">' +
        '<div><div class="addr">' + c.address + '</div>' +
          '<div class="meta">' + c.city + (c.submarket ? ' · ' + c.submarket : '') + ' · ' + c.size_sf.toLocaleString('en-CA') + ' SF · ' + (c.status === 'leased' ? 'Leased' : 'For lease') + '</div></div>' +
        '<div class="rate">$' + rate.toFixed(2) + '<div class="meta">/ SF net</div></div>' +
      '</div>';
    }).join('') || '<div class="mi-report-empty">No comps matched. Try a city name (Mississauga, Vaughan, Brampton, Markham, Scarborough).</div>';
  }
  function median(arr){ var xs = arr.slice().sort(function(a,b){ return a-b; }); var n = xs.length; return n % 2 ? xs[(n-1)/2] : (xs[n/2-1]+xs[n/2])/2; }

  // ---------------------------------------------------------------------------
  // 10. Filter UI — populate selects + pill groups + wire change events
  // ---------------------------------------------------------------------------
  function initFilters(){
    // Region <select> grouped by parent region
    var regionSel = document.getElementById('miFilterRegion');
    if (regionSel){
      regionSel.innerHTML = '';
      var byParent = {};
      TRREB_REGIONS.forEach(function(r){
        if (r.value === 'gta'){
          var o = document.createElement('option'); o.value = r.value; o.textContent = r.label;
          regionSel.appendChild(o); return;
        }
        if (!byParent[r.parent]) byParent[r.parent] = [];
        byParent[r.parent].push(r);
      });
      Object.keys(byParent).forEach(function(p){
        var group = document.createElement('optgroup'); group.label = p;
        byParent[p].forEach(function(r){
          var o = document.createElement('option'); o.value = r.value; o.textContent = r.label;
          group.appendChild(o);
        });
        regionSel.appendChild(group);
      });
      regionSel.value = state.region;
      regionSel.addEventListener('change', function(){ state.region = regionSel.value; refresh(); });
    }

    // Size <select>
    var sizeSel = document.getElementById('miFilterSize');
    if (sizeSel){
      sizeSel.innerHTML = '';
      SIZE_BANDS.forEach(function(b){ var o = document.createElement('option'); o.value = b.value; o.textContent = b.label; sizeSel.appendChild(o); });
      sizeSel.value = state.size;
      sizeSel.addEventListener('change', function(){ state.size = sizeSel.value; refresh(); });
    }

    // Pill groups (timeline, propType, status)
    document.querySelectorAll('[data-pill-group]').forEach(function(group){
      var key = group.dataset.pillGroup;
      group.querySelectorAll('button[data-value]').forEach(function(b){
        if (b.dataset.value === state[key]) b.classList.add('active');
        b.addEventListener('click', function(){
          state[key] = b.dataset.value;
          group.querySelectorAll('button[data-value]').forEach(function(x){ x.classList.toggle('active', x === b); });
          refresh();
        });
      });
    });
  }

  function refresh(){
    renderHeadline();
    renderTimeseriesChart();
  }

  // ---------------------------------------------------------------------------
  // 11. Boot
  // ---------------------------------------------------------------------------
  function boot(){
    loadMIData().then(function(data){
      // One-off: the pct_close in the four-chart footer
      var sp = document.getElementById('miSpreadPct'); if (sp) sp.textContent = data.spread.pct_close + '%';

      initFilters();
      refresh();

      if (typeof Chart !== 'undefined'){
        renderRegionChart(data);
        renderSubmarketsChart(data);
        renderSpreadChart(data);
        renderDomChart(data);
      } else {
        console.warn('[market-intel] Chart.js not loaded — secondary charts skipped');
      }
      renderRegionPicker(data);
      initReport(data);
      console.log('[market-intel] booted · ' + data.meta.deal_count + ' deals · ' + TRREB_REGIONS.length + ' TRREB regions · ' + SIZE_BANDS.length + ' size bands · (' + data.meta.source + ')');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
