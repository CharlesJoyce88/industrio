(function(){
  "use strict";

  var KEY = 'industrio.savedSearches';

  // ---- Sample listing universe used for rendering matches.
  // For Lease + For Sale = currently active. Leased + Sold = closed deals (last 365 days).
  var DATA = {
    'for-lease': [
      { addr: '2450 Meadowvale Blvd, Unit 4',  city: 'Mississauga', lat: 43.5895, lng: -79.7235, size: 13400, clear: 26, dock: 3, driveIn: 0, rent: 16.00, photo: 'https://picsum.photos/seed/L1/600/300', landlord: 'ACME', stars: 4.1 },
      { addr: '1650 Courtneypark Dr E, Unit 11', city: 'Mississauga', lat: 43.6200, lng: -79.6885, size: 14600, clear: 28, dock: 2, driveIn: 1, rent: 16.80, photo: 'https://picsum.photos/seed/L2/600/300', landlord: 'Prologis', stars: 4.6 },
      { addr: '2700 Steeles Ave W, Unit 8',    city: 'Vaughan',     lat: 43.7800, lng: -79.5340, size: 16800, clear: 30, dock: 4, driveIn: 0, rent: 17.25, photo: 'https://picsum.photos/seed/L3/600/300', landlord: 'Continental', stars: 4.0 },
      { addr: '65 International Blvd, Unit 3', city: 'Etobicoke',   lat: 43.6815, lng: -79.5995, size:  9500, clear: 24, dock: 2, driveIn: 0, rent: 14.75, photo: 'https://picsum.photos/seed/L4/600/300', landlord: 'Meridian', stars: 3.9 },
      { addr: '80 Dynamic Dr',                 city: 'Scarborough', lat: 43.7770, lng: -79.2495, size: 12200, clear: 26, dock: 2, driveIn: 1, rent: 15.60, photo: 'https://picsum.photos/seed/L5/600/300', landlord: 'Skyline', stars: 4.1 },
      { addr: '8800 Airport Rd',               city: 'Brampton',    lat: 43.7140, lng: -79.6340, size: 10200, clear: 24, dock: 2, driveIn: 0, rent: 14.50, photo: 'https://picsum.photos/seed/L6/600/300', landlord: 'Continental', stars: 3.8 }
    ],
    'for-sale': [
      { addr: '500 Main St (industrial condo)', city: 'Markham',    lat: 43.8630, lng: -79.3200, size: 18000, clear: 28, dock: 6, driveIn: 0, askingPSF: 310, photo: 'https://picsum.photos/seed/S1/600/300', subtype: 'Freestanding' },
      { addr: '1280 Aerowood Dr',               city: 'Mississauga', lat: 43.6485, lng: -79.6560, size: 14200, clear: 26, dock: 4, driveIn: 1, askingPSF: 295, photo: 'https://picsum.photos/seed/S2/600/300', subtype: 'Condo' },
      { addr: '7700 Pine Valley Dr',            city: 'Vaughan',     lat: 43.8160, lng: -79.5720, size: 16500, clear: 30, dock: 5, driveIn: 0, askingPSF: 305, photo: 'https://picsum.photos/seed/S3/600/300', subtype: 'Freestanding' }
    ],
    'leased': [
      { addr: '5400 Dixie Rd Unit 8',     city: 'Mississauga', lat: 43.6150, lng: -79.6160, size: 11200, clear: 24, asking: 17.95, achieved: 16.80, freeMonths: 2, tiPSF: 4, dom: 52,  closedAt: '2026-04-02', photo: 'https://picsum.photos/seed/Le1/600/300' },
      { addr: '2880 Argentia Rd Unit 4',  city: 'Mississauga', lat: 43.6410, lng: -79.7175, size: 13800, clear: 26, asking: 18.50, achieved: 17.10, freeMonths: 3, tiPSF: 5, dom: 71,  closedAt: '2026-03-18', photo: 'https://picsum.photos/seed/Le2/600/300' },
      { addr: '8500 Keele St Unit 12',    city: 'Vaughan',     lat: 43.8095, lng: -79.5075, size: 13500, clear: 28, asking: 18.75, achieved: 17.40, freeMonths: 2, tiPSF: 5, dom: 65,  closedAt: '2026-02-25', photo: 'https://picsum.photos/seed/Le3/600/300' },
      { addr: '120 Walker Dr',            city: 'Brampton',    lat: 43.7240, lng: -79.7420, size: 15800, clear: 24, asking: 17.00, achieved: 15.85, freeMonths: 3, tiPSF: 5, dom: 110, closedAt: '2026-01-12', photo: 'https://picsum.photos/seed/Le4/600/300' },
      { addr: '95 Dynamic Dr',            city: 'Scarborough', lat: 43.7795, lng: -79.2510, size: 10800, clear: 26, asking: 16.00, achieved: 14.85, freeMonths: 2, tiPSF: 3, dom: 80,  closedAt: '2025-11-04', photo: 'https://picsum.photos/seed/Le5/600/300' },
      { addr: '125 Carlingview Dr',       city: 'Etobicoke',   lat: 43.6890, lng: -79.5880, size:  9200, clear: 24, asking: 16.50, achieved: 15.20, freeMonths: 2, tiPSF: 3, dom: 45,  closedAt: '2025-09-22', photo: 'https://picsum.photos/seed/Le6/600/300' }
    ],
    'sold': [
      { addr: '500 Main St N',         city: 'Markham',     lat: 43.8650, lng: -79.3215, size: 18000, askingPSF: 320, soldPSF: 305, dom: 88,  closedAt: '2026-03-30', photo: 'https://picsum.photos/seed/So1/600/300' },
      { addr: '7700 Pine Valley Dr',   city: 'Vaughan',     lat: 43.8160, lng: -79.5720, size: 16500, askingPSF: 295, soldPSF: 285, dom: 110, closedAt: '2026-01-08', photo: 'https://picsum.photos/seed/So2/600/300' },
      { addr: '6610 Tomken Rd',        city: 'Mississauga', lat: 43.6525, lng: -79.6305, size: 12800, askingPSF: 285, soldPSF: 270, dom: 95,  closedAt: '2025-08-16', photo: 'https://picsum.photos/seed/So3/600/300' }
    ]
  };

  // Color per status for the map markers. Matches map.html's palette roughly.
  var STATUS_COLORS = {
    'for-lease': '#2563eb',  // blue
    'for-sale':  '#b45309',  // amber-brown
    'leased':    '#047857',  // green
    'sold':      '#dc2626'   // red
  };

  // ---- localStorage helpers
  function loadSearches(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch(e){ return []; } }
  function saveSearches(arr){ try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch(e){} }

  // Seed a couple of demo saved searches ONLY on first ever visit (using a separate sentinel)
  if (!localStorage.getItem('industrio.savedSearches.seeded') && !loadSearches().length){
    localStorage.setItem('industrio.savedSearches.seeded', 'true');
    saveSearches([
      {
        id: 'demo-1',
        name: 'Mississauga · 10-15k SF · 5 km',
        createdAt: '2026-04-22',
        criteria: {
          status: 'for-lease', location: 'Mississauga, ON', radiusKm: 5,
          sizeMin: 10000, sizeMax: 15000, clearMin: 24, dockMin: 2, driveInMin: 0,
          rentMin: null, rentMax: 18, statuses: ['for-lease','for-sale','leased','sold']
        }
      },
      {
        id: 'demo-2',
        name: 'Brampton/Vaughan · 12-18k SF · 10 km',
        createdAt: '2026-04-10',
        criteria: {
          status: 'for-lease', location: 'Brampton, ON', radiusKm: 10,
          sizeMin: 12000, sizeMax: 18000, clearMin: 26, dockMin: 3, driveInMin: 0,
          rentMin: null, rentMax: null, statuses: ['for-lease','for-sale','leased','sold']
        }
      }
    ]);
  }

  // ---- DOM refs
  var picker = document.getElementById('searchPicker');
  var emptyEl = document.getElementById('trackedEmpty');
  var bodyEl = document.getElementById('trackedBody');
  var critEl = document.getElementById('trackedCriteria');
  var resultsEl = document.getElementById('trackedResults');
  var newBtn = document.getElementById('newSearchBtn');
  var renameBtn = document.getElementById('renameSearchBtn');
  var deleteBtn = document.getElementById('deleteSearchBtn');
  var tabs = document.querySelectorAll('.tracked-tab');

  var currentSearchId = null;
  var currentTab = 'for-lease';
  var currentView = 'cards';      // 'cards' | 'map'
  var lastItems = [];              // remember most recent render so view-switch repaints the same list
  var lastStatus = 'for-lease';

  // ---- Renderers
  function fmtNum(n){ return Number(n).toLocaleString('en-CA'); }
  // Parse a YYYY-MM-DD string as a LOCAL date so we don't drift one day from UTC interpretation.
  function parseLocal(s){
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDate(s){
    if (!s) return '';
    var d = parseLocal(s);
    if (!d) return s;
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function daysAgo(s){
    var d = parseLocal(s);
    if (!d) return null;
    var today = new Date(); today.setHours(0,0,0,0);
    var that  = new Date(d); that.setHours(0,0,0,0);
    return Math.round((today.getTime() - that.getTime()) / 86400000);
  }
  function withinLastYear(s){
    var d = daysAgo(s);
    return d !== null && d <= 365;
  }

  function matchesCriteria(item, c){
    if (c.sizeMin && item.size < c.sizeMin) return false;
    if (c.sizeMax && item.size > c.sizeMax) return false;
    if (c.clearMin && item.clear !== undefined && item.clear < c.clearMin) return false;
    if (c.dockMin && item.dock  !== undefined && item.dock  < c.dockMin)  return false;
    if (c.driveInMin && item.driveIn !== undefined && item.driveIn < c.driveInMin) return false;
    if (c.location){
      var citymatch = c.location.split(',')[0].trim().toLowerCase();
      if (item.city && !item.city.toLowerCase().includes(citymatch) && c.radiusKm && c.radiusKm < 8){
        return false; // tight radius — only show same city
      }
    }
    return true;
  }

  function renderCriteria(s){
    var c = s.criteria;
    var rows = ['<div class="crit-row crit-row-title"><span class="crit-section-title">Search parameters</span></div>'];
    rows.push('<div class="crit-row"><span class="crit-lbl">Location</span><span class="crit-val">' + (c.location || '—') + (c.radiusKm ? ' &middot; ' + c.radiusKm + ' km radius' : '') + '</span></div>');
    rows.push('<div class="crit-row"><span class="crit-lbl">Size</span><span class="crit-val">' + (c.sizeMin ? fmtNum(c.sizeMin) : '0') + ' &ndash; ' + (c.sizeMax ? fmtNum(c.sizeMax) + ' SF' : 'no max') + '</span></div>');
    if (c.clearMin)   rows.push('<div class="crit-row"><span class="crit-lbl">Clear height</span><span class="crit-val">' + c.clearMin + "' min</span></div>");
    if (c.dockMin || c.driveInMin) rows.push('<div class="crit-row"><span class="crit-lbl">Shipping</span><span class="crit-val">' + (c.dockMin ? c.dockMin + ' dock' : '') + (c.dockMin && c.driveInMin ? ' &middot; ' : '') + (c.driveInMin ? c.driveInMin + ' DID' : '') + '</span></div>');
    if (c.rentMin || c.rentMax) rows.push('<div class="crit-row"><span class="crit-lbl">Rent</span><span class="crit-val">$' + (c.rentMin || 0) + ' &ndash; $' + (c.rentMax || 'max') + ' / SF / yr</span></div>');
    var demog = [];
    if (c.minLabour)     demog.push(fmtNum(c.minLabour) + ' labour');
    if (c.minDaytimePop) demog.push(fmtNum(c.minDaytimePop) + ' daytime');
    if (c.minIncome)     demog.push('$' + fmtNum(c.minIncome) + ' income');
    if (demog.length) rows.push('<div class="crit-row"><span class="crit-lbl">Demographics</span><span class="crit-val">' + demog.join(' &middot; ') + '</span></div>');
    if (Array.isArray(c.permittedUses) && c.permittedUses.length){
      rows.push('<div class="crit-row"><span class="crit-lbl">Zoning uses</span><span class="crit-val">' + c.permittedUses.join(', ') + '</span></div>');
    }
    if (c.zoneCode) rows.push('<div class="crit-row"><span class="crit-lbl">Zone code</span><span class="crit-val">' + c.zoneCode + '</span></div>');
    if (c.maxTruckLength && c.maxTruckLength !== 'any'){
      var tll = { '24': "24' straight box", '28': "28' pup trailer", '40': "40' (sea-can)", '48': "48' standard", '53': "53' standard", '75': "75' B-train (LCV)" };
      rows.push('<div class="crit-row"><span class="crit-lbl">Max truck length</span><span class="crit-val">' + (tll[c.maxTruckLength] || c.maxTruckLength) + '</span></div>');
    }
    rows.push('<div class="crit-row"><span class="crit-lbl">Saved</span><span class="crit-val">' + fmtDate(s.createdAt) + '</span></div>');
    critEl.innerHTML = rows.join('');
  }

  function leaseCard(item){
    return '<div class="tracked-card">' +
      '<div class="listing-photo" style="background-image:url(\''+item.photo+'\');height:118px;">' +
        '<span class="listing-status-badge lease">For Lease</span>' +
      '</div>' +
      '<div class="listing-body">' +
        '<h4 class="listing-address">' + item.addr + '</h4>' +
        '<div class="listing-submkt">' + item.city + (item.landlord ? ' &middot; ' + item.landlord + ' (' + item.stars + '★)' : '') + '</div>' +
        '<div class="listing-price">$' + item.rent.toFixed(2) + '<span class="unit">net / SF / yr</span></div>' +
        '<div class="listing-specs">' +
          '<span class="tag">' + fmtNum(item.size) + ' SF</span>' +
          '<span class="tag">' + item.clear + "' clear</span>" +
          '<span class="tag">' + item.dock + ' dock' + (item.driveIn ? ' + ' + item.driveIn + ' DID' : '') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function saleCard(item){
    return '<div class="tracked-card">' +
      '<div class="listing-photo" style="background-image:url(\''+item.photo+'\');height:118px;">' +
        '<span class="listing-status-badge sale">For Sale</span>' +
      '</div>' +
      '<div class="listing-body">' +
        '<h4 class="listing-address">' + item.addr + '</h4>' +
        '<div class="listing-submkt">' + item.city + (item.subtype ? ' &middot; ' + item.subtype : '') + '</div>' +
        '<div class="listing-price">$' + item.askingPSF + '<span class="unit">/ SF asking</span></div>' +
        '<div class="listing-specs">' +
          '<span class="tag">' + fmtNum(item.size) + ' SF</span>' +
          '<span class="tag">' + item.clear + "' clear</span>" +
          '<span class="tag">' + item.dock + ' dock</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function leasedCard(item){
    var spread = ((item.asking - item.achieved) / item.asking * 100).toFixed(1);
    return '<div class="tracked-card closed">' +
      '<div class="listing-photo" style="background-image:url(\''+item.photo+'\');height:118px;">' +
        '<span class="listing-status-badge closed">Leased ' + fmtDate(item.closedAt) + '</span>' +
      '</div>' +
      '<div class="listing-body">' +
        '<h4 class="listing-address">' + item.addr + '</h4>' +
        '<div class="listing-submkt">' + item.city + ' &middot; ' + daysAgo(item.closedAt) + ' days ago</div>' +
        '<div class="listing-price">$' + item.achieved.toFixed(2) + ' achieved <span class="unit">vs $' + item.asking.toFixed(2) + ' asking · −' + spread + '%</span></div>' +
        '<div class="listing-specs">' +
          '<span class="tag">' + fmtNum(item.size) + ' SF</span>' +
          '<span class="tag">' + item.clear + "' clear</span>" +
          '<span class="tag">' + item.freeMonths + ' mo free</span>' +
          '<span class="tag">$' + item.tiPSF + ' TI</span>' +
          '<span class="tag">' + item.dom + ' DOM</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function soldCard(item){
    var spread = ((item.askingPSF - item.soldPSF) / item.askingPSF * 100).toFixed(1);
    return '<div class="tracked-card closed">' +
      '<div class="listing-photo" style="background-image:url(\''+item.photo+'\');height:118px;">' +
        '<span class="listing-status-badge closed">Sold ' + fmtDate(item.closedAt) + '</span>' +
      '</div>' +
      '<div class="listing-body">' +
        '<h4 class="listing-address">' + item.addr + '</h4>' +
        '<div class="listing-submkt">' + item.city + ' &middot; ' + daysAgo(item.closedAt) + ' days ago</div>' +
        '<div class="listing-price">$' + item.soldPSF + ' sold <span class="unit">vs $' + item.askingPSF + ' asking · −' + spread + '%</span></div>' +
        '<div class="listing-specs">' +
          '<span class="tag">' + fmtNum(item.size) + ' SF</span>' +
          '<span class="tag">' + item.dom + ' DOM</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function filterAndCount(s){
    var c = s.criteria;
    var counts = { 'for-lease': 0, 'for-sale': 0, 'leased': 0, 'sold': 0 };
    var lists = { 'for-lease': [], 'for-sale': [], 'leased': [], 'sold': [] };
    DATA['for-lease'].forEach(function(i){ if (matchesCriteria(i, c)) { counts['for-lease']++; lists['for-lease'].push(i); } });
    DATA['for-sale'].forEach(function(i){  if (matchesCriteria(i, c)) { counts['for-sale']++;  lists['for-sale'].push(i); } });
    DATA['leased'].forEach(function(i){    if (matchesCriteria(i, c) && withinLastYear(i.closedAt)) { counts['leased']++; lists['leased'].push(i); } });
    DATA['sold'].forEach(function(i){      if (matchesCriteria(i, c) && withinLastYear(i.closedAt)) { counts['sold']++;   lists['sold'].push(i); } });
    return { counts: counts, lists: lists };
  }

  function renderTab(s, status){
    var f = filterAndCount(s);
    document.getElementById('cntLease').textContent  = f.counts['for-lease'];
    document.getElementById('cntSale').textContent   = f.counts['for-sale'];
    document.getElementById('cntLeased').textContent = f.counts['leased'];
    document.getElementById('cntSold').textContent   = f.counts['sold'];
    var items = f.lists[status] || [];

    // Render whichever view is currently active.
    if (currentView === 'map') {
      renderMap(items, status);
    } else {
      renderCards(items, status);
    }
    lastItems = items;
    lastStatus = status;
  }

  function renderCards(items, status){
    if (!items.length){
      resultsEl.innerHTML = '<div class="tracked-no-matches">No ' + status.replace('-', ' ') + ' listings match this search right now. Industrio will alert you when one does.</div>';
      return;
    }
    var html = items.map(function(i){
      if (status === 'for-lease') return leaseCard(i);
      if (status === 'for-sale')  return saleCard(i);
      if (status === 'leased')    return leasedCard(i);
      if (status === 'sold')      return soldCard(i);
      return '';
    }).join('');
    resultsEl.innerHTML = html;
  }

  // ---- Map view: lazy-initialize Leaflet when first requested, then plot
  //      a colored circleMarker for each listing in the current status tab.
  var mapInstance = null;
  var markerLayer = null;

  function popupHtml(item, status){
    var price;
    if (status === 'for-lease') price = '<strong>$' + item.rent.toFixed(2) + '</strong> net / SF / yr';
    else if (status === 'for-sale') price = '<strong>$' + item.askingPSF + '</strong> / SF asking';
    else if (status === 'leased') price = '<strong>$' + item.achieved.toFixed(2) + '</strong> achieved · $' + item.asking.toFixed(2) + ' asking';
    else if (status === 'sold') price = '<strong>$' + item.soldPSF + '</strong> sold · $' + item.askingPSF + ' asking';
    else price = '';
    return '<div style="min-width:180px">' +
      '<div style="font-weight:600;margin-bottom:4px;">' + item.addr + '</div>' +
      '<div style="color:#555;font-size:0.82rem;margin-bottom:6px;">' + item.city + '</div>' +
      '<div style="font-size:0.88rem;">' + price + '</div>' +
      '<div style="font-size:0.78rem;color:#666;margin-top:6px;">' +
        fmtNum(item.size) + ' SF' + (item.clear ? ' &middot; ' + item.clear + "' clear" : '') +
      '</div>' +
    '</div>';
  }

  function initMap(){
    if (mapInstance || typeof L === 'undefined') return;
    var mapEl = document.getElementById('trackedMap');
    if (!mapEl) return;
    mapInstance = L.map(mapEl, { scrollWheelZoom: true }).setView([43.70, -79.55], 10);
    mapInstance.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
    setTimeout(function(){ if (mapInstance) mapInstance.invalidateSize(); }, 50);
  }

  function renderMap(items, status){
    initMap();
    if (!mapInstance || !markerLayer) return;
    markerLayer.clearLayers();
    var color = STATUS_COLORS[status] || '#0f1e4e';
    var pts = [];
    items.forEach(function(item){
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
      var m = L.circleMarker([item.lat, item.lng], {
        radius: 9, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.95
      }).bindPopup(popupHtml(item, status));
      markerLayer.addLayer(m);
      pts.push([item.lat, item.lng]);
    });
    if (pts.length === 0) {
      // No points — nothing to re-fit; leave view where it is.
      return;
    }
    if (pts.length === 1) {
      mapInstance.setView(pts[0], 12);
    } else {
      mapInstance.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    }
    setTimeout(function(){ mapInstance.invalidateSize(); }, 50);
  }

  // ---- Notification email: persisted per-search in localStorage.
  function notifyKey(sid){ return 'industrio.savedSearches.notify.' + sid; }
  function loadNotifyEmail(sid){ try { return localStorage.getItem(notifyKey(sid)) || ''; } catch(e){ return ''; } }
  function saveNotifyEmail(sid, email){ try { localStorage.setItem(notifyKey(sid), email); } catch(e){} }

  function syncNotifyPanel(){
    var input = document.getElementById('notifyEmail');
    var saved = document.getElementById('notifySaved');
    if (!input) return;
    input.value = currentSearchId ? loadNotifyEmail(currentSearchId) : '';
    if (saved) saved.classList.remove('on');
  }

  function refreshPicker(selectId){
    var arr = loadSearches();
    console.log('[industrio] tracked.js loaded ' + arr.length + ' saved search(es)', arr);
    if (!arr.length){
      emptyEl.removeAttribute('hidden');
      bodyEl.setAttribute('hidden', '');
      picker.innerHTML = '';
      return;
    }
    emptyEl.setAttribute('hidden', '');
    bodyEl.removeAttribute('hidden');
    picker.innerHTML = arr.map(function(s){
      return '<option value="' + s.id + '">' + s.name + ' &middot; saved ' + fmtDate(s.createdAt) + '</option>';
    }).join('');
    // Visual pill-card picker
    var tabs = document.getElementById('searchTabs');
    if (tabs){
      tabs.innerHTML = arr.map(function(s){
        var c = s.criteria || {};
        var meta = [];
        if (c.location) meta.push(String(c.location).split(',')[0]);
        if (c.sizeMin || c.sizeMax) meta.push((c.sizeMin ? Math.round(c.sizeMin/1000)+'k' : '0') + '-' + (c.sizeMax ? Math.round(c.sizeMax/1000)+'k' : 'max') + ' SF');
        if (s.createdAt) meta.push(fmtDate(s.createdAt));
        return '<button class="search-tab-pill' + (s.id === currentSearchId ? ' active' : '') + '" data-pill-id="' + s.id + '" type="button"><span class="name">' + s.name + '</span><span class="meta">' + meta.join(' · ') + '</span></button>';
      }).join('');
    }
    var cnt = document.getElementById('searchCount');
    if (cnt) cnt.textContent = arr.length + ' saved';
    if (selectId && arr.some(function(s){ return s.id === selectId; })){
      picker.value = selectId;
      currentSearchId = selectId;
    } else {
      currentSearchId = arr[0].id;
      picker.value = currentSearchId;
    }
    renderCurrent();
  }

  function renderCurrent(){
    var s = loadSearches().find(function(x){ return x.id === currentSearchId; });
    if (!s) return;
    renderCriteria(s);
    applyViewVisibility();  // make sure the correct view container is shown
    renderTab(s, currentTab);
    syncNotifyPanel();
  }

  // Toggle visibility of the two view containers (#trackedResults = cards,
  // #trackedMap = Leaflet map) based on currentView.
  function applyViewVisibility(){
    var cardsEl = document.getElementById('trackedResults');
    var mapEl   = document.getElementById('trackedMap');
    if (cardsEl) {
      if (currentView === 'cards') cardsEl.removeAttribute('hidden');
      else cardsEl.setAttribute('hidden', '');
    }
    if (mapEl) {
      if (currentView === 'map') mapEl.removeAttribute('hidden');
      else mapEl.setAttribute('hidden', '');
    }
    // Toggle button .active state
    document.querySelectorAll('#trackedViewMode button').forEach(function(b){
      var isActive = b.dataset.view === currentView;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  // ---- Wire up
  picker.addEventListener('change', function(){ currentSearchId = picker.value; renderCurrent(); refreshPicker(currentSearchId); });
  var tabsEl = document.getElementById('searchTabs');
  if (tabsEl){
    tabsEl.addEventListener('click', function(e){
      var b = e.target.closest('.search-tab-pill');
      if (!b) return;
      currentSearchId = b.dataset.pillId;
      refreshPicker(currentSearchId);
    });
  }
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){ x.classList.toggle('active', x === t); });
      currentTab = t.dataset.status;
      renderCurrent();
    });
  });
  newBtn.addEventListener('click', function(){ window.location.href = 'map.html'; });

  // View-mode toggle: Photo cards | Map
  var viewModeEl = document.getElementById('trackedViewMode');
  if (viewModeEl){
    viewModeEl.addEventListener('click', function(e){
      var b = e.target.closest('button[data-view]');
      if (!b) return;
      var v = b.dataset.view;
      if (v !== 'cards' && v !== 'map') return;
      if (v === currentView) return;
      currentView = v;
      renderCurrent();
    });
  }

  // Notification email: save per-search to localStorage, show a brief confirmation.
  var notifyBtn = document.getElementById('notifySaveBtn');
  if (notifyBtn){
    notifyBtn.addEventListener('click', function(){
      if (!currentSearchId) return;
      var input = document.getElementById('notifyEmail');
      var saved = document.getElementById('notifySaved');
      var val = input ? input.value.trim() : '';
      if (val && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)){
        alert('Please enter a valid email address.');
        return;
      }
      saveNotifyEmail(currentSearchId, val);
      if (saved){
        saved.classList.add('on');
        setTimeout(function(){ saved.classList.remove('on'); }, 3500);
      }
    });
  }
  renameBtn.addEventListener('click', function(){
    var arr = loadSearches();
    var s = arr.find(function(x){ return x.id === currentSearchId; });
    if (!s) return;
    var newName = window.prompt('Rename saved search:', s.name);
    if (newName){ s.name = newName.trim(); saveSearches(arr); refreshPicker(currentSearchId); }
  });
  deleteBtn.addEventListener('click', function(){
    var arr = loadSearches();
    var s = arr.find(function(x){ return x.id === currentSearchId; });
    if (!s) return;
    if (!window.confirm('Delete saved search "' + s.name + '"?')) return;
    arr = arr.filter(function(x){ return x.id !== currentSearchId; });
    saveSearches(arr);
    currentSearchId = null;
    refreshPicker();
  });

  // Wire "Load demo searches" button on the empty state
  var loadDemo = document.getElementById('loadDemoBtn');
  if (loadDemo){
    loadDemo.addEventListener('click', function(){
      saveSearches([
        { id: 'demo-' + Date.now() + '-a', name: 'Mississauga · 10-15k SF · 5 km', createdAt: (function(){ var d=new Date(); var p=function(n){return n<10?'0'+n:n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })(), criteria: { status:'for-lease', location:'Mississauga, ON', radiusKm:5, sizeMin:10000, sizeMax:15000, clearMin:24, dockMin:2, driveInMin:0, rentMin:null, rentMax:18, statuses:['for-lease','for-sale','leased','sold'] } },
        { id: 'demo-' + Date.now() + '-b', name: 'Brampton/Vaughan · 12-18k SF · 10 km', createdAt: (function(){ var d=new Date(); var p=function(n){return n<10?'0'+n:n;}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })(), criteria: { status:'for-lease', location:'Brampton, ON', radiusKm:10, sizeMin:12000, sizeMax:18000, clearMin:26, dockMin:3, driveInMin:0, rentMin:null, rentMax:null, statuses:['for-lease','for-sale','leased','sold'] } }
      ]);
      refreshPicker();
    });
  }

  refreshPicker();
})();
