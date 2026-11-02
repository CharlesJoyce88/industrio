(function(){
  "use strict";

  // Sample shortlist buildings with real-world ops specs
  var BUILDINGS = [
    { id: 'meadowvale',   addr: '2400 Meadowvale Blvd, Mississauga',
      power: { kva: 200, volt: 600, phase: 3 },
      truck: { courtDepth: 130, apronFt: 60, doorHeight: 14, radius: 70 },
      roof:  { addLoad: 10, slabPSF: 500, solarReady: true }
    },
    { id: 'airport',      addr: '8800 Airport Rd, Brampton',
      power: { kva: 150, volt: 600, phase: 3 },
      truck: { courtDepth: 110, apronFt: 55, doorHeight: 12, radius: 55 },
      roof:  { addLoad: 6, slabPSF: 400, solarReady: false }
    },
    { id: 'aimco',        addr: '1200 Aimco Blvd, Mississauga',
      power: { kva: 300, volt: 600, phase: 3 },
      truck: { courtDepth: 125, apronFt: 58, doorHeight: 14, radius: 65 },
      roof:  { addLoad: 15, slabPSF: 600, solarReady: true }
    },
    { id: 'courtneypark', addr: '45 Courtneypark Dr E, Mississauga',
      power: { kva: 400, volt: 600, phase: 3 },
      truck: { courtDepth: 140, apronFt: 65, doorHeight: 16, radius: 75 },
      roof:  { addLoad: 20, slabPSF: 800, solarReady: true }
    },
    { id: 'pacific',      addr: '7100 Pacific Circle, Mississauga',
      power: { kva: 175, volt: 347, phase: 3 },
      truck: { courtDepth: 115, apronFt: 52, doorHeight: 12, radius: 58 },
      roof:  { addLoad: 8, slabPSF: 400, solarReady: false }
    }
  ];

  // ----- Power -----
  var UPGRADE_COST_PER_KVA = 280; // approx Toronto Hydro / Enbridge service upgrade $/kVA

  function scorePower(need, b){
    var volt = parseInt(need.volt, 10);
    var phaseOK = (parseInt(need.phase,10) === 3) ? (b.power.phase === 3) : true;
    var voltOK = b.power.volt >= volt;
    var kvaOK = b.power.kva >= need.kva;
    if (phaseOK && voltOK && kvaOK) return { status: 'pass', label: 'Pass', note: 'Building service: ' + b.power.kva + ' kVA @ ' + b.power.volt + ' V (' + b.power.phase + 'ϕ). No upgrade needed.' };
    if (!phaseOK) return { status: 'fail', label: 'Hard stop', note: 'Building is ' + b.power.phase + 'ϕ only. Utility would need to run three-phase to the pole — typically a deal-breaker in small bay.' };
    if (!voltOK) {
      var costT = Math.round((need.kva) * UPGRADE_COST_PER_KVA * 1.4);
      return { status: 'upgrade', label: 'Upgrade', note: 'Transformer + service swap to ' + volt + ' V. Est. $' + costT.toLocaleString() + ' (T/X + metering + main switch).' };
    }
    if (!kvaOK) {
      var gap = need.kva - b.power.kva;
      var costK = Math.round(gap * UPGRADE_COST_PER_KVA);
      return { status: 'upgrade', label: 'Upgrade', note: 'Service is ' + b.power.kva + ' kVA; need ' + need.kva + '. Upgrade cost ~$' + costK.toLocaleString() + ' (utility + internal).' };
    }
    return { status: 'fail', label: 'Hard stop', note: '—' };
  }

  // ----- Truck -----
  var TRUCK_SPEC = {
    cubeVan:       { label: 'Cube van',              court: 60,  apron: 30, height: 10, radius: 25 },
    straightTruck: { label: "Straight truck / 26'",  court: 90,  apron: 45, height: 12, radius: 40 },
    tandem40:      { label: "40' tandem",            court: 110, apron: 55, height: 12, radius: 55 },
    tandem53:      { label: "53' tandem",            court: 130, apron: 60, height: 14, radius: 70 },
    btrain:        { label: 'B-train',               court: 160, apron: 70, height: 14, radius: 90 }
  };

  function scoreTruck(type, visits, b){
    var spec = TRUCK_SPEC[type];
    if (!spec) return { status: 'fail', label: 'Unknown', note: '—' };
    var issues = [];
    if (b.truck.courtDepth < spec.court)   issues.push('court depth ' + b.truck.courtDepth + "' vs " + spec.court + "' needed");
    if (b.truck.apronFt    < spec.apron)   issues.push('apron ' + b.truck.apronFt + "' vs " + spec.apron + "' needed");
    if (b.truck.doorHeight < spec.height)  issues.push('door ' + b.truck.doorHeight + "' vs " + spec.height + "' needed");
    if (b.truck.radius     < spec.radius)  issues.push('turn radius ' + b.truck.radius + "' vs " + spec.radius + "' needed");
    if (!issues.length) {
      var note = 'Court fits ' + spec.label + ' (' + b.truck.courtDepth + "' deep, " + b.truck.apronFt + "' apron, " + b.truck.doorHeight + "' door).";
      if (visits >= 30) note += ' 30+ visits/wk — monitor stacking.';
      return { status: 'pass', label: 'Pass', note: note };
    }
    // If door is the only issue, it might be upgradeable
    var doorOnly = issues.length === 1 && issues[0].indexOf('door') === 0;
    if (doorOnly) {
      return { status: 'upgrade', label: 'Upgrade', note: 'Existing door too short — raise opening (~$8–14k per door depending on header work).' };
    }
    if (issues.length <= 2 && issues.every(function(i){ return i.indexOf('radius') !== 0 && i.indexOf('court') !== 0; })) {
      return { status: 'upgrade', label: 'Upgrade', note: 'Fixable with apron extension and door raise. Scope + cost to be confirmed on site.' };
    }
    return { status: 'fail', label: 'Hard stop', note: 'Court geometry limits: ' + issues.join('; ') + '.' };
  }

  // ----- Roof & slab -----
  function scoreRoof(roofNeed, slabNeed, b){
    var roofOK, slabOK, parts = [], status = 'pass', label = 'Pass';
    // Roof
    if (roofNeed === 'none') { roofOK = true; parts.push('Roof: only HVAC needed — any well-built roof fine.'); }
    else if (roofNeed === 'solar') {
      roofOK = b.roof.solarReady && b.roof.addLoad >= 5;
      if (roofOK) parts.push('Roof: solar-ready (+' + b.roof.addLoad + ' PSF capacity).');
      else parts.push('Roof: structural upgrade required (~$6–12/SF) to accept solar array.');
    } else if (roofNeed === 'heavy') {
      roofOK = b.roof.addLoad >= 10;
      if (roofOK) parts.push('Roof: can accept +' + b.roof.addLoad + ' PSF equipment.');
      else parts.push('Roof: can only accept +' + b.roof.addLoad + ' PSF — steel reinforcement required.');
    }
    // Slab
    var need = parseInt(slabNeed, 10);
    slabOK = b.roof.slabPSF >= need;
    if (slabOK) parts.push('Slab: ' + b.roof.slabPSF + ' PSF (need ' + need + ').');
    else parts.push('Slab: ' + b.roof.slabPSF + ' PSF vs. ' + need + ' required. Topping slab / reinforcement needed — often $8–18/SF.');

    if (!roofOK && !slabOK) { status = 'fail';    label = 'Hard stop'; }
    else if (!roofOK || !slabOK) { status = 'upgrade'; label = 'Upgrade'; }
    return { status: status, label: label, note: parts.join(' ') };
  }

  function statusPill(s){
    var cls = (s.status === 'pass' ? 'z-yes' : (s.status === 'upgrade' ? 'z-variance' : 'z-no'));
    return '<span class="z-pill ' + cls + '">' + s.label + '</span>';
  }

  function render(containerId, scorer){
    var wrap = document.getElementById(containerId);
    var rows = BUILDINGS.map(function(b){
      var s = scorer(b);
      return '<tr><td><strong>' + b.addr + '</strong></td><td>' + statusPill(s) + '</td><td>' + s.note + '</td></tr>';
    }).join('');
    wrap.innerHTML =
      '<div class="ops-table-wrap"><table class="zoning-table"><thead><tr>' +
        '<th>Building</th><th>Status</th><th>Notes</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function bindInputs(ids, run){
    ids.forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', run);
      el.addEventListener('change', run);
    });
  }

  function runPower(){
    var need = {
      kva: parseFloat(document.getElementById('pwrKVA').value) || 0,
      volt: document.getElementById('pwrVolt').value,
      phase: document.getElementById('pwrPhase').value
    };
    render('pwrResults', function(b){ return scorePower(need, b); });
  }
  function runTruck(){
    var type = document.getElementById('truckType').value;
    var visits = parseFloat(document.getElementById('truckVisits').value) || 0;
    render('truckResults', function(b){ return scoreTruck(type, visits, b); });
  }
  function runRoof(){
    var roofNeed = document.getElementById('roofNeed').value;
    var slabNeed = document.getElementById('slabNeed').value;
    render('roofResults', function(b){ return scoreRoof(roofNeed, slabNeed, b); });
  }

  bindInputs(['pwrKVA','pwrVolt','pwrPhase'], runPower);
  bindInputs(['truckType','truckVisits'], runTruck);
  bindInputs(['roofNeed','slabNeed'], runRoof);

  runPower();
  runTruck();
  runRoof();
})();
