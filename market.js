// industrio — Market intelligence layer
// Loads buildings.json (the building-inventory backend) and surfaces a market stats panel.
// Building-level data isn't shown to end users individually; it's the denominator for
// vacancy rates, market size, and rent benchmarks.

(function(){
  "use strict";

  function fmtSF(n){ if (!n) return '\u2014'; if (n >= 1e6) return (n/1e6).toFixed(1)+'M SF'; if (n >= 1e3) return (n/1e3).toFixed(0)+'k SF'; return n.toLocaleString()+' SF'; }
  function fmtPct(n){ if (n == null) return '\u2014'; return (n*100).toFixed(1)+'%'; }
  function fmtMoney(n){ if (n == null) return '\u2014'; return '$'+n.toFixed(2); }
  function fmtCount(n){ if (!n) return '\u2014'; return n.toLocaleString(); }

  function injectPanel(){
    if (document.getElementById('marketStatsPanel')) return;
    var host = document.querySelector('.map-page-wrap') || document.body;
    var div = document.createElement('div');
    div.id = 'marketStatsPanel';
    div.className = 'market-panel';
    div.innerHTML = ''
      + '<button type="button" class="market-panel-toggle" id="marketPanelToggle">'
      +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>'
      +   '<span>Market stats</span>'
      +   '<span class="market-panel-pill" id="marketPanelStatusPill">loading\u2026</span>'
      + '</button>'
      + '<div class="market-panel-body" id="marketPanelBody" hidden>'
      +   '<div class="market-panel-loading">Loading inventory\u2026</div>'
      + '</div>';
    // Insert just below the filter bar
    var bar = document.querySelector('.map-filter-bar');
    if (bar && bar.parentNode){ bar.parentNode.insertBefore(div, bar.nextSibling); }
    else { host.insertBefore(div, host.firstChild); }
    document.getElementById('marketPanelToggle').addEventListener('click', function(){
      var b = document.getElementById('marketPanelBody');
      b.hidden = !b.hidden;
      div.classList.toggle('open', !b.hidden);
    });
  }

  function renderPanel(data){
    var body = document.getElementById('marketPanelBody');
    var pill = document.getElementById('marketPanelStatusPill');
    if (!body) return;
    if (!data){
      pill.textContent = 'unavailable';
      body.innerHTML = '<div class="market-panel-empty">Building inventory not loaded. Run a local server or deploy the site so buildings.json can be fetched.</div>';
      return;
    }

    var bs = data.submarket_stats || [];
    var total = bs.reduce(function(a,b){ return { c:a.c+(b.building_count||0), sf:a.sf+(b.total_rentable_sf||0), av:a.av+(b.total_available_sf||0) }; }, { c:0, sf:0, av:0 });
    var totalVac = total.sf ? (total.av / total.sf) : null;
    var weightedRent = 0, rentDen = 0;
    bs.forEach(function(b){ if (b.avg_weighted_rent_psf && b.total_rentable_sf){ weightedRent += b.avg_weighted_rent_psf * b.total_rentable_sf; rentDen += b.total_rentable_sf; } });
    var avgRent = rentDen ? (weightedRent / rentDen) : null;

    pill.textContent = fmtCount(total.c) + ' bldgs \u00b7 ' + fmtSF(total.sf);

    // Append "Tenant comp pool" section if comps-pool.json was loaded
    var compsHtml = '';
    if (window.industrioComps && window.industrioComps.benchmarks){
      var top = window.industrioComps.benchmarks.slice(0, 8);
      compsHtml = ''
        + '<div class="market-stats-table-wrap" style="margin-top:14px;">'
        +   '<div class="market-stats-table-title">Anonymous tenant comp pool &middot; n=' + (window.industrioComps.meta && window.industrioComps.meta.total_comps || 0) + ' submissions</div>'
        +   '<table class="market-stats-table">'
        +     '<thead><tr><th>Submarket</th><th>Size class</th><th class="num">Comps</th><th class="num">Range</th><th class="num">Avg</th></tr></thead>'
        +     '<tbody>'
        +     top.map(function(b){
                return '<tr>'
                  + '<td>' + escapeHtml(b.submarket) + '</td>'
                  + '<td>' + escapeHtml(b.size_class) + ' SF</td>'
                  + '<td class="num">' + b.comp_count + '</td>'
                  + '<td class="num">$' + b.rent_low.toFixed(0) + '\u2013$' + b.rent_high.toFixed(0) + '</td>'
                  + '<td class="num">$' + b.rent_avg.toFixed(1) + '</td>'
                  + '</tr>';
              }).join('')
        +     '</tbody>'
        +   '</table>'
        +   '<div class="market-stats-foot" style="margin-top:8px;font-size:0.72rem;">Aggregated, anonymized rent ranges from tenant uploads. Cells shown only where comps &ge; 5. <a href="data-policy.html">How this works &rarr;</a></div>'
        + '</div>';
    }
    var html = ''
      + '<div class="market-stats-grid">'
      +   stat('Buildings', fmtCount(total.c), 'GTA small/mid bay industrial inventory')
      +   stat('Total inventory', fmtSF(total.sf), 'Combined rentable SF')
      +   stat('Available SF', fmtSF(total.av), 'Listed for lease right now')
      +   stat('Vacancy rate', fmtPct(totalVac), 'Available \u00f7 total inventory')
      +   stat('Avg net rent', fmtMoney(avgRent) + '/SF/yr', 'SF-weighted across submarkets')
      +   stat('Submarkets', fmtCount(bs.length), 'GTA coverage')
      + '</div>'
      + '<div class="market-stats-table-wrap">'
      +   '<div class="market-stats-table-title">By submarket</div>'
      +   '<table class="market-stats-table">'
      +     '<thead><tr><th>Submarket</th><th class="num">Buildings</th><th class="num">Inventory</th><th class="num">Available</th><th class="num">Vacancy</th><th class="num">Avg rent</th></tr></thead>'
      +     '<tbody>'
      +     bs.map(function(s){
              return '<tr>'
                + '<td>' + escapeHtml(s.submarket) + '</td>'
                + '<td class="num">' + fmtCount(s.building_count) + '</td>'
                + '<td class="num">' + fmtSF(s.total_rentable_sf) + '</td>'
                + '<td class="num">' + fmtSF(s.total_available_sf) + '</td>'
                + '<td class="num">' + fmtPct(s.vacancy_pct) + '</td>'
                + '<td class="num">' + (s.avg_weighted_rent_psf != null ? '$'+s.avg_weighted_rent_psf.toFixed(2) : '\u2014') + '</td>'
                + '</tr>';
            }).join('')
      +     '</tbody>'
      +   '</table>'
      + '</div>'
      + compsHtml
      + '<div class="market-stats-foot">'
      +   '<span><strong>Source:</strong> Northbridge research on ' + fmtCount(total.c) + ' GTA small/mid-bay industrial buildings. Updated ' + escapeHtml(data.meta && data.meta.last_updated || '\u2014') + '.</span>'
      +   '<span class="market-stats-private">Building-level data is private. Listings overlay onto these buildings; this layer is the denominator for all market math.</span>'
      + '</div>';
    body.innerHTML = html;
  }

  function stat(label, val, hint){
    return '<div class="market-stat">'
      + '<div class="market-stat-label">' + escapeHtml(label) + '</div>'
      + '<div class="market-stat-value">' + escapeHtml(val) + '</div>'
      + '<div class="market-stat-hint">' + escapeHtml(hint) + '</div>'
      + '</div>';
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function indexBuildings(data){
    var idx = {};
    (data.buildings || []).forEach(function(b){ if (b.building_id) idx[b.building_id] = b; });
    window.industrioBuildings = { byId: idx, all: data.buildings || [], stats: data.submarket_stats || [], meta: data.meta || {} };
    document.dispatchEvent(new CustomEvent('industrio:buildings-loaded', { detail: window.industrioBuildings }));
  }

  function load(){
    injectPanel();
    if (!window.fetch){ renderPanel(null); return; }
    fetch('comps-pool.json', { cache: 'no-store' }).then(function(r){
      if (!r.ok) throw new Error('no comps pool');
      return r.json();
    }).then(function(comps){
      window.industrioComps = comps;
      console.log('[industrio.market] loaded', (comps.benchmarks || []).length, 'comp benchmark cells');
      if (window.industrioBuildings && window.industrioBuildings.meta){
        renderPanel({
          buildings: window.industrioBuildings.all,
          submarket_stats: window.industrioBuildings.stats,
          meta: window.industrioBuildings.meta
        });
      }
    }).catch(function(){ /* offline / file:// */ });

    console.log('[industrio.market] starting buildings.json load...');
    fetch('buildings.json', { cache: 'no-store' }).then(function(r){
      console.log('[industrio.market] fetch response:', r.status, r.statusText);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(data){
      console.log('[industrio.market] loaded', (data.buildings || []).length, 'buildings,', (data.submarket_stats || []).length, 'submarkets');
      indexBuildings(data);
      renderPanel(data);
    }).catch(function(err){
      console.error('[industrio.market] failed:', err.message || err);
      renderPanel(null);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
