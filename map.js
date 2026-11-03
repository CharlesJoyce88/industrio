(function(){
  "use strict";

  var map = L.map('leafletMap', { scrollWheelZoom: true }).setView([43.70, -79.55], 10);
  // Strip Leaflet's built-in Ukraine-flag prefix; keep a plain Leaflet credit.
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  window.industrioMap = map;  // expose for sidebar listing-card clicks

  // OpenStreetMap standard tiles — truly free, no API key, no rate-limit for normal use.
  // (CARTO's basemaps-api endpoint now requires an API key for anonymous use, so we
  // switched off it.)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Recalculate tile layout after the page settles — important when the map container
  // ends up inside a flex/grid layout that changes size after Leaflet initializes.
  setTimeout(function(){ map.invalidateSize(); }, 100);
  window.addEventListener('load', function(){ map.invalidateSize(); });
  window.addEventListener('resize', function(){ map.invalidateSize(); });

  var layers = {
    'for-lease':        L.layerGroup(),
    'leased':           L.layerGroup(),
    'delisted-lease':   L.layerGroup(),
    'for-sale':         L.layerGroup(),
    'sold':             L.layerGroup(),
    'delisted-sale':    L.layerGroup(),
    'landlord-scores':  L.layerGroup(),
    'labour':           L.layerGroup(),
    'drive-time':       L.layerGroup(),
    'environmental':    L.layerGroup(),
    'wells':            L.layerGroup(),
    'spills':           L.layerGroup(),
    'sensitive':        L.layerGroup(),
    'network':          L.layerGroup(),
    'optimal':          L.layerGroup(),
    'optimal-rings':    L.layerGroup()
  };

  // Per-listing marker registry so we can toggle individual markers by days-ago filter
  var markers = { 'for-lease':[], 'leased':[], 'delisted-lease':[], 'for-sale':[], 'sold':[], 'delisted-sale':[] };

  function dot(color, filled, radius){
    return { radius: radius || 8, fillColor: filled ? color : '#ffffff', color: color, weight: 2, opacity: 1, fillOpacity: filled ? 0.95 : 1 };
  }
  function popup(title, lines){
    var h = '<strong>' + title + '</strong>';
    if (lines && lines.length) h += '<br>' + lines.join('<br>');
    return h;
  }

  // ---- Sample listing data.
  //   days/year: time filters.  size/clear/dock/driveIn/officePct/whPct/power/parking/court/slab: property filters.
  //   stars: landlord review (0–5).  features: ['whitebox','reno-office','esfr','3phase','crane','rail','yard','hvac','food-grade','cold-ready','heavy-power','ac-office']
  // Sample data arrays removed — all comps now load from listings.json.

  function addMarker(kind, l, style, popupHtml){
    var m = L.circleMarker([l.lat, l.lng], style).bindPopup(popupHtml);
    m._meta = {
      days:       l.days || 0,
      year:       l.year || 0,
      size:       l.size || 0,
      clear:      l.clear || 0,
      dock:       l.dock || 0,
      driveIn:    l.driveIn || 0,
      officePct:  l.officePct || 0,
      whPct:      l.whPct || 0,
      power:      l.power || 0,
      parking:    l.parking || 0,
      court:      l.court || 0,
      slab:       l.slab || 0,
      stars:      l.stars || 0,
      features:   l.features || []
    };
    m.addTo(layers[kind]);
    markers[kind].push(m);
  }

  // Sample-data forEach loops removed. Markers now come exclusively from
  // listings.json via loadRealListings() below.

  // ---- Real comps loader ----
  // listings.json holds real lease/sale comps the user adds. When present, we
  // append its entries to the matching layers so they appear alongside samples.
  function jsonToInternal(j){
    var doors = '';
    if (j.docks) doors += j.docks + ' docks';
    if (j.drive_in) doors += (doors ? ' + ' : '') + j.drive_in + ' DI';
    var lines = [];
    var sizeStr = j.size_sf ? Number(j.size_sf).toLocaleString() + ' SF' : '';
    if (j.tenant) lines.push(j.tenant);
    if (sizeStr) lines.push(sizeStr + (j.unit ? ' (Unit ' + j.unit + ')' : ''));
    if (j.clear_ft) lines.push(j.clear_ft + "' clear" + (doors ? ', ' + doors : ''));
    var st = (j.status || '').replace(/_/g, '-');  // accept for_lease or for-lease
    if ((st === 'for-lease') && (j.net_rent_psf || j.additional_rent_psf)){
      var net = j.net_rent_psf ? '$' + Number(j.net_rent_psf).toFixed(2) : '';
      var add = j.additional_rent_psf ? '$' + Number(j.additional_rent_psf).toFixed(2) : '';
      var ai = (Number(j.net_rent_psf)||0) + (Number(j.additional_rent_psf)||0);
      if (net && add) lines.push(net + ' + ' + add + ' = $' + ai.toFixed(2) + ' all-in');
      else if (net) lines.push(net + ' net');
    } else if (st === 'leased' && j.achieved_net_psf){
      lines.push('Achieved $' + Number(j.achieved_net_psf).toFixed(2) + ' net');
      if (j.list_date) lines.push('Lease started ' + j.list_date);
      if (j.expiry_date) lines.push('Expires ' + j.expiry_date);
    } else if (st === 'for-sale'){
      if (j.asking_psf) lines.push('$' + Number(j.asking_psf).toFixed(0) + ' / SF asking');
      if (j.asking_total) lines.push('$' + (Number(j.asking_total)/1e6).toFixed(2) + 'M total');
    } else if (st === 'sold'){
      if (j.sold_psf) lines.push('$' + Number(j.sold_psf).toFixed(0) + ' / SF sold');
      if (j.days_on_market) lines.push(j.days_on_market + ' DOM');
    }
    if (j.landlord) lines.push(j.landlord);
    if (j.notes) lines.push(j.notes);
    return {
      lat: j.lat, lng: j.lng,
      days: j.days_on_market || 0,
      year: j.year_closed || 0,
      size: j.size_sf || 0,
      clear: j.clear_ft || 0,
      dock: j.docks || 0,
      driveIn: j.drive_in || 0,
      officePct: j.office_pct || 0,
      whPct: j.warehouse_pct || 0,
      power: j.power_amps || 0,
      parking: j.parking_per_1k || 0,
      court: j.court_ft || 0,
      slab: j.slab_psf || 0,
      stars: j.landlord_stars || 0,
      features: j.features || [],
      addr: [j.address, (j.unit ? 'Unit ' + j.unit : ''), j.city].filter(Boolean).join(', '),
      meta: (j.meta && j.meta.length) ? j.meta : lines
    };
  }
  function loadRealListings(){
    console.log('[industrio] starting comps load from listings.json...');
    if (!window.fetch){ console.warn('[industrio] fetch() not available — comps cannot load'); return; }
    fetch('listings.json', { cache: 'no-store' }).then(function(r){
      console.log('[industrio] fetch response status:', r.status, r.statusText, '(URL:', r.url + ')');
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + r.statusText);
      return r.json();
    }).then(function(data){
      console.log('[industrio] listings.json parsed. counts:', {
        for_lease: (data.for_lease || []).length,
        leased: (data.leased || []).length,
        for_sale: (data.for_sale || []).length,
        sold: (data.sold || []).length
      });
      var groups = [
        ['for_lease',     'for-lease',     dot('#0f1e4e', true)],
        ['leased',        'leased',        dot('#0f1e4e', false, 7)],
        ['for_sale',      'for-sale',      dot('#0d9488', true)],
        ['sold',          'sold',          dot('#0d9488', false, 7)],
        ['delisted_lease','delisted-lease',dot('#64748b', true, 7)],
        ['delisted_sale', 'delisted-sale', dot('#64748b', false, 7)]
      ];
      var added = 0, skipped = 0;
      groups.forEach(function(g){
        var arr = data[g[0]] || [];
        arr.forEach(function(j){
          if (typeof j.lat !== 'number' || typeof j.lng !== 'number'){
            skipped++;
            console.warn('[industrio] skipped entry — missing/invalid lat or lng:', j.id || j.address);
            return;
          }
          var internal = jsonToInternal(j);
          addMarker(g[1], internal, g[2], popup(internal.addr, internal.meta));
          added++;
        });
      });
      console.log('[industrio] DONE: added ' + added + ' real comps' + (skipped ? ' (' + skipped + ' skipped)' : ''));
      // Build sidebar cards + update stats strip from this data
      renderSidebarCards(data);
      updateStatsStrip(data);
    }).catch(function(err){
      console.error('[industrio] FAILED to load listings.json:', err.message || err);
      console.error('[industrio] If you opened map.html via file://, fetch() is blocked. Run a local server (e.g. `python -m http.server 8000`) and open http://localhost:8000/map.html');
    });
  }
  loadRealListings();

  // ---- Building-inventory backdrop ----
  // Plots the 5,500+ buildings from buildings.json as small grey dots so the
  // user can see the small/mid-bay industrial footprint of the GTA. Listings
  // (lease/sale dots) sit on top.
  var inventoryLayer = L.layerGroup();
  if (window.industrioBuildings && window.industrioBuildings.all){
    drawBuildings(window.industrioBuildings.all);
  } else {
    document.addEventListener('industrio:buildings-loaded', function(e){
      drawBuildings((e.detail && e.detail.all) || []);
    });
  }
  function drawBuildings(arr){
    var added = 0;
    arr.forEach(function(b){
      if (typeof b.lat !== 'number' || typeof b.lng !== 'number') return;
      var m = L.circleMarker([b.lat, b.lng], {
        radius: 2.5,
        fillColor: '#94a3b8',
        color: '#64748b',
        weight: 0.5,
        fillOpacity: 0.45,
        opacity: 0.55
      });
      var sf = b.total_rentable_sf ? Number(b.total_rentable_sf).toLocaleString() : '\u2014';
      var rent = b.avg_weighted_rent_psf ? '$' + b.avg_weighted_rent_psf.toFixed(2) + '/SF' : '\u2014';
      var owner = b.owner ? '<br>Owner: ' + b.owner : '';
      m.bindPopup('<strong>' + (b.address || '') + '</strong><br>'
        + (b.city || '') + (b.year_built ? ' &middot; built ' + b.year_built : '')
        + '<br>GLA: ' + sf + ' SF'
        + '<br>Avg rent: ' + rent
        + owner);
      m.addTo(inventoryLayer);
      added++;
    });
    inventoryLayer.addTo(map);
    console.log('[industrio.map] backdrop: plotted ' + added + ' buildings from inventory');
  }

  // ---- Landlord scores / context / due-diligence / analytics / etc. ----
  [
    { lat: 43.5842, lng: -79.7458, ll: 'ACME Industrial Holdings',          score: 8.2 },
    { lat: 43.7090, lng: -79.6250, ll: 'Continental Business Parks',        score: 7.3 },
    { lat: 43.5755, lng: -79.7013, ll: 'Prologis Canada',                   score: 8.6 },
    { lat: 43.7740, lng: -79.2578, ll: 'Meridian Properties',               score: 6.3 },
    { lat: 43.8372, lng: -79.5085, ll: 'Continental (Vaughan portfolio)',   score: 7.1 }
  ].forEach(function(p){
    var color = p.score >= 8 ? '#15803d' : (p.score >= 7 ? '#b45309' : '#dc2626');
    L.circleMarker([p.lat, p.lng], dot(color, true, 9))
      .bindPopup(popup(p.ll, ['Score: <strong style="color:'+color+'">'+p.score+' / 10</strong>','<a href="landlord-acme.html">View profile &rarr;</a>']))
      .addTo(layers['landlord-scores']);
  });

  // Labour density choropleth — fed by window.LABOUR_DATA (loaded from labour-data.js).
  function labourColor(d){
    if (d >= 700) return '#7c2d12';
    if (d >= 500) return '#b45309';
    if (d >= 350) return '#d97706';
    if (d >= 200) return '#f59e0b';
    if (d >= 100) return '#fcd34d';
    return '#fde68a';
  }
  function renderLabour(){
    var data = window.LABOUR_DATA;
    if (!data || !data.length) { console.warn('[industrio] LABOUR_DATA not loaded yet — retrying'); setTimeout(renderLabour, 200); return; }
    if (layers['labour']._labourRendered) return;
    data.forEach(function(c){
      var density = c.tot / (c.km2 || 1);
      var fill = labourColor(density);
      var rect = L.rectangle([[c.bounds[0], c.bounds[1]], [c.bounds[2], c.bounds[3]]], {
        color: fill, weight: 1, fillColor: fill, fillOpacity: 0.5, opacity: 0.85
      });
      rect.bindPopup(
        '<strong>' + c.nm + '</strong>' +
        '<br><span style="color:#64748b;font-size:0.78rem;">Industrial labour pool (StatCan-style estimate)</span>' +
        '<br><span style="font-family:Geist Mono,monospace;">Total: ' + c.tot.toLocaleString() + ' workers</span>' +
        '<br><span style="font-family:Geist Mono,monospace;">Density: ' + Math.round(density) + ' / km<sup>2</sup></span>' +
        '<br><span style="color:#64748b;font-size:0.78rem;">Warehousing & transport: ' + c.wh.toLocaleString() + '</span>' +
        '<br><span style="color:#64748b;font-size:0.78rem;">Manufacturing: ' + c.mfg.toLocaleString() + '</span>'
      );
      rect.addTo(layers['labour']);
    });
    layers['labour']._labourRendered = true;
    console.log('[industrio] labour layer rendered — ' + data.length + ' polygons');
  }
  renderLabour();

  [
    { r: 15000, opacity: 0.06, label: '30 min' },
    { r: 9500,  opacity: 0.10, label: '20 min' },
    { r: 5000,  opacity: 0.15, label: '10 min' }
  ].forEach(function(p){
    L.circle([43.5842, -79.7458], { radius: p.r, fillColor: '#0d9488', color: '#0d9488', weight: 1, fillOpacity: p.opacity, opacity: 0.5, dashArray: '4,4' })
      .bindTooltip(p.label, { permanent: false, direction: 'center' }).addTo(layers['drive-time']);
  });

  [
    { lat: 43.5975, lng: -79.7130, addr: 'Former dry cleaner 2175 Industrial Rd' },
    { lat: 43.6110, lng: -79.7000, addr: 'Former metal finisher 4012 Argentia' },
    { lat: 43.7150, lng: -79.6310, addr: 'Former fuel depot 8700 Airport Rd' },
    { lat: 43.6340, lng: -79.6890, addr: 'Historic industrial use 7080 Pacific Cir' },
    { lat: 43.5770, lng: -79.7050, addr: 'Former auto shop 50 Courtneypark' }
  ].forEach(function(p){
    L.circleMarker([p.lat, p.lng], dot('#b45309', true, 7))
      .bindPopup(popup('Environmental flag', [p.addr, '<em>Risk 3/5 &mdash; review Phase I</em>']))
      .addTo(layers['environmental']);
  });

  [
    [43.5820, -79.7475], [43.5830, -79.7442], [43.7100, -79.6245], [43.6098, -79.7200],
    [43.6110, -79.7170], [43.5758, -79.7021], [43.6339, -79.6912], [43.5960, -79.6515],
    [43.7240, -79.7028], [43.6215, -79.7360]
  ].forEach(function(p){
    L.circleMarker(p, { radius: 4, fillColor: '#2563eb', color: '#fff', weight: 1, fillOpacity: 0.9 })
      .bindPopup('<strong>Ontario Well Record</strong><br>MECP water well<br><a href="https://data.ontario.ca/dataset/well-records" target="_blank">Dataset &rarr;</a>')
      .addTo(layers['wells']);
  });

  [
    { lat: 43.5985, lng: -79.7140, year: 1994, desc: 'Hydraulic fluid, 200L' },
    { lat: 43.7160, lng: -79.6305, year: 2001, desc: 'Diesel, tank leak' },
    { lat: 43.6115, lng: -79.7005, year: 1988, desc: 'Solvent release' },
    { lat: 43.5775, lng: -79.7055, year: 2009, desc: 'Waste oil, 50L' }
  ].forEach(function(p){
    L.circleMarker([p.lat, p.lng], dot('#dc2626', true, 6))
      .bindPopup(popup('Spill record ' + p.year, [p.desc]))
      .addTo(layers['spills']);
  });

  [
    { lat: 43.5900, lng: -79.7290, label: 'Elementary school 300m buffer' },
    { lat: 43.6170, lng: -79.7020, label: 'Daycare 300m buffer' },
    { lat: 43.7120, lng: -79.6200, label: 'Residential zone adjacent' }
  ].forEach(function(p){
    L.circle([p.lat, p.lng], { radius: 300, fillColor: '#eab308', color: '#b45309', weight: 1, fillOpacity: 0.22, opacity: 0.55 })
      .bindPopup(popup('Sensitive use', [p.label]))
      .addTo(layers['sensitive']);
  });

  // ===== Time-window filter logic =====
  function inWindow(value, meta){
    if (value === 'off') return false;
    if (value === 'all') return true;
    if (value === '90+') return meta.days > 90;
    if (value.indexOf('year-') === 0){
      var yr = parseInt(value.split('-')[1], 10);
      return meta.year === yr;
    }
    var n = parseInt(value, 10);
    if (isFinite(n)) return meta.days <= n;
    return true;
  }

  // ===== Property filter state =====
  var propFilters = {
    sizeMin: 0, sizeMax: 0,
    clear: 0, dock: 0, driveIn: 0,
    officeMax: 0, whMin: 0,
    power: 0, parking: 0, court: 0, slab: 0,
    stars: 0,
    features: []
  };

  function matchesProps(meta){
    // Numeric filters: 0 means "no filter". Listing value of 0 means "unknown" and always passes numeric checks.
    if (propFilters.sizeMin && meta.size && meta.size < propFilters.sizeMin) return false;
    if (propFilters.sizeMax && meta.size && meta.size > propFilters.sizeMax) return false;
    if (propFilters.clear   && meta.clear && meta.clear < propFilters.clear) return false;
    if (propFilters.dock    && meta.dock < propFilters.dock) return false;
    if (propFilters.driveIn && meta.driveIn < propFilters.driveIn) return false;
    if (propFilters.officeMax && meta.officePct && meta.officePct > propFilters.officeMax) return false;
    if (propFilters.whMin   && meta.whPct && meta.whPct < propFilters.whMin) return false;
    if (propFilters.power   && meta.power && meta.power < propFilters.power) return false;
    if (propFilters.parking && meta.parking && meta.parking < propFilters.parking) return false;
    if (propFilters.court   && meta.court && meta.court < propFilters.court) return false;
    if (propFilters.slab    && meta.slab && meta.slab < propFilters.slab) return false;
    if (propFilters.stars   && meta.stars < propFilters.stars) return false;
    if (propFilters.features.length){
      for (var i = 0; i < propFilters.features.length; i++){
        if (meta.features.indexOf(propFilters.features[i]) === -1) return false;
      }
    }
    return true;
  }

  // Current time-window selection per kind
  var currentWindow = {};

  function applyFilter(kind, value){
    if (value !== undefined) currentWindow[kind] = value;
    var val = currentWindow[kind] !== undefined ? currentWindow[kind] : 'all';
    var group = layers[kind];
    var anyVisible = false;
    markers[kind].forEach(function(m){
      var vis = inWindow(val, m._meta) && matchesProps(m._meta);
      if (vis){ if (!group.hasLayer(m)) group.addLayer(m); anyVisible = true; }
      else    { if (group.hasLayer(m))  group.removeLayer(m); }
    });
    if (anyVisible && !map.hasLayer(group)) group.addTo(map);
    if (!anyVisible && map.hasLayer(group)) map.removeLayer(group);
  }

  function reapplyAllListingFilters(){
    Object.keys(markers).forEach(function(kind){ applyFilter(kind); });
  }

  // Wire time-window dropdowns
  var filterSelects = document.querySelectorAll('.filter-select');
  filterSelects.forEach(function(sel){
    var kind = sel.dataset.filter;
    currentWindow[kind] = sel.value;
    applyFilter(kind, sel.value);
    sel.addEventListener('change', function(){ applyFilter(kind, sel.value); });
  });

  // Wire property filter inputs
  function num(id){ var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
  function readProps(){
    propFilters.sizeMin   = num('pfSizeMin');
    propFilters.sizeMax   = num('pfSizeMax');
    propFilters.clear     = num('pfClear');
    propFilters.dock      = num('pfDock');
    propFilters.driveIn   = num('pfDriveIn');
    propFilters.officeMax = num('pfOfficeMax');
    propFilters.whMin     = num('pfWhMin');
    propFilters.power     = num('pfPower');
    propFilters.parking   = num('pfParking');
    propFilters.court     = num('pfCourt');
    propFilters.slab      = num('pfSlab');
    reapplyAllListingFilters();
  }
  ['pfSizeMin','pfSizeMax','pfClear','pfDock','pfDriveIn','pfOfficeMax','pfWhMin','pfPower','pfParking','pfCourt','pfSlab'].forEach(function(id){
    var el = document.getElementById(id);
    if (el){ el.addEventListener('input', readProps); el.addEventListener('change', readProps); }
  });

  // Landlord rating picker
  var starOpts = document.querySelectorAll('#pfStars .star-opt');
  starOpts.forEach(function(opt){
    opt.addEventListener('click', function(){
      starOpts.forEach(function(x){ x.classList.remove('on'); });
      opt.classList.add('on');
      propFilters.stars = parseInt(opt.dataset.stars, 10) || 0;
      reapplyAllListingFilters();
    });
  });

  // Feature pills
  var featPills = document.querySelectorAll('#pfFeats .pill');
  featPills.forEach(function(p){
    p.addEventListener('click', function(){
      p.classList.toggle('on');
      propFilters.features = Array.prototype.map.call(
        document.querySelectorAll('#pfFeats .pill.on'),
        function(x){ return x.dataset.feat; }
      );
      reapplyAllListingFilters();
    });
  });

  // ---- Sidebar listing cards (dynamic, built from listings.json) ----
  function statusBadge(st){
    var n = (st || '').replace(/_/g,'-');
    if (n === 'for-lease') return '<span class="listing-status-badge lease">For Lease</span>';
    if (n === 'leased')    return '<span class="listing-status-badge lease">Leased</span>';
    if (n === 'for-sale')  return '<span class="listing-status-badge sale">For Sale</span>';
    if (n === 'sold')      return '<span class="listing-status-badge sale">Sold</span>';
    return '<span class="listing-status-badge">' + (st || 'Listing') + '</span>';
  }
  function priceLine(j){
    var st = (j.status || '').replace(/_/g,'-');
    if (st === 'for-lease'){
      if (j.net_rent_psf) return '$' + Number(j.net_rent_psf).toFixed(2) + '<span class="unit">net / SF / yr</span>';
      return '<span class="unit">Asking on request</span>';
    }
    if (st === 'leased'){
      if (j.achieved_net_psf) return '$' + Number(j.achieved_net_psf).toFixed(2) + '<span class="unit">achieved / SF</span>';
      return '<span class="unit">Rent suppressed</span>';
    }
    if (st === 'for-sale'){
      if (j.asking_psf) return '$' + Number(j.asking_psf).toFixed(0) + '<span class="unit">/ SF asking</span>';
      if (j.asking_total) return '$' + (Number(j.asking_total)/1e6).toFixed(2) + 'M<span class="unit">total asking</span>';
      return '<span class="unit">Price on request</span>';
    }
    if (st === 'sold'){
      if (j.sold_psf) return '$' + Number(j.sold_psf).toFixed(0) + '<span class="unit">/ SF sold</span>';
      if (j.sold_total) return '$' + (Number(j.sold_total)/1e6).toFixed(2) + 'M<span class="unit">sold</span>';
    }
    return '<span class="unit">—</span>';
  }
  function renderSidebarCards(data){
    var container = document.getElementById('listingCards');
    if (!container) return;
    var groups = [
      ['for_lease', 'for-lease', 'lease'],
      ['leased',    'leased',    'lease'],
      ['for_sale',  'for-sale',  'sale'],
      ['sold',      'sold',      'sale']
    ];
    var allRecords = [];
    groups.forEach(function(g){
      (data[g[0]] || []).forEach(function(r){
        if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return;
        allRecords.push(Object.assign({}, r, { _status: g[1] }));
      });
    });
    // Sort by recency: list_date or close_date desc, fallback days_on_market asc
    allRecords.sort(function(a, b){
      var aDate = a.list_date || a.close_date || '';
      var bDate = b.list_date || b.close_date || '';
      if (aDate && bDate) return bDate.localeCompare(aDate);
      return (a.days_on_market || 999) - (b.days_on_market || 999);
    });
    if (!allRecords.length){
      container.innerHTML = '<div class="empty-listings">No availabilities loaded yet. Add comps to <code>listings.json</code> and refresh.</div>';
      var lc = document.getElementById('listingsCount');
      if (lc) lc.textContent = '0 matching';
      return;
    }
    var html = '';
    allRecords.forEach(function(r){
      var addr = [r.address, r.unit ? 'Unit ' + r.unit : '', r.city].filter(Boolean).join(', ');
      var sizeStr = r.size_sf ? Number(r.size_sf).toLocaleString() + ' SF' : '';
      var clear = r.clear_ft ? r.clear_ft + "' clear" : '';
      var doors = '';
      if (r.docks) doors += r.docks + ' TL';
      if (r.drive_in) doors += (doors ? ' + ' : '') + r.drive_in + ' DI';
      var landlord = r.landlord ? r.landlord + (r.landlord_stars ? ' · ' + r.landlord_stars + '&#9733;' : '') : '';
      var photo = r.photo_url || 'https://picsum.photos/seed/' + encodeURIComponent(r.id || addr) + '/600/300';
      html += '<div class="listing-card" data-lat="' + r.lat + '" data-lng="' + r.lng + '" data-id="' + (r.id || '') + '">'
        + '<div class="listing-photo" style="background-image:url(\'' + photo + '\');">'
        + statusBadge(r.status)
        + '</div>'
        + '<div class="listing-body">'
        + '<h4 class="listing-address">' + (addr || '(no address)') + '</h4>'
        + (landlord ? '<div class="listing-submkt">' + landlord + '</div>' : '')
        + '<div class="listing-price">' + priceLine(r) + '</div>'
        + '<div class="listing-specs">'
        + (sizeStr ? '<span class="tag">' + sizeStr + '</span>' : '')
        + (clear ? '<span class="tag">' + clear + '</span>' : '')
        + (doors ? '<span class="tag">' + doors + '</span>' : '')
        + '</div>'
        + '</div>'
        + '</div>';
    });
    container.innerHTML = html;
    var lc = document.getElementById('listingsCount');
    if (lc) lc.textContent = allRecords.length + ' matching';
  }

  // ---- Stats strip — computed from actual loaded data ----
  function median(arr){
    if (!arr.length) return null;
    var s = arr.slice().sort(function(a,b){ return a-b; });
    var m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  }
  function updateStatsStrip(data){
    var strip = document.getElementById('marketStatsStrip');
    if (!strip) return;
    var leased = (data.leased || []).filter(function(r){ return r.lat && r.lng; });
    var forLease = (data.for_lease || []).filter(function(r){ return r.lat && r.lng; });
    var forSale = (data.for_sale || []).filter(function(r){ return r.lat && r.lng; });
    var sold = (data.sold || []).filter(function(r){ return r.lat && r.lng; });
    var total = leased.length + forLease.length + forSale.length + sold.length;
    var allLease = leased.concat(forLease);
    var allRecords = leased.concat(forLease, forSale, sold);

    // Median rent — prefer achieved, else asking. Use whichever any record has.
    var rents = allLease.map(function(r){
      return Number(r.achieved_net_psf || r.net_rent_psf || 0);
    }).filter(function(v){ return v > 0; });
    var mRent = median(rents);
    // Median TMI (additional rent)
    var tmis = allLease.map(function(r){ return Number(r.additional_rent_psf); }).filter(function(v){ return !isNaN(v) && v > 0; });
    var mTmi = median(tmis);
    // Median DOM — every record has it
    var doms = allRecords.map(function(r){ return Number(r.days_on_market); }).filter(function(v){ return !isNaN(v) && v > 0; });
    var mDom = median(doms);
    // % achieved vs asking (leased only)
    var pcts = leased.map(function(r){
      if (!r.achieved_net_psf || !r.net_rent_psf) return null;
      return (r.achieved_net_psf / r.net_rent_psf) * 100;
    }).filter(function(v){ return v !== null; });
    var mPct = median(pcts);

    // Region counts
    var regions = {};
    [].concat(leased, forLease, forSale, sold).forEach(function(r){
      var k = r.city || '?';
      regions[k] = (regions[k] || 0) + 1;
    });

    function setVal(id, val, fmt){
      var el = document.getElementById(id);
      if (!el) return;
      if (val == null){ el.innerHTML = '—'; return; }
      el.innerHTML = fmt(val);
    }
    setVal('statTotal', total, function(v){ return v.toString(); });
    setVal('statRent',  mRent,  function(v){ return '$' + v.toFixed(2) + '<span class="stat-unit">/SF net</span>'; });
    setVal('statTmi',   mTmi,   function(v){ return '$' + v.toFixed(2) + '<span class="stat-unit">/SF</span>'; });
    setVal('statDom',   mDom,   function(v){ return Math.round(v) + '<span class="stat-unit">days</span>'; });
    setVal('statPct',   mPct,   function(v){ return Math.round(v) + '<span class="stat-unit">%</span>'; });

    // Replace stat-meta with live counts
    var totalMeta = strip.querySelector('#statTotal + .stat-meta');
    if (totalMeta) totalMeta.textContent = forLease.length + ' for lease · ' + leased.length + ' leased · ' + forSale.length + ' for sale · ' + sold.length + ' sold';
    var rentMeta = strip.querySelector('#statRent + .stat-meta');
    if (rentMeta) rentMeta.textContent = rents.length + ' disclosed of ' + leased.length + ' leased';
    var tmiMeta = strip.querySelector('#statTmi + .stat-meta');
    if (tmiMeta) tmiMeta.textContent = tmis.length + ' disclosed';
    var domMeta = strip.querySelector('#statDom + .stat-meta');
    if (domMeta) domMeta.textContent = doms.length + ' deals tracked';
    var pctMeta = strip.querySelector('#statPct + .stat-meta');
    if (pctMeta) pctMeta.textContent = pcts.length + ' deals with both asking + achieved';

    // Region row
    var regionRow = strip.querySelector('.stat-regions');
    if (regionRow){
      var keys = Object.keys(regions).sort(function(a,b){ return regions[b] - regions[a]; });
      regionRow.innerHTML = keys.slice(0, 6).map(function(k){
        return '<span class="stat-region"><b>' + k + '</b>&nbsp;' + regions[k] + '</span>';
      }).join('') || '<span class="stat-region" style="color:var(--text-muted)">—</span>';
    }
  }

})();
