(function(){
  "use strict";

  // ===== Active for-lease listings (sample pool) =====
  var SAMPLE_LISTINGS = [
    { addr: "2400 Meadowvale Blvd, Unit 6", city: "Mississauga", size: 12400,
      rent: 15.50, tmi: 6.20, clear: 26, office: 12, doors: 3, parking: 1.4,
      ll: "ACME Industrial Holdings", llScore: 8.2, env: 2,
      tags: ["Whitebox", "3 TL doors", "600A @ 600V", "Drive-in", "GTA West"],
      hasWhitebox: true, has600A: true, hasDriveIn: true, hasCrane: false, hasRail: false, hasHvac: true, hasOS: false,
      daysOld: 0 },
    { addr: "8800 Airport Rd, Bay 4", city: "Brampton", size: 9800,
      rent: 14.75, tmi: 5.80, clear: 24, office: 15, doors: 2, parking: 1.1,
      ll: "Continental Business Parks", llScore: 7.3, env: 3,
      tags: ["400A @ 347/600V", "2 TL doors", "Office reno 2024"],
      hasWhitebox: false, has600A: false, hasDriveIn: false, hasCrane: false, hasRail: false, hasHvac: false, hasOS: false,
      daysOld: 0 },
    { addr: "1200 Aimco Blvd, Unit 14", city: "Mississauga", size: 14200,
      rent: 16.25, tmi: 6.50, clear: 22, office: 18, doors: 3, parking: 1.6,
      ll: "ACME Industrial Holdings", llScore: 8.2, env: 1,
      tags: ["Drive-in", "2 TL doors", "Freshly painted", "Outside storage"],
      hasWhitebox: false, has600A: false, hasDriveIn: true, hasCrane: false, hasRail: false, hasHvac: false, hasOS: true,
      daysOld: 0 },
    { addr: "45 Courtneypark Dr E", city: "Mississauga", size: 11600,
      rent: 17.00, tmi: 7.10, clear: 28, office: 10, doors: 2, parking: 1.3,
      ll: "Prologis Canada", llScore: 8.6, env: 1,
      tags: ["Whitebox", "600A @ 600V", "2 TL doors", "Heavy HVAC", "28' clear"],
      hasWhitebox: true, has600A: true, hasDriveIn: false, hasCrane: false, hasRail: false, hasHvac: true, hasOS: false,
      daysOld: 0 },
    { addr: "7100 Pacific Circle", city: "Mississauga", size: 13800,
      rent: 15.90, tmi: 6.00, clear: 24, office: 8, doors: 4, parking: 1.0,
      ll: "ACME Industrial Holdings", llScore: 8.2, env: 2,
      tags: ["4 TL doors", "600A @ 600V", "Crane-ready"],
      hasWhitebox: false, has600A: true, hasDriveIn: false, hasCrane: true, hasRail: false, hasHvac: false, hasOS: false,
      daysOld: 0 }
  ];

  // ===== Recently leased comps (last 60 days) =====
  // askRent/askTmi = what was advertised; achRent/achTmi = what was signed
  var SAMPLE_LEASED = [
    { addr: "3150 Wolfedale Rd, Unit 3", city: "Mississauga", size: 11200,
      askRent: 15.75, askTmi: 6.10, achRent: 14.80, achTmi: 6.10,
      clear: 22, office: 14, doors: 2, parking: 1.2,
      ll: "ACME Industrial Holdings", llScore: 8.2,
      term: 5, freeMonths: 2, tiPerSf: 3.00,
      tenant: "Light manufacturing", daysOnMarket: 41, leasedDaysAgo: 12,
      hasWhitebox: false, has600A: false, hasDriveIn: true, hasCrane: false, hasRail: false, hasHvac: false, hasOS: false,
      tags: ["2 TL + 1 drive-in", "Office reno 2023", "400A"] },
    { addr: "5900 Ambler Dr, Unit 8-9", city: "Mississauga", size: 13600,
      askRent: 17.00, askTmi: 6.80, achRent: 16.10, achTmi: 6.80,
      clear: 24, office: 11, doors: 3, parking: 1.4,
      ll: "Prologis Canada", llScore: 8.6,
      term: 7, freeMonths: 3, tiPerSf: 8.50,
      tenant: "3PL / distribution", daysOnMarket: 26, leasedDaysAgo: 19,
      hasWhitebox: true, has600A: true, hasDriveIn: false, hasCrane: false, hasRail: false, hasHvac: true, hasOS: false,
      tags: ["Whitebox", "3 TL doors", "600A", "Heavy HVAC"] },
    { addr: "8310 Kennedy Rd, Unit 2", city: "Brampton", size: 9200,
      askRent: 14.95, askTmi: 5.90, achRent: 14.25, achTmi: 5.90,
      clear: 22, office: 18, doors: 2, parking: 1.0,
      ll: "Continental Business Parks", llScore: 7.3,
      term: 5, freeMonths: 1, tiPerSf: 2.00,
      tenant: "Fabricator", daysOnMarket: 58, leasedDaysAgo: 27,
      hasWhitebox: false, has600A: false, hasDriveIn: false, hasCrane: false, hasRail: false, hasHvac: false, hasOS: false,
      tags: ["2 TL doors", "Recently painted", "400A"] },
    { addr: "2200 Argentia Rd, Unit 11", city: "Mississauga", size: 14800,
      askRent: 16.50, askTmi: 6.40, achRent: 15.75, achTmi: 6.40,
      clear: 26, office: 9, doors: 4, parking: 1.1,
      ll: "ACME Industrial Holdings", llScore: 8.2,
      term: 10, freeMonths: 4, tiPerSf: 12.00,
      tenant: "Food processor", daysOnMarket: 33, leasedDaysAgo: 35,
      hasWhitebox: true, has600A: true, hasDriveIn: true, hasCrane: false, hasRail: false, hasHvac: true, hasOS: false,
      tags: ["Whitebox", "4 TL + 1 drive-in", "1000A", "Heavy HVAC"] },
    { addr: "6770 Davand Dr, Unit 5", city: "Oakville", size: 10400,
      askRent: 16.25, askTmi: 6.25, achRent: 15.40, achTmi: 6.25,
      clear: 24, office: 13, doors: 2, parking: 1.3,
      ll: "Dream Industrial", llScore: 7.8,
      term: 5, freeMonths: 2, tiPerSf: 4.00,
      tenant: "Ecommerce / 3PL", daysOnMarket: 47, leasedDaysAgo: 48,
      hasWhitebox: false, has600A: true, hasDriveIn: true, hasCrane: false, hasRail: false, hasHvac: false, hasOS: false,
      tags: ["2 TL + 1 drive-in", "600A", "Office reno 2024"] }
  ];

  
  // ---- Live data shim: try listings.json first, fall back to SAMPLE_* above ----
  var LIVE_DATA_LOADED = false;
  function tryLoadLive(){
    if (typeof fetch !== "function") return;
    fetch("listings.json").then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (!d) return;
      if (Array.isArray(d.for_lease) && d.for_lease.length) SAMPLE_LISTINGS = d.for_lease;
      if (Array.isArray(d.leased)    && d.leased.length)    SAMPLE_LEASED    = d.leased;
      LIVE_DATA_LOADED = true;
      if (prefs) runInitialMatches();
      renderLeasedFeed();
    }).catch(function(){ /* file:// or 404 — use samples */ });
  }

  var prefs = null;
  var matchCount = 0;

  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(id){ var v = qs("#" + id).value; return v === "" ? null : Number(v); }
  function money(x){ return "$" + Math.round(x).toLocaleString("en-US"); }

  // ---- Pill group wiring (multi-select; channels = single-select) ----
  qsa(".pill-group").forEach(function(group){
    group.addEventListener("click", function(e){
      var el = e.target.closest(".pill");
      if (!el) return;
      if (group.id === "channels"){
        qsa("#channels .pill").forEach(function(p){ p.classList.remove("on"); });
        el.classList.add("on");
      } else {
        el.classList.toggle("on");
      }
    });
  });
  qsa("#submarkets .pill").forEach(function(p){
    if (["Mississauga","Brampton","Oakville"].indexOf(p.dataset.value) > -1) p.classList.add("on");
  });
  qsa("#musthaves .pill").forEach(function(p){
    if (["600A","drive-in"].indexOf(p.dataset.value) > -1) p.classList.add("on");
  });

  function readPrefs(){
    return {
      sizeMin:   num("size-min"),
      sizeMax:   num("size-max"),
      rentMin:   num("rent-min"),
      rentMax:   num("rent-max"),
      clearMin:  num("clear-min"),
      clearMax:  num("clear-max"),
      officeMin: num("office-min"),
      officeMax: num("office-max"),
      doors:     num("doors"),
      parking:   num("parking"),
      llScore:   num("llscore"),
      envMax:    num("envmax"),
      submarkets: qsa("#submarkets .pill.on").map(function(p){ return p.dataset.value; }),
      musthaves:  qsa("#musthaves .pill.on").map(function(p){ return p.dataset.value; }),
      email:      qs("#email").value,
      channel:    (qs("#channels .pill.on") || {dataset:{value:"email"}}).dataset.value
    };
  }

  function inRange(v, lo, hi){
    if (v == null) return true;
    if (lo != null && v < lo) return false;
    if (hi != null && v > hi) return false;
    return true;
  }

  function matches(listing, p, rentField, tmiField){
    rentField = rentField || "rent";
    tmiField = tmiField || "tmi";
    var allIn = listing[rentField] + listing[tmiField];
    if (!inRange(listing.size,   p.sizeMin,   p.sizeMax))   return false;
    if (!inRange(allIn,          p.rentMin,   p.rentMax))   return false;
    if (!inRange(listing.clear,  p.clearMin,  p.clearMax))  return false;
    if (!inRange(listing.office, p.officeMin, p.officeMax)) return false;
    if (p.doors   != null && listing.doors   < p.doors)   return false;
    if (p.parking != null && listing.parking < p.parking) return false;
    if (p.llScore != null && listing.llScore < p.llScore) return false;
    if (p.envMax  != null && listing.env != null && listing.env > p.envMax) return false;
    if (p.submarkets.length && p.submarkets.indexOf(listing.city) < 0) return false;
    var haveMap = {
      "600A": listing.has600A, "drive-in": listing.hasDriveIn, "rail": listing.hasRail,
      "whitebox": listing.hasWhitebox, "outside-storage": listing.hasOS,
      "crane": listing.hasCrane, "heavy-hvac": listing.hasHvac
    };
    for (var i = 0; i < p.musthaves.length; i++){
      if (!haveMap[p.musthaves[i]]) return false;
    }
    return true;
  }

  // Render an active for-lease listing with monthly + annual gross
  function renderListing(listing, isNew){
    var rent = listing.rent, tmi = listing.tmi;
    var allInPsf = rent + tmi;
    var annualGross = listing.size * allInPsf;
    var monthlyGross = annualGross / 12;
    var id = listing.addr.replace(/[^a-z0-9]/gi, "_");
    var posted = listing.daysOld === 0 ? "Just posted" : listing.daysOld + " d ago";

    var el = document.createElement("div");
    el.className = "alert-item" + (isNew ? " new" : "");
    el.id = "alert-" + id;
    el.innerHTML =
      "<div>" +
        "<div class='head'>" +
          "<h3>" + listing.addr + "</h3>" +
          (isNew ? "<span class='badge-new'>New match</span>" : "") +
          "<span class='tag'>" + posted + "</span>" +
        "</div>" +
        "<p class='meta'>" +
          listing.city + " &middot; " + listing.size.toLocaleString() + " SF &middot; " +
          listing.clear + "&prime; clear &middot; " + listing.doors + " doors &middot; " + listing.office + "% office" +
        "</p>" +
        "<p class='meta' style='color:var(--text);'>" +
          "<strong>$" + rent.toFixed(2) + "</strong> net + <strong>$" + tmi.toFixed(2) + "</strong> TMI = " +
          "<strong style='color:var(--accent);'>$" + allInPsf.toFixed(2) + " / SF</strong> all-in &nbsp;" +
          "<span style='color:var(--text-dim);'>(" + money(monthlyGross) + " / mo &middot; " + money(annualGross) + " / yr)</span>" +
        "</p>" +
        "<p class='meta'>Landlord: " + listing.ll + " (<span style='color:var(--accent);'>" + listing.llScore.toFixed(1) + "</span>) &middot; Env risk: " + listing.env + "/5</p>" +
        "<div class='specs'>" + listing.tags.map(function(t){ return "<span class='tag'>" + t + "</span>"; }).join("") + "</div>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:8px;min-width:170px;'>" +
        "<button class='btn btn-primary' data-inquire='" + id + "' style='justify-content:center;'>Inquire via AI broker</button>" +
        "<button class='btn btn-secondary' data-view='" + id + "' style='justify-content:center;'>View details</button>" +
      "</div>";
    el._listing = listing;
    return el;
  }

  // Render a leased comp with achieved-rent + monthly/annual gross + effective rent
  function renderLeased(deal){
    var achAllIn = deal.achRent + deal.achTmi;
    var annualGross = deal.size * achAllIn;
    var monthlyGross = annualGross / 12;
    var gap = deal.askRent - deal.achRent;
    var gapPct = (gap / deal.askRent) * 100;

    // Effective rent: achieved rent − (free rent value / term) − (TI / term)
    var freeRentPsfOverTerm = (deal.achRent * (deal.freeMonths / 12)) / deal.term;
    var tiAmortPsf = deal.tiPerSf / deal.term;
    var effectiveRent = deal.achRent - freeRentPsfOverTerm - tiAmortPsf;

    var el = document.createElement("div");
    el.className = "alert-item";
    el.innerHTML =
      "<div>" +
        "<div class='head'>" +
          "<h3>" + deal.addr + "</h3>" +
          "<span class='tag' style='background:rgba(234,88,12,0.1);color:var(--accent);border-color:rgba(234,88,12,0.3);'>Leased " + deal.leasedDaysAgo + " d ago</span>" +
          "<span class='tag'>" + deal.daysOnMarket + " days on market</span>" +
        "</div>" +
        "<p class='meta'>" +
          deal.city + " &middot; " + deal.size.toLocaleString() + " SF &middot; " +
          deal.clear + "&prime; clear &middot; " + deal.doors + " doors &middot; " + deal.office + "% office &middot; " +
          "Tenant: " + deal.tenant +
        "</p>" +
        "<p class='meta' style='color:var(--text);'>" +
          "Asking <span style='color:var(--text-muted);'>$" + deal.askRent.toFixed(2) + "</span> &rarr; " +
          "<strong>achieved $" + deal.achRent.toFixed(2) + "</strong> net + <strong>$" + deal.achTmi.toFixed(2) + "</strong> TMI = " +
          "<strong style='color:var(--accent);'>$" + achAllIn.toFixed(2) + " / SF</strong> all-in &nbsp;" +
          "<span style='color:var(--text-dim);'>(" + money(monthlyGross) + " / mo &middot; " + money(annualGross) + " / yr)</span>" +
        "</p>" +
        "<p class='meta'>" +
          "<span style='color:" + (gapPct > 0 ? "var(--accent)" : "var(--text-dim)") + ";'>" +
            (gapPct > 0 ? "↓ $" + gap.toFixed(2) + " (" + gapPct.toFixed(1) + "%) off ask" : "At ask") +
          "</span> &middot; " +
          deal.term + "-yr term &middot; " +
          deal.freeMonths + " mo free &middot; " +
          "$" + deal.tiPerSf.toFixed(0) + " / SF TI &middot; " +
          "<strong style='color:var(--text);'>effective $" + effectiveRent.toFixed(2) + "</strong>" +
        "</p>" +
        "<p class='meta'>Landlord: " + deal.ll + " (<span style='color:var(--accent);'>" + deal.llScore.toFixed(1) + "</span>)</p>" +
        "<div class='specs'>" + deal.tags.map(function(t){ return "<span class='tag'>" + t + "</span>"; }).join("") + "</div>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:8px;min-width:170px;'>" +
        "<div style='background:var(--bg-elev);border:1px solid var(--border-strong);padding:10px 14px;border-radius:8px;text-align:center;'>" +
          "<div style='font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;'>Comp</div>" +
          "<div style='font-family:var(--font-mono);color:var(--accent);font-weight:700;font-size:1.1rem;'>$" + deal.achRent.toFixed(2) + "</div>" +
          "<div style='font-size:0.72rem;color:var(--text-muted);'>net achieved</div>" +
        "</div>" +
      "</div>";
    return el;
  }

  function clearFeed(){ qs("#alertFeed").innerHTML = ""; }
  function setEmpty(msg){ qs("#alertFeed").innerHTML = "<div class='alert-empty'>" + msg + "</div>"; }

  function updateBadge(){
    var b = qs("#matchBadge");
    if (matchCount > 0){
      b.style.display = "inline-flex";
      b.textContent = matchCount + " " + (matchCount === 1 ? "match" : "matches");
      b.classList.add("pulse");
    } else {
      b.style.display = "none";
    }
  }

  function toast(message){
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = message;
    document.body.appendChild(el);
    setTimeout(function(){
      el.style.transition = "opacity .4s";
      el.style.opacity = 0;
      setTimeout(function(){ el.remove(); }, 400);
    }, 4200);
  }

  function runInitialMatches(){
    clearFeed();
    matchCount = 0;
    var found = 0;
    SAMPLE_LISTINGS.forEach(function(l){
      var copy = Object.assign({}, l);
      copy.daysOld = Math.floor(Math.random() * 6) + 1;
      if (matches(copy, prefs)){
        qs("#alertFeed").appendChild(renderListing(copy, false));
        found++;
        matchCount++;
      }
    });
    if (found === 0){
      setEmpty("Alert is live. No existing listings match right now — you'll be notified the moment one does.");
    }
    updateBadge();
  }

  function renderLeasedFeed(){
    var feed = qs("#leasedFeed");
    feed.innerHTML = "";
    var pool = SAMPLE_LEASED;
    if (prefs){
      var filtered = pool.filter(function(d){ return matches(d, prefs, "achRent", "achTmi"); });
      if (filtered.length) pool = filtered;
    }
    // Sort by most recently leased
    pool.slice().sort(function(a,b){ return a.leasedDaysAgo - b.leasedDaysAgo; }).forEach(function(d){
      feed.appendChild(renderLeased(d));
    });
    if (!feed.children.length){
      feed.innerHTML = "<div class='alert-empty'>No recently-leased comps match this alert's filters yet.</div>";
    }
  }

  function simulateNewMatch(){
    if (!prefs){ alert("Save an alert first."); return; }
    var pool = SAMPLE_LISTINGS.filter(function(l){ return matches(l, prefs); });
    var base = pool[Math.floor(Math.random() * pool.length)] || SAMPLE_LISTINGS[0];
    var newOne = Object.assign({}, base);
    if (prefs.submarkets.length && prefs.submarkets.indexOf(newOne.city) < 0){
      newOne.city = prefs.submarkets[0];
    }
    var suffix = Math.floor(Math.random() * 900) + 100;
    newOne.addr = newOne.addr.replace(/Unit \d+|Bay \d+/i, "") + " — Unit " + suffix;
    newOne.daysOld = 0;
    var empty = qs("#alertFeed .alert-empty");
    if (empty) empty.remove();
    var el = renderListing(newOne, true);
    var feed = qs("#alertFeed");
    feed.insertBefore(el, feed.firstChild);
    matchCount++;
    updateBadge();
    toast("<strong>★ New match:</strong> " + newOne.addr +
          "<br><span style='color:var(--text-dim);font-size:0.85rem;'>Notification sent via " + prefs.channel + ".</span>");
    qs("#feed-section").scrollIntoView({behavior:"smooth", block:"start"});
  }

  function inquireFlow(id){
    var card = qs("#alert-" + id);
    if (!card) return;
    var listing = card._listing;
    card.classList.remove("new");
    var rightSide = card.lastElementChild;
    rightSide.innerHTML =
      "<div style='background:rgba(234, 88, 12, 0.12);border:1px solid var(--accent);padding:10px 14px;border-radius:8px;color:var(--accent);font-size:0.85rem;font-weight:600;text-align:center;'>" +
        "✓ Inquiry queued" +
      "</div>" +
      "<p style='color:var(--text-muted);font-size:0.78rem;text-align:center;margin:0;'>" +
        "AI broker emailing listing agent now" +
      "</p>";
    toast("<strong>✓ Inquiry sent</strong><br><span style='color:var(--text-dim);font-size:0.85rem;'>Outreach to the listing agent for " + listing.addr + " has been drafted and queued for send.</span>");
  }

  function viewDetailsFlow(id){
    var card = qs("#alert-" + id);
    var listing = card && card._listing;
    if (!listing) return;
    toast("<strong>" + listing.addr + "</strong><br><span style='color:var(--text-dim);font-size:0.85rem;'>In the full product, this opens the complete space summary, photos, floor plan, and landlord profile.</span>");
  }

  document.addEventListener("click", function(e){
    var inqBtn = e.target.closest("[data-inquire]");
    if (inqBtn){ inquireFlow(inqBtn.dataset.inquire); return; }
    var viewBtn = e.target.closest("[data-view]");
    if (viewBtn){ viewDetailsFlow(viewBtn.dataset.view); return; }
  });

  qs("#saveAlert").addEventListener("click", function(){
    prefs = readPrefs();
    if (!prefs.email || prefs.email.indexOf("@") < 0){
      alert("Enter a valid email for alerts.");
      return;
    }
    qs("#statusPill").innerHTML =
      "<span class='notif-badge'>● Alert active</span>" +
      " &nbsp;Monitoring via <strong style='color:var(--text);'>" + prefs.channel + "</strong>";
    runInitialMatches();
    renderLeasedFeed();
    qs("#feed-section").scrollIntoView({behavior:"smooth", block:"start"});
  });

  qs("#simulateMatch").addEventListener("click", simulateNewMatch);

  // Populate leased feed on page load (unfiltered view)
  renderLeasedFeed();
  tryLoadLive();
})();
