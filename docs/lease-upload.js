// industrio — Lease upload + attestation flow (lease-abstract.html)
// =========================================================================
// Demo wiring. Without a backend, "uploads" are stored to localStorage so the
// user can experience the full flow. In production this would be a POST to
// the industrio API; everything else (validation, attestation gating, UI)
// stays the same.

(function(){
  "use strict";

  var LS_KEY = 'industrio.myLeases';

  function el(id){ return document.getElementById(id); }

  function readForm(){
    var sf = parseInt((el('leaseSize')||{}).value, 10);
    var rent = parseFloat((el('leaseRent')||{}).value);
    var hasFile = el('leaseFile') && el('leaseFile').files && el('leaseFile').files[0];
    return {
      address:    (el('leaseAddress')||{}).value || '',
      city:       (el('leaseCity')||{}).value || '',
      size_sf:    isNaN(sf) ? null : sf,
      net_rent:   isNaN(rent) ? null : rent,
      start_date: (el('leaseStart')||{}).value || '',
      term_years: parseInt((el('leaseTerm')||{}).value, 10) || null,
      ti_psf:     parseFloat((el('leaseTI')||{}).value) || null,
      free_rent:  parseInt((el('leaseFreeRent')||{}).value, 10) || null,
      file_name:  hasFile ? el('leaseFile').files[0].name : null,
      file_size:  hasFile ? el('leaseFile').files[0].size : null
    };
  }

  function isReadyToSubmit(){
    var f = readForm();
    var hasMinimum = (f.address && f.size_sf && f.net_rent && f.city) || f.file_name;
    var attested = (el('leaseAttestRights') || {}).checked;
    return !!(hasMinimum && attested);
  }

  function refreshSubmitState(){
    var btn = el('leaseUploadSubmit'); if (!btn) return;
    btn.disabled = !isReadyToSubmit();
  }

  function saveLeaseLocally(payload){
    try {
      var arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      arr.unshift(payload);
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch(e){}
  }

  function bucketSize(sf){
    if (!sf) return null;
    if (sf < 5000)  return '<5k';
    if (sf < 10000) return '5\u201310k';
    if (sf < 15000) return '10\u201315k';
    if (sf < 20000) return '15\u201320k';
    if (sf < 30000) return '20\u201330k';
    if (sf < 50000) return '30\u201350k';
    return '50k+';
  }
  function bucketRent(r){
    if (!r) return null;
    var lo = Math.floor(r);
    return '$' + lo + '\u2013' + (lo+1) + '/SF';
  }

  function submarketForCity(city){
    var map = {
      'Mississauga':'Mississauga','Brampton':'Brampton','Vaughan':'Vaughan',
      'Etobicoke':'West Toronto','Scarborough':'East Toronto',
      'Markham':'GTA North','North York':'Central Toronto',
      'Oakville':'Oakville/Burlington','Burlington':'Oakville/Burlington',
      'Richmond Hill':'GTA North','Toronto':'Central Toronto'
    };
    return map[city] || city;
  }

  function generateAbstractHTML(f){
    var allIn = (f.net_rent && 6.20) ? '$' + (f.net_rent + 6.20).toFixed(2) + ' (incl. ~$6.20 est. additional)' : '\u2014';
    var benchmark = '';
    var bucket = bucketSize(f.size_sf);
    var sub = submarketForCity(f.city);
    if (window.industrioComps && f.net_rent && bucket && sub){
      var match = (window.industrioComps.benchmarks || []).find(function(b){
        return b.submarket === sub && b.size_class === bucket;
      });
      if (match){
        var pct = ((f.net_rent - match.rent_avg) / match.rent_avg) * 100;
        benchmark = ''
          + '<div class="lease-result-bench">'
          +   '<strong>Submarket benchmark:</strong> ' + sub + ' &middot; ' + bucket
          +   ' &middot; n=' + match.comp_count + ' comps in last 12 mo.<br>'
          +   'Range: <strong>$' + match.rent_low.toFixed(0) + '\u2013$' + match.rent_high.toFixed(0) + '/SF</strong> &middot; avg $' + match.rent_avg.toFixed(1) + '/SF.<br>'
          +   'You are <strong style="color:' + (pct < 0 ? '#0d9488' : '#dc2626') + '">' + Math.abs(pct).toFixed(0) + '% ' + (pct < 0 ? 'below' : 'above') + ' the average</strong> for this size class.'
          + '</div>';
      }
    }
    return ''
      + '<div class="lease-result-card">'
      +   '<div class="lease-result-head">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>'
      +     '<strong>Lease abstract generated</strong>'
      +   '</div>'
      +   '<div class="lease-result-grid">'
      +     row('Property',     f.address || (f.file_name ? '(from uploaded ' + f.file_name + ')' : '\u2014'))
      +     row('City',         f.city || '\u2014')
      +     row('Size',         f.size_sf ? f.size_sf.toLocaleString() + ' SF' : '\u2014')
      +     row('Net rent',     f.net_rent ? '$' + f.net_rent.toFixed(2) + ' / SF / yr' : '\u2014')
      +     row('All-in (est.)',allIn)
      +     row('Term',         f.term_years ? f.term_years + ' years' : '\u2014')
      +     row('Commencement', f.start_date || '\u2014')
      +     row('TI',           f.ti_psf ? '$' + f.ti_psf.toFixed(2) + ' / SF' : '\u2014')
      +     row('Free rent',    f.free_rent ? f.free_rent + ' months' : '\u2014')
      +   '</div>'
      +   benchmark
      +   '<div class="lease-result-foot">'
      +     '<span>Saved to your private workspace. Edit or delete from <a href="account.html">My Account</a>.</span>'
      +     '<button type="button" class="btn btn-secondary" id="leaseResultAnother">Add another lease</button>'
      +   '</div>'
      + '</div>';
  }
  function row(label, val){
    return '<div class="lease-result-row"><span>' + label + '</span><strong>' + (val == null || val === '' ? '\u2014' : val) + '</strong></div>';
  }

  function onSubmit(){
    if (!isReadyToSubmit()) return;
    var btn = el('leaseUploadSubmit');
    btn.disabled = true;
    btn.textContent = 'Generating abstract\u2026';

    var f = readForm();
    var optIn = (el('leaseAttestOptIn') || {}).checked;

    var payload = {
      submitted_at: new Date().toISOString(),
      attested: true,
      opt_in_benchmarks: !!optIn,
      bucket_size:  bucketSize(f.size_sf),
      bucket_rent:  bucketRent(f.net_rent),
      submarket:    submarketForCity(f.city),
      // The full document and exact terms ONLY ever get persisted to your private workspace.
      private:      f
    };

    setTimeout(function(){
      saveLeaseLocally(payload);
      var resultEl = el('leaseUploadResult');
      resultEl.innerHTML = generateAbstractHTML(f);
      resultEl.hidden = false;
      resultEl.scrollIntoView({ behavior:'smooth', block:'start' });
      btn.textContent = 'Generate my abstract';
      btn.disabled = false;
      var another = document.getElementById('leaseResultAnother');
      if (another) another.addEventListener('click', function(){
        resultEl.hidden = true;
        ['leaseAddress','leaseCity','leaseSize','leaseRent','leaseStart','leaseTerm','leaseTI','leaseFreeRent'].forEach(function(id){
          var e = document.getElementById(id); if (e) e.value = '';
        });
        document.getElementById('leaseUploadSubmit').disabled = true;
      });
    }, 900);
  }

  function loadCompsPool(){
    if (!window.fetch) return;
    fetch('comps-pool.json', { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('no comps pool');
      return r.json();
    }).then(function(data){
      window.industrioComps = data;
      console.log('[industrio.comps] loaded', (data.benchmarks || []).length, 'benchmark cells');
      document.dispatchEvent(new CustomEvent('industrio:comps-loaded', { detail: data }));
    }).catch(function(){ /* offline / file:// — that's fine */ });
  }

  function boot(){
    if (!el('leaseUploadSubmit')) return; // not on the lease-abstract page
    ['leaseFile','leaseAddress','leaseCity','leaseSize','leaseRent','leaseStart','leaseTerm','leaseTI','leaseFreeRent','leaseAttestRights','leaseAttestOptIn'].forEach(function(id){
      var e = document.getElementById(id); if (e) e.addEventListener('input', refreshSubmitState);
      if (e) e.addEventListener('change', refreshSubmitState);
    });
    el('leaseUploadSubmit').addEventListener('click', onSubmit);

    // Reflect file selection in the drop zone
    var fileInput = el('leaseFile');
    if (fileInput){
      fileInput.addEventListener('change', function(){
        var z = document.querySelector('.lease-upload-zone-title');
        if (z && fileInput.files[0]) z.textContent = fileInput.files[0].name;
      });
    }
    refreshSubmitState();
    loadCompsPool();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
