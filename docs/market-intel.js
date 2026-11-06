// ============================================================================
// market-intel.js — Market Intelligence page logic
//
// DATA SOURCE SWAP POINT:
//   Today this page is powered by the MI_DEMO_DATA object below. It's
//   realistic-looking sample data that lets us build the UI first and plug in
//   real Realm / TRREB data later without touching any of the rendering code.
//
//   When the Realm API is ready, the ONLY change needed is to rewrite
//   loadMIData() to `return fetch('/api/market-intel').then(r => r.json())`
//   (or whatever the endpoint ends up being). Everything downstream works off
//   the returned object, so the UI doesn't notice the switch.
// ============================================================================

(function(){
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. Demo data — shaped exactly like what the real API will return.
  // ---------------------------------------------------------------------------
  var MI_DEMO_DATA = {
    meta: {
      period: "GTA 2026",
      deal_count: 610,
      last_updated: "2026-05-05",
      source: "DEMO — replace with Realm/TRREB API when wired"
    },
    // Overall headline stats (used by the hero tiles — hardcoded in HTML today,
    // but will migrate here eventually).
    overall: {
      median_asking_psf: 18.00,
      median_achieved_psf: 18.00,
      median_tmi_psf: 6.00,
      median_dom_days: 74,
      pct_close_rate: 99
    },
    // Regional breakdown — total deal counts across the 5 GTA regions.
    regions: [
      { name: "Peel",    deals: 230, median_asking: 17.75, median_achieved: 17.50, median_dom: 68,  median_tmi: 6.10 },
      { name: "Toronto", deals: 161, median_asking: 19.25, median_achieved: 18.90, median_dom: 62,  median_tmi: 7.20 },
      { name: "York",    deals: 142, median_asking: 18.50, median_achieved: 18.20, median_dom: 71,  median_tmi: 6.40 },
      { name: "Halton",  deals: 41,  median_asking: 17.00, median_achieved: 16.65, median_dom: 85,  median_tmi: 5.80 },
      { name: "Durham",  deals: 36,  median_asking: 15.50, median_achieved: 15.10, median_dom: 95,  median_tmi: 5.20 }
    ],
    // Top submarkets by deal volume (for the bar chart + region drill-down).
    top_communities: [
      { name: "Northeast (Mississauga)",  region: "Peel",    deals: 106 },
      { name: "Concord (Vaughan)",         region: "York",    deals: 41 },
      { name: "Milliken Mills West",       region: "York",    deals: 34 },
      { name: "West Humber-Clairville",    region: "Toronto", deals: 26 },
      { name: "Western Business Park",     region: "Peel",    deals: 25 },
      { name: "QE Queen Elizabeth",        region: "Peel",    deals: 20 },
      { name: "York University Heights",   region: "Toronto", deals: 20 },
      { name: "Humber Summit",             region: "Toronto", deals: 18 },
      { name: "Milliken",                  region: "York",    deals: 13 },
      { name: "Dixie",                     region: "Peel",    deals: 12 },
      { name: "Gateway",                   region: "Peel",    deals: 12 },
      { name: "Brock Industrial",          region: "Durham",  deals: 11 }
    ],
    // Days-on-market distribution — bucketed counts across the 609 deals.
    dom_buckets: [
      { label: "0–14",   count: 148 },
      { label: "15–30",  count: 92  },
      { label: "31–60",  count: 114 },
      { label: "61–90",  count: 103 },
      { label: "91–180", count: 108 },
      { label: "181+",   count: 44  }
    ],
    // Asking vs achieved rent median by region (for the spread chart).
    spread: {
      gta_median_asking:   18.00,
      gta_median_achieved: 18.00,
      pct_close:           99
    },
    // Demo comp set for the "report on your address" widget. In production
    // this is a server-side lookup against the full comp universe.
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

  // The single swap point — today returns the demo object; later: fetch().
  function loadMIData(){
    return Promise.resolve(MI_DEMO_DATA);
  }

  // Shared colour palette for the charts — easy to retheme in one place.
  var COLORS = {
    primary:  '#0d9488',   // teal — "available" / headline
    deep:     '#0f1e4e',   // dark navy — body
    accent:   '#5b21b6',   // purple — "leased" / closed
    warm:     '#b45309',   // amber — attention
    muted:    '#94a3b8',   // grey — baseline
    grid:     '#e5e7eb'
  };

  // ---------------------------------------------------------------------------
  // 2. Chart renderers (Chart.js is loaded via CDN in the HTML head with `defer`)
  // ---------------------------------------------------------------------------
  function sharedChartOpts(){
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { padding: 10, boxPadding: 4 }
      },
      scales: {
        x: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } },
        y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } }
      }
    };
  }

  function renderRegionChart(data){
    var ctx = document.getElementById('chartRegion');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.regions.map(function(r){ return r.name; }),
        datasets: [{
          label: 'Deals closed',
          data: data.regions.map(function(r){ return r.deals; }),
          backgroundColor: COLORS.primary,
          borderRadius: 4
        }]
      },
      options: Object.assign(sharedChartOpts(), {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: function(c){
            var pct = Math.round((c.raw / data.meta.deal_count) * 100);
            return c.raw + ' deals · ' + pct + '% of GTA';
          } }
        } }
      })
    });
  }

  function renderSubmarketsChart(data){
    var ctx = document.getElementById('chartSubmarkets');
    if (!ctx) return;
    // Keep community names short on narrow screens
    var short = function(n){ return n.length > 22 ? n.slice(0, 20) + '…' : n; };
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.top_communities.map(function(c){ return short(c.name); }),
        datasets: [{
          label: 'Deals',
          data: data.top_communities.map(function(c){ return c.deals; }),
          backgroundColor: COLORS.accent,
          borderRadius: 3
        }]
      },
      options: Object.assign(sharedChartOpts(), {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: {
            title: function(items){
              var i = items[0].dataIndex;
              return data.top_communities[i].name;
            },
            label: function(c){
              var i = c.dataIndex;
              var row = data.top_communities[i];
              return row.deals + ' deals · ' + row.region;
            }
          }
        } }
      })
    });
  }

  function renderSpreadChart(data){
    var ctx = document.getElementById('chartSpread');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.regions.map(function(r){ return r.name; }),
        datasets: [
          {
            label: 'Median asking',
            data: data.regions.map(function(r){ return r.median_asking; }),
            backgroundColor: COLORS.muted,
            borderRadius: 3
          },
          {
            label: 'Median achieved',
            data: data.regions.map(function(r){ return r.median_achieved; }),
            backgroundColor: COLORS.primary,
            borderRadius: 3
          }
        ]
      },
      options: Object.assign(sharedChartOpts(), {
        plugins: {
          legend: { display: true, position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': $' + c.raw.toFixed(2) + ' / SF net'; } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 }, callback: function(v){ return '$' + v; } } }
        }
      })
    });
  }

  function renderDomChart(data){
    var ctx = document.getElementById('chartDom');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.dom_buckets.map(function(b){ return b.label; }),
        datasets: [{
          label: 'Deals',
          data: data.dom_buckets.map(function(b){ return b.count; }),
          backgroundColor: data.dom_buckets.map(function(b){
            // Shade faster deals greener, slower deals warmer
            return b.label === '0–14' ? COLORS.primary :
                   b.label === '15–30' ? '#14b8a6' :
                   b.label === '31–60' ? '#64748b' :
                   b.label === '61–90' ? '#94a3b8' :
                   b.label === '91–180' ? '#b45309' : '#7c2d12';
          }),
          borderRadius: 3
        }]
      },
      options: Object.assign(sharedChartOpts(), {
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: function(c){ return c.raw + ' deals (' + Math.round(c.raw / data.meta.deal_count * 100) + '% of GTA)'; } }
        } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } }, title: { display: true, text: 'Days on market', font: { size: 11 }, color: COLORS.muted } },
          y: { grid: { color: COLORS.grid }, ticks: { font: { size: 11 } } }
        }
      })
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Region drill-down tiles
  // ---------------------------------------------------------------------------
  function renderRegionPicker(data){
    var el = document.getElementById('miRegionPicker');
    if (!el) return;
    el.innerHTML = data.regions.map(function(r){
      return '<button class="mi-region-btn" type="button" data-region="' + r.name + '">' +
        '<b>' + r.name + '</b><span>' + r.deals + ' deals</span></button>';
    }).join('');
    el.addEventListener('click', function(e){
      var b = e.target.closest('.mi-region-btn');
      if (!b) return;
      var name = b.dataset.region;
      el.querySelectorAll('.mi-region-btn').forEach(function(x){ x.classList.toggle('active', x === b); });
      renderRegionDetail(data, name);
    });
  }

  function renderRegionDetail(data, regionName){
    var el = document.getElementById('miRegionDetail');
    if (!el) return;
    var r = data.regions.find(function(x){ return x.name === regionName; });
    if (!r) return;
    var communities = data.top_communities.filter(function(c){ return c.region === regionName; });
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
        '<div class="mi-comm-pills">' +
          communities.map(function(c){ return '<span class="mi-comm-pill">' + c.name.replace(/\(.+\)/, '').trim() + '<b>' + c.deals + '</b></span>'; }).join('') +
        '</div>'
      : '<div style="font-size:0.84rem; color:var(--text-muted);">No top-12 communities from this region in the sample.</div>');
  }

  // ---------------------------------------------------------------------------
  // 4. "Pull a report on your address" widget
  // ---------------------------------------------------------------------------
  function initReport(data){
    var btn = document.getElementById('miReportBtn');
    var input = document.getElementById('miReportAddress');
    if (!btn || !input) return;
    function go(){
      var q = (input.value || '').trim().toLowerCase();
      if (!q) { input.focus(); return; }
      runReport(data, q);
    }
    btn.addEventListener('click', go);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
  }

  function runReport(data, q){
    // Find the city the user typed (if any) by matching comma-separated tokens
    var tokens = q.split(/[,\s]+/).filter(Boolean);
    var hitCity = null, hitSubmarket = null;
    data.sample_comps.forEach(function(c){
      if (tokens.indexOf(c.city.toLowerCase()) >= 0) hitCity = c.city;
      if (tokens.indexOf((c.submarket || '').toLowerCase()) >= 0) hitSubmarket = c.submarket;
    });
    // Score each comp by a simple text match on the address, city, and submarket
    var scored = data.sample_comps.map(function(c){
      var hay = (c.address + ' ' + c.city + ' ' + (c.submarket || '')).toLowerCase();
      var score = 0;
      tokens.forEach(function(t){ if (hay.indexOf(t) >= 0) score += t.length; });
      // Boost city match
      if (hitCity && c.city === hitCity) score += 10;
      if (hitSubmarket && c.submarket === hitSubmarket) score += 15;
      return { comp: c, score: score };
    }).sort(function(a, b){ return b.score - a.score; });
    var top = scored.filter(function(s){ return s.score > 0; }).slice(0, 5);
    if (!top.length) top = scored.slice(0, 5);  // fall back: just show something

    // Submarket median rent (fall back to GTA)
    var subRents = (hitSubmarket ? data.sample_comps.filter(function(c){ return c.submarket === hitSubmarket; }).map(function(c){ return c.net_rent_psf; }) : []).filter(function(x){ return x; });
    var subMedian = subRents.length ? median(subRents) : null;

    // Paint results
    var wrap = document.getElementById('miReportResults');
    wrap.classList.add('on');
    var subLabel = hitSubmarket ? hitSubmarket : (hitCity || 'GTA avg');
    document.getElementById('miReportSubMedian').textContent = subMedian ? '$' + subMedian.toFixed(2) : '$' + data.spread.gta_median_asking.toFixed(2);
    document.getElementById('miReportGtaMedian').textContent = '$' + data.spread.gta_median_asking.toFixed(2);
    var vs = document.getElementById('miReportVs');
    if (subMedian) {
      var diff = subMedian - data.spread.gta_median_asking;
      var pct = (diff / data.spread.gta_median_asking) * 100;
      var sign = pct >= 0 ? '+' : '';
      vs.textContent = subLabel + ' runs ' + sign + pct.toFixed(1) + '% vs. GTA median';
      vs.style.color = Math.abs(pct) < 3 ? 'var(--text-muted)' : (pct > 0 ? '#b45309' : '#047857');
    } else {
      vs.textContent = 'No submarket-specific median in demo data yet.';
      vs.style.color = 'var(--text-muted)';
    }

    document.getElementById('miReportCompsTitle').textContent = top.length ? ('Top ' + top.length + ' matches') : 'No matches';
    var compsEl = document.getElementById('miReportComps');
    compsEl.innerHTML = top.map(function(s){
      var c = s.comp;
      var rate = c.achieved_psf || c.net_rent_psf;
      return '<div class="mi-report-comp">' +
        '<div><div class="addr">' + c.address + '</div>' +
          '<div class="meta">' + c.city + (c.submarket ? ' · ' + c.submarket : '') + ' · ' + c.size_sf.toLocaleString('en-CA') + ' SF · ' + (c.status === 'leased' ? 'Leased' : 'For lease') + '</div></div>' +
        '<div class="rate">$' + rate.toFixed(2) + '<div class="meta">/ SF net</div></div>' +
      '</div>';
    }).join('') || '<div class="mi-report-empty">No comps matched. Try a city name (Mississauga, Vaughan, Brampton, Markham, Scarborough).</div>';
  }

  function median(arr){
    var xs = arr.slice().sort(function(a,b){ return a - b; });
    var n = xs.length;
    return n % 2 ? xs[(n-1)/2] : (xs[n/2 - 1] + xs[n/2]) / 2;
  }

  // ---------------------------------------------------------------------------
  // 5. Boot — wait for Chart.js (loaded with defer) then render everything.
  // ---------------------------------------------------------------------------
  function boot(){
    loadMIData().then(function(data){
      // Spread callout in the asking-vs-achieved card
      var sp = document.getElementById('miSpreadPct');
      if (sp) sp.textContent = data.spread.pct_close + '%';

      if (typeof Chart !== 'undefined'){
        renderRegionChart(data);
        renderSubmarketsChart(data);
        renderSpreadChart(data);
        renderDomChart(data);
      } else {
        console.warn('[market-intel] Chart.js not loaded — charts skipped');
      }
      renderRegionPicker(data);
      initReport(data);
      console.log('[market-intel] booted with ' + data.meta.deal_count + ' deals (' + data.meta.source + ')');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
