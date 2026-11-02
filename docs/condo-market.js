(function(){
  "use strict";

  // Submarket base prices (CAD per SF, mid-case)
  var SUBMARKET_BASE = {
    "Mississauga": 420, "Brampton": 380, "Vaughan": 415, "Markham": 410,
    "Oakville": 450, "Burlington": 395, "Etobicoke": 425, "Scarborough": 370,
    "Concord": 420, "Pickering": 365
  };

  var CONDITION_ADJ = {
    "excellent": 0.08, "good": 0.02, "fair": 0.00, "needs-work": -0.15
  };

  // ===== For-sale industrial condo listings (sample TRREB data) =====
  var SALE_LISTINGS = [
    { addr: "2400 Meadowvale Blvd, Unit 6", city: "Mississauga", size: 12400,
      askPsf: 440, condoFee: 4.80, clear: 26, office: 12, doors: 3, parking: 1.4,
      daysOld: 8, tags: ["Whitebox", "3 TL doors", "600A @ 600V", "Drive-in"] },
    { addr: "8800 Airport Rd, Unit 7", city: "Brampton", size: 10200,
      askPsf: 395, condoFee: 4.50, clear: 24, office: 15, doors: 2, parking: 1.1,
      daysOld: 21, tags: ["2 TL doors", "400A", "Office reno 2024"] },
    { addr: "1200 Aimco Blvd, Unit 14", city: "Mississauga", size: 9600,
      askPsf: 425, condoFee: 5.10, clear: 22, office: 18, doors: 2, parking: 1.6,
      daysOld: 14, tags: ["Drive-in", "Outside storage", "Freshly painted"] },
    { addr: "45 Courtneypark Dr E, Unit 3", city: "Mississauga", size: 14800,
      askPsf: 458, condoFee: 5.25, clear: 28, office: 10, doors: 4, parking: 1.3,
      daysOld: 3, tags: ["Whitebox", "4 TL + drive-in", "600A", "Heavy HVAC"] }
  ];

  // ===== Recently sold industrial condos (last 60 days) =====
  var SOLD_COMPS = [
    { addr: "3150 Wolfedale Rd, Unit 3", city: "Mississauga", size: 11200,
      askPsf: 425, soldPsf: 412, daysOnMarket: 37, soldDaysAgo: 18,
      clear: 22, office: 14, parking: 1.2,
      tags: ["2 TL + drive-in", "Office reno 2023"] },
    { addr: "5900 Ambler Dr, Unit 8", city: "Mississauga", size: 13600,
      askPsf: 445, soldPsf: 438, daysOnMarket: 22, soldDaysAgo: 24,
      clear: 24, office: 11, parking: 1.4,
      tags: ["Whitebox", "3 TL doors", "600A"] },
    { addr: "8310 Kennedy Rd, Unit 12", city: "Brampton", size: 9200,
      askPsf: 385, soldPsf: 372, daysOnMarket: 49, soldDaysAgo: 33,
      clear: 22, office: 18, parking: 1.0,
      tags: ["2 TL doors", "400A"] },
    { addr: "2200 Argentia Rd, Unit 11", city: "Mississauga", size: 14800,
      askPsf: 450, soldPsf: 445, daysOnMarket: 28, soldDaysAgo: 41,
      clear: 26, office: 9, parking: 1.1,
      tags: ["Whitebox", "4 TL + drive-in", "1000A"] }
  ];

  
  // ---- Live data shim: try listings.json first, fall back to SALE_LISTINGS/SOLD_COMPS above ----
  var LIVE_DATA_LOADED = false;
  function tryLoadLive(){
    if (typeof fetch !== "function") return;
    fetch("listings.json").then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (!d) return;
      if (Array.isArray(d.for_sale) && d.for_sale.length) SALE_LISTINGS = d.for_sale;
      if (Array.isArray(d.sold)     && d.sold.length)     SOLD_COMPS    = d.sold;
      LIVE_DATA_LOADED = true;
      // Re-render both feeds
      var saleFeed = qs("#saleFeed");
      if (saleFeed) saleFeed.innerHTML = SALE_LISTINGS.slice().sort(function(a,b){return a.daysOld - b.daysOld;}).map(renderSaleListing).join("");
      var soldFeed = qs("#soldFeed");
      if (soldFeed) soldFeed.innerHTML = SOLD_COMPS.slice().sort(function(a,b){return a.soldDaysAgo - b.soldDaysAgo;}).map(renderSoldComp).join("");
    }).catch(function(){});
  }

  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function money(x){ return "$" + Math.round(x).toLocaleString("en-US"); }

  // Valuation model
  function valuate(inputs){
    var base = SUBMARKET_BASE[inputs.city] || 410;
    var adjusted = base;

    // Clear height: ideal 22-26'; +$8/ft above 24, -$10/ft below 22
    if (inputs.clear > 24)      adjusted += (inputs.clear - 24) * 8;
    else if (inputs.clear < 22) adjusted += (inputs.clear - 22) * 10;

    // Condition
    adjusted *= (1 + (CONDITION_ADJ[inputs.condition] || 0));

    // Parking: high parking +3%, low parking -4%
    if (inputs.parking >= 1.5)      adjusted *= 1.03;
    else if (inputs.parking < 1.0)  adjusted *= 0.96;

    // Office %: neutral at 8-18%, penalties outside
    if (inputs.office < 8)         adjusted *= 0.98;
    else if (inputs.office > 18)   adjusted *= 0.97;

    // Size premium/discount: smaller units trade at a premium on $/SF basis
    if (inputs.size < 8000)       adjusted *= 1.04;
    else if (inputs.size > 16000) adjusted *= 0.96;

    // Low / mid / high spread: ±6%
    var lowPsf  = adjusted * 0.94;
    var highPsf = adjusted * 1.06;
    return {
      lowPsf: lowPsf, midPsf: adjusted, highPsf: highPsf,
      lowTotal: lowPsf * inputs.size,
      midTotal: adjusted * inputs.size,
      highTotal: highPsf * inputs.size,
      base: base
    };
  }

  function readInputs(){
    var cityPill = qs("#vl-city .pill.on");
    var condPill = qs("#vl-condition .pill.on");
    return {
      city:      cityPill ? cityPill.dataset.value : "Mississauga",
      condition: condPill ? condPill.dataset.value : "good",
      size:      Number(qs("#vl-size").value) || 10000,
      clear:     Number(qs("#vl-clear").value) || 24,
      office:    Number(qs("#vl-office").value) || 12,
      parking:   Number(qs("#vl-parking").value) || 1.2
    };
  }

  function renderValuation(){
    var v = valuate(readInputs());
    qs("#vl-output").innerHTML =
      "<div style='display:flex;justify-content:space-between;margin-bottom:16px;'>" +
        "<span class='tag'>Estimated value</span>" +
        "<span class='tag'>Submarket base: " + money(v.base) + " / SF</span>" +
      "</div>" +
      "<div class='data-list'>" +
        "<div class='row'><span class='label'>Low estimate</span><span class='value'>" + money(v.lowPsf) + " / SF &middot; " + money(v.lowTotal) + "</span></div>" +
        "<div class='row' style='background:rgba(21,128,61,0.08);border-color:rgba(21,128,61,0.3);'>" +
          "<span class='label' style='color:var(--text);font-weight:600;'>Mid estimate</span>" +
          "<span class='value' style='color:var(--accent);'>" + money(v.midPsf) + " / SF &middot; " + money(v.midTotal) + "</span>" +
        "</div>" +
        "<div class='row'><span class='label'>High estimate</span><span class='value'>" + money(v.highPsf) + " / SF &middot; " + money(v.highTotal) + "</span></div>" +
      "</div>";
  }

  // Pill groups (single-select)
  function wirePillGroup(selector){
    qsa(selector + " .pill").forEach(function(p){
      p.addEventListener("click", function(){
        qsa(selector + " .pill").forEach(function(q){ q.classList.remove("on"); });
        p.classList.add("on");
        renderValuation();
      });
    });
  }

  function renderSaleListing(l){
    var totalAsk = l.askPsf * l.size;
    return "<div class='alert-item'>" +
      "<div>" +
        "<div class='head'>" +
          "<h3>" + l.addr + "</h3>" +
          "<span class='tag' style='background:rgba(21,128,61,0.1);color:var(--accent);border-color:rgba(21,128,61,0.3);'>For sale</span>" +
          "<span class='tag'>" + l.daysOld + " d on market</span>" +
        "</div>" +
        "<p class='meta'>" +
          l.city + " &middot; " + l.size.toLocaleString() + " SF &middot; " +
          l.clear + "&prime; clear &middot; " + l.doors + " doors &middot; " + l.office + "% office" +
        "</p>" +
        "<p class='meta' style='color:var(--text);'>" +
          "<strong>$" + l.askPsf + "</strong> / SF asking = <strong style='color:var(--accent);'>" + money(totalAsk) + "</strong> &middot; " +
          "Condo fee $" + l.condoFee.toFixed(2) + " / SF / yr" +
        "</p>" +
        "<div class='specs'>" + l.tags.map(function(t){ return "<span class='tag'>" + t + "</span>"; }).join("") + "</div>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:8px;min-width:160px;'>" +
        "<div style='background:var(--bg-elev);border:1px solid var(--border-strong);padding:10px 14px;border-radius:8px;text-align:center;'>" +
          "<div style='font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;'>Asking</div>" +
          "<div style='font-family:var(--font-mono);color:var(--accent);font-weight:700;font-size:1.1rem;'>$" + l.askPsf + "</div>" +
          "<div style='font-size:0.72rem;color:var(--text-muted);'>/ SF</div>" +
        "</div>" +
        "<button class='btn btn-secondary' style='justify-content:center;font-size:0.85rem;padding:8px 12px;'>View details</button>" +
      "</div>" +
    "</div>";
  }

  function renderSoldComp(l){
    var totalSold = l.soldPsf * l.size;
    var gapPsf = l.askPsf - l.soldPsf;
    var gapPct = (gapPsf / l.askPsf) * 100;
    return "<div class='alert-item'>" +
      "<div>" +
        "<div class='head'>" +
          "<h3>" + l.addr + "</h3>" +
          "<span class='tag' style='background:rgba(21,128,61,0.1);color:var(--accent);border-color:rgba(21,128,61,0.3);'>Sold " + l.soldDaysAgo + " d ago</span>" +
          "<span class='tag'>" + l.daysOnMarket + " d on market</span>" +
        "</div>" +
        "<p class='meta'>" +
          l.city + " &middot; " + l.size.toLocaleString() + " SF &middot; " +
          l.clear + "&prime; clear &middot; " + l.office + "% office &middot; " + l.parking.toFixed(1) + " parking" +
        "</p>" +
        "<p class='meta' style='color:var(--text);'>" +
          "Asking <span style='color:var(--text-muted);'>$" + l.askPsf + "</span> &rarr; " +
          "<strong>sold $" + l.soldPsf + "</strong> / SF = <strong style='color:var(--accent);'>" + money(totalSold) + "</strong> &middot; " +
          "<span style='color:" + (gapPct > 0 ? "var(--accent)" : "var(--text-dim)") + ";'>" +
            (gapPct > 0 ? "↓ $" + gapPsf.toFixed(0) + " (" + gapPct.toFixed(1) + "%) off ask" : "At ask") +
          "</span>" +
        "</p>" +
        "<div class='specs'>" + l.tags.map(function(t){ return "<span class='tag'>" + t + "</span>"; }).join("") + "</div>" +
      "</div>" +
      "<div style='display:flex;flex-direction:column;gap:8px;min-width:160px;'>" +
        "<div style='background:var(--bg-elev);border:1px solid var(--border-strong);padding:10px 14px;border-radius:8px;text-align:center;'>" +
          "<div style='font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;'>Sold comp</div>" +
          "<div style='font-family:var(--font-mono);color:var(--accent);font-weight:700;font-size:1.1rem;'>$" + l.soldPsf + "</div>" +
          "<div style='font-size:0.72rem;color:var(--text-muted);'>/ SF achieved</div>" +
        "</div>" +
      "</div>" +
    "</div>";
  }

  function init(){
    // Pills
    wirePillGroup("#vl-city");
    wirePillGroup("#vl-condition");

    // Input listeners
    ["vl-size", "vl-clear", "vl-office", "vl-parking"].forEach(function(id){
      var el = qs("#" + id);
      if (el) el.addEventListener("input", renderValuation);
    });

    // Initial valuation render
    renderValuation();

    // For-sale feed
    var saleFeed = qs("#saleFeed");
    if (saleFeed){
      saleFeed.innerHTML = SALE_LISTINGS
        .slice().sort(function(a,b){ return a.daysOld - b.daysOld; })
        .map(renderSaleListing).join("");
    }

    // Recently-sold feed
    var soldFeed = qs("#soldFeed");
    if (soldFeed){
      soldFeed.innerHTML = SOLD_COMPS
        .slice().sort(function(a,b){ return a.soldDaysAgo - b.soldDaysAgo; })
        .map(renderSoldComp).join("");
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ init(); tryLoadLive(); });
  } else {
    init(); tryLoadLive();
  }
})();
