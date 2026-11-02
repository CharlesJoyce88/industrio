// industrio — Side-by-side property comparison
// Lets the user pick 2–4 listings from the sidebar and pop up a comparison matrix.
// Self-contained: parses each .listing-card's existing display markup, no JSON wiring needed.

(function(){
  "use strict";

  var MAX_SELECT = 4;
  var selected = []; // array of card DOM elements, ordered by selection time

  // ---------- Parse a single listing-card into a structured comp object ----------
  function parseCard(card){
    function txt(el){ return el ? el.textContent.replace(/\s+/g,' ').trim() : ''; }
    var photoEl = card.querySelector('.listing-photo');
    var bg = photoEl ? (photoEl.style.backgroundImage || '') : '';
    var photo = '';
    var m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
    if (m) photo = m[1];
    var status = txt(card.querySelector('.listing-status-badge'));
    var match  = txt(card.querySelector('.listing-match'));
    var addr   = txt(card.querySelector('.listing-address'));
    var submkt = txt(card.querySelector('.listing-submkt'));
    // submkt looks like: "Mississauga · 8.4★ landlord"  or  "Markham · Freestanding"
    var city = submkt.split('·')[0].trim();
    var landlord = submkt.replace(/^[^·]+·\s*/, '').trim();
    var stars = null;
    var sm = landlord.match(/([\d.]+)\s*★/);
    if (sm) stars = parseFloat(sm[1]);
    var priceEl = card.querySelector('.listing-price');
    var unitEl = priceEl ? priceEl.querySelector('.unit') : null;
    var unitTxt = unitEl ? unitEl.textContent.trim() : '';
    var priceTxt = priceEl ? priceEl.firstChild.textContent.trim() : '';
    var price = parseFloat(priceTxt.replace(/[$,]/g,''));
    var tags = Array.prototype.slice.call(card.querySelectorAll('.listing-specs .tag')).map(txt);
    // Heuristics from tags
    var size = '', clear = '', doors = '', extra = '';
    tags.forEach(function(t){
      if (/SF/i.test(t) && !/clear/i.test(t)) size = t;
      else if (/clear/i.test(t)) clear = t;
      else if (/(TL|DID|DI)\b/.test(t) || /^\d+\s*(dock|drive)/i.test(t)) doors = t;
      else extra = extra ? extra + ' · ' + t : t;
    });
    // Compute a rough all-in $/SF/yr for lease listings (assume +$6.20 additional)
    var allIn = '';
    if (/lease|sublease/i.test(status) && !isNaN(price)){
      if (/all-in/i.test(unitTxt)) allIn = '$' + price.toFixed(2);
      else allIn = '$' + (price + 6.20).toFixed(2) + ' (est.)';
    }
    var sizeNum = null;
    var sm2 = size.match(/([\d,]+)\s*SF/i);
    if (sm2) sizeNum = parseInt(sm2[1].replace(/,/g,''),10);

    return {
      photo: photo,
      status: status,
      match: match,
      address: addr,
      city: city,
      landlord: landlord,
      stars: stars,
      price: priceTxt,
      priceNum: isNaN(price) ? null : price,
      unit: unitTxt,
      size: size,
      sizeNum: sizeNum,
      clear: clear,
      doors: doors,
      extra: extra,
      allIn: allIn
    };
  }

  // ---------- Inject a select toggle onto each listing-card ----------
  function injectToggles(){
    var cards = document.querySelectorAll('#listingCards .listing-card');
    cards.forEach(function(card){
      if (card.querySelector('.compare-toggle')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'compare-toggle';
      btn.title = 'Add to compare';
      btn.setAttribute('aria-label', 'Add to compare');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        toggleCard(card);
      });
      // Photo box is the visual top — overlay the button there
      var photo = card.querySelector('.listing-photo') || card;
      photo.appendChild(btn);
    });
  }

  function toggleCard(card){
    var idx = selected.indexOf(card);
    if (idx >= 0){
      selected.splice(idx, 1);
      card.classList.remove('compare-selected');
    } else {
      if (selected.length >= MAX_SELECT){
        flashBar("Up to " + MAX_SELECT + " listings can be compared at once");
        return;
      }
      selected.push(card);
      card.classList.add('compare-selected');
    }
    refreshBar();
  }

  // ---------- Floating "Compare (N)" bar at the bottom of the sidebar ----------
  function ensureBar(){
    var bar = document.getElementById('compareBar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'compareBar';
    bar.className = 'compare-bar';
    bar.hidden = true;
    bar.innerHTML = ''
      + '<div class="compare-bar-left">'
      +   '<span class="compare-bar-count" id="compareBarCount">0 selected</span>'
      +   '<span class="compare-bar-hint">pick 2&ndash;' + MAX_SELECT + ' listings</span>'
      + '</div>'
      + '<div class="compare-bar-right">'
      +   '<button type="button" class="compare-bar-clear" id="compareBarClear">Clear</button>'
      +   '<button type="button" class="compare-bar-go" id="compareBarGo" disabled>Compare</button>'
      + '</div>';
    // Append to the sidebar so it sticks at the bottom under the listing cards
    var side = document.querySelector('.map-sidebar') || document.body;
    side.appendChild(bar);
    bar.querySelector('#compareBarClear').addEventListener('click', clearSelection);
    bar.querySelector('#compareBarGo').addEventListener('click', openModal);
    return bar;
  }

  function refreshBar(){
    var bar = ensureBar();
    var n = selected.length;
    bar.hidden = (n === 0);
    var count = bar.querySelector('#compareBarCount');
    if (count) count.textContent = n + ' selected';
    var go = bar.querySelector('#compareBarGo');
    if (go) go.disabled = (n < 2);
  }

  function flashBar(msg){
    var bar = ensureBar();
    var hint = bar.querySelector('.compare-bar-hint');
    if (!hint) return;
    var prev = hint.textContent;
    hint.textContent = msg;
    hint.classList.add('flash');
    setTimeout(function(){ hint.textContent = prev; hint.classList.remove('flash'); }, 1800);
  }

  function clearSelection(){
    selected.forEach(function(c){ c.classList.remove('compare-selected'); });
    selected = [];
    refreshBar();
  }

  // ---------- Comparison modal ----------
  function ensureModal(){
    var m = document.getElementById('compareModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'compareModal';
    m.className = 'compare-modal';
    m.hidden = true;
    m.innerHTML = ''
      + '<div class="compare-modal-inner">'
      +   '<div class="compare-modal-head">'
      +     '<div>'
      +       '<div class="compare-modal-eyebrow">Side-by-side</div>'
      +       '<h2 class="compare-modal-title">Comparing <span id="compareModalCount">0</span> listings</h2>'
      +     '</div>'
      +     '<button type="button" class="compare-modal-close" id="compareModalClose" aria-label="Close">&times;</button>'
      +   '</div>'
      +   '<div class="compare-modal-body" id="compareModalBody"></div>'
      +   '<div class="compare-modal-foot">'
      +     '<button type="button" class="btn btn-secondary" id="compareModalClear">Clear all</button>'
      +     '<button type="button" class="btn btn-primary" id="compareModalDone">Done</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(m);
    m.addEventListener('mousedown', function(e){ if (e.target === m) closeModal(); });
    m.querySelector('#compareModalClose').addEventListener('click', closeModal);
    m.querySelector('#compareModalDone').addEventListener('click', closeModal);
    m.querySelector('#compareModalClear').addEventListener('click', function(){
      clearSelection();
      closeModal();
    });
    return m;
  }

  function closeModal(){
    var m = document.getElementById('compareModal');
    if (m) m.hidden = true;
    document.body.classList.remove('compare-modal-open');
  }

  function openModal(){
    if (selected.length < 2) return;
    var m = ensureModal();
    renderMatrix();
    m.hidden = false;
    document.body.classList.add('compare-modal-open');
  }

  // ---------- Render the comparison matrix ----------
  function renderMatrix(){
    var body = document.getElementById('compareModalBody');
    var count = document.getElementById('compareModalCount');
    if (!body) return;
    var comps = selected.map(parseCard);
    if (count) count.textContent = String(comps.length);

    // Compute "winners" for highlight: lowest rent, lowest price, biggest size, tallest clear, most doors, highest stars
    function num(s){ if (!s) return null; var x = parseFloat(String(s).replace(/[^0-9.]/g,'')); return isNaN(x) ? null : x; }
    var bestPrice = null, bestSize = null, bestClear = null, bestDoors = null, bestStars = null;
    comps.forEach(function(c){
      if (c.priceNum != null && (bestPrice == null || c.priceNum < bestPrice)) bestPrice = c.priceNum;
      if (c.sizeNum != null && (bestSize == null || c.sizeNum > bestSize)) bestSize = c.sizeNum;
      var ch = num(c.clear); if (ch != null && (bestClear == null || ch > bestClear)) bestClear = ch;
      var dn = num(c.doors); if (dn != null && (bestDoors == null || dn > bestDoors)) bestDoors = dn;
      if (c.stars != null && (bestStars == null || c.stars > bestStars)) bestStars = c.stars;
    });

    // Build header row: thumbnail + address card per listing
    var html = '';
    html += '<div class="compare-matrix" style="grid-template-columns: 180px repeat(' + comps.length + ', minmax(180px, 1fr));">';

    // Header (column for each listing)
    html += '<div class="compare-cell compare-cell-row-label compare-cell-header"></div>';
    comps.forEach(function(c, i){
      html += ''
        + '<div class="compare-cell compare-cell-header">'
        +   '<div class="compare-thumb" style="background-image:url(' + JSON.stringify(c.photo).slice(1, -1) + ');">'
        +     (c.match ? '<span class="compare-thumb-match">' + escapeHtml(c.match) + '</span>' : '')
        +     '<button type="button" class="compare-thumb-remove" data-idx="' + i + '" aria-label="Remove">&times;</button>'
        +   '</div>'
        +   '<div class="compare-thumb-status ' + statusClass(c.status) + '">' + escapeHtml(c.status) + '</div>'
        +   '<div class="compare-thumb-addr">' + escapeHtml(c.address) + '</div>'
        +   '<div class="compare-thumb-city">' + escapeHtml(c.city || '') + '</div>'
        + '</div>';
    });

    // Helper: render a row with a label and one cell per listing
    function row(label, getter, opts){
      opts = opts || {};
      html += '<div class="compare-cell compare-cell-row-label">' + escapeHtml(label) + '</div>';
      comps.forEach(function(c){
        var val = getter(c);
        var cls = 'compare-cell';
        if (opts.winner && opts.winner(c)) cls += ' compare-cell-winner';
        if (val === '' || val == null) { val = '<span class="compare-na">&mdash;</span>'; cls += ' compare-cell-empty'; }
        html += '<div class="' + cls + '">' + (opts.html ? val : escapeHtml(String(val))) + '</div>';
      });
    }

    row('Asking rent / price', function(c){ return c.price ? c.price + (c.unit ? ' ' + c.unit : '') : ''; }, {
      winner: function(c){ return bestPrice != null && c.priceNum === bestPrice; }
    });
    row('All-in $/SF/yr (est.)', function(c){ return c.allIn || ''; });
    row('Size', function(c){ return c.size; }, {
      winner: function(c){ return bestSize != null && c.sizeNum === bestSize; }
    });
    row('Clear height', function(c){ return c.clear; }, {
      winner: function(c){ var n = num(c.clear); return bestClear != null && n === bestClear; }
    });
    row('Loading doors', function(c){ return c.doors; }, {
      winner: function(c){ var n = num(c.doors); return bestDoors != null && n === bestDoors; }
    });
    row('Submarket', function(c){ return c.city; });
    row('Landlord', function(c){
      if (!c.landlord) return '';
      return c.landlord;
    }, {
      winner: function(c){ return bestStars != null && c.stars === bestStars; }
    });
    row('Notes', function(c){ return c.extra || ''; });

    html += '</div>'; // /compare-matrix

    // Action notes
    html += ''
      + '<div class="compare-bottom-actions">'
      +   '<button type="button" class="compare-action" data-act="email">&#9993;&nbsp; Email this comparison</button>'
      +   '<button type="button" class="compare-action" data-act="print">&#128424;&nbsp; Print</button>'
      +   '<button type="button" class="compare-action" data-act="loi">&#128221;&nbsp; Generate LOIs</button>'
      + '</div>';

    body.innerHTML = html;

    // Wire per-row remove buttons
    body.querySelectorAll('.compare-thumb-remove').forEach(function(b){
      b.addEventListener('click', function(){
        var i = parseInt(b.dataset.idx, 10);
        var card = selected[i];
        if (card){ toggleCard(card); }
        if (selected.length < 2) closeModal();
        else renderMatrix();
        refreshBar();
      });
    });
    // Wire bottom actions (placeholders for now)
    body.querySelectorAll('.compare-action').forEach(function(b){
      b.addEventListener('click', function(){
        var act = b.dataset.act;
        if (act === 'print'){ window.print(); return; }
        if (act === 'email'){ window.alert('Email this comparison — coming soon. (We\u2019ll send a PDF of this matrix to whoever you choose.)'); return; }
        if (act === 'loi'){ window.alert('Generate LOIs — coming soon. (One letter of intent per listing, pre-filled with your requirements.)'); return; }
      });
    });
  }

  function statusClass(s){
    s = (s || '').toLowerCase();
    if (s.indexOf('sale') !== -1) return 'sale';
    if (s.indexOf('sublease') !== -1) return 'sublease';
    return 'lease';
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // ---------- Boot ----------
  function boot(){
    injectToggles();
    ensureBar();
    refreshBar();
    // Re-inject toggles whenever the listingCards container's children change
    // (e.g. if real listings replace the samples later).
    var host = document.getElementById('listingCards');
    if (host && window.MutationObserver){
      var mo = new MutationObserver(function(){ injectToggles(); });
      mo.observe(host, { childList: true });
    }
    // Make the listing-card body clickable through to the detail page.
    if (host){
      host.addEventListener('click', function(e){
        if (e.target.closest('.compare-toggle')) return;
        var card = e.target.closest('.listing-card');
        if (!card) return;
        var addr = (card.querySelector('.listing-address') || {}).textContent || '';
        // For the demo, all clicks open the canonical 5309 Maingate detail page;
        // production would route by listing id to /listing-detail?id=...
        window.location.href = 'listing-detail.html';
      });
    }
    // Esc closes modal
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        var m = document.getElementById('compareModal');
        if (m && !m.hidden) closeModal();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
