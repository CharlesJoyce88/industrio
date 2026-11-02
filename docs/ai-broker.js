// industrio — AI Broker chat widget (proof of concept)
// =========================================================================
// Drop-in chat widget that runs the commercial-qualifier conversation flow
// against the live buildings.json + listings.json data on the page.
//
// Two modes:
//   1) DEMO MODE (default, no setup required):
//      Uses a deterministic state machine to simulate a real LLM-driven
//      qualifier. Parses user intent from message text (size, location,
//      clear height, timing, broker status) and queries the inventory.
//      Surprisingly natural for a fixed flow, perfect for showing the UX.
//
//   2) LIVE MODE (optional, requires a Claude API key):
//      Click the gear icon, paste an Anthropic API key. The widget then
//      sends conversation history to Claude with the commercial-qualifier
//      system prompt and surfaces real LLM responses. Key stored in
//      localStorage on this device only — never transmitted to industrio.
// =========================================================================

(function(){
  "use strict";

  var STATE = {
    history: [],          // { role: 'user'|'bot', text: '...' }
    fields: {
      size_min:        null,  // SF
      size_max:        null,  // SF
      city:            null,  // 'Mississauga' / 'Brampton' / etc.
      clear_min:       null,  // ft
      timing_months:   null,  // months from today
      broker:          null,  // 'yes' / 'no' / null
      use:             null,  // free-text industry / use
      term_years:      null
    },
    stage: 'intro',       // intro → size → city → clear → timing → broker → recommend → book
    matches: [],          // listings recommended this session
    apiKey: null,         // optional Anthropic key for live mode
    panel: null,
    msgsEl: null
  };

  // ---------- UI injection ----------

  function injectUI(){
    if (document.getElementById('aiBrokerPanel')) return;

    // Floating launcher button
    var launcher = document.createElement('button');
    launcher.className = 'ai-broker-launcher';
    launcher.id = 'aiBrokerLauncher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Ask an industrio broker');
    launcher.innerHTML = ''
      + '<span class="ai-broker-launcher-dot"></span>'
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
      +   '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
      + '</svg>'
      + '<span class="ai-broker-launcher-text">Ask an industrio broker</span>';
    document.body.appendChild(launcher);

    // Panel
    var panel = document.createElement('div');
    panel.className = 'ai-broker-panel';
    panel.id = 'aiBrokerPanel';
    panel.hidden = true;
    panel.innerHTML = ''
      + '<div class="ai-broker-head">'
      +   '<div class="ai-broker-head-left">'
      +     '<div class="ai-broker-avatar">i</div>'
      +     '<div>'
      +       '<div class="ai-broker-name">industrio AI</div>'
      +       '<div class="ai-broker-status"><span class="ai-broker-status-dot"></span> Online · replies instantly</div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="ai-broker-head-right">'
      +     '<button type="button" class="ai-broker-icon-btn" id="aiBrokerSettings" aria-label="Settings"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>'
      +     '<button type="button" class="ai-broker-icon-btn" id="aiBrokerClose" aria-label="Close">&times;</button>'
      +   '</div>'
      + '</div>'
      + '<div class="ai-broker-messages" id="aiBrokerMessages"></div>'
      + '<div class="ai-broker-suggestions" id="aiBrokerSuggestions"></div>'
      + '<form class="ai-broker-input" id="aiBrokerForm">'
      +   '<input type="text" id="aiBrokerInput" placeholder="Tell me what you\u2019re looking for\u2026" autocomplete="off">'
      +   '<button type="submit" class="ai-broker-send" aria-label="Send">'
      +     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
      +   '</button>'
      + '</form>'
      + '<div class="ai-broker-foot">'
      +   '<span id="aiBrokerModeLabel">Demo mode \u00b7 simulated responses</span>'
      +   '<a href="#" id="aiBrokerReset">Reset chat</a>'
      + '</div>';
    document.body.appendChild(panel);
    STATE.panel = panel;
    STATE.msgsEl = document.getElementById('aiBrokerMessages');

    launcher.addEventListener('click', openPanel);
    document.getElementById('aiBrokerClose').addEventListener('click', closePanel);
    document.getElementById('aiBrokerSettings').addEventListener('click', openSettings);
    document.getElementById('aiBrokerReset').addEventListener('click', function(e){ e.preventDefault(); resetChat(); });
    document.getElementById('aiBrokerForm').addEventListener('submit', onSubmit);

    // Restore key if previously saved
    try { STATE.apiKey = localStorage.getItem('industrio.aiBrokerApiKey') || null; } catch(e){}
    updateModeLabel();
  }

  function openPanel(){
    STATE.panel.hidden = false;
    document.getElementById('aiBrokerLauncher').classList.add('hidden');
    if (STATE.history.length === 0) startConversation();
    setTimeout(function(){ document.getElementById('aiBrokerInput').focus(); }, 50);
  }
  function closePanel(){
    STATE.panel.hidden = true;
    document.getElementById('aiBrokerLauncher').classList.remove('hidden');
  }
  function resetChat(){
    STATE.history = [];
    STATE.fields = { size_min:null, size_max:null, city:null, clear_min:null, timing_months:null, broker:null, use:null, term_years:null };
    STATE.stage = 'intro';
    STATE.matches = [];
    STATE.msgsEl.innerHTML = '';
    setSuggestions([]);
    startConversation();
  }
  function updateModeLabel(){
    var el = document.getElementById('aiBrokerModeLabel');
    if (!el) return;
    el.textContent = STATE.apiKey ? 'Live mode \u00b7 powered by Claude' : 'Demo mode \u00b7 simulated responses';
    el.style.color = STATE.apiKey ? '#0d9488' : '';
  }

  // ---------- Settings dialog ----------

  function openSettings(){
    var existing = STATE.apiKey || '';
    var key = window.prompt(
      "Optional: paste an Anthropic API key to switch to live Claude mode.\n\n" +
      "The key is stored only in your browser (localStorage) and is sent " +
      "directly to Anthropic from your browser. Industrio never sees it.\n\n" +
      "Leave blank to clear and stay in demo mode.",
      existing
    );
    if (key === null) return;
    key = key.trim();
    try {
      if (key){ localStorage.setItem('industrio.aiBrokerApiKey', key); STATE.apiKey = key; }
      else { localStorage.removeItem('industrio.aiBrokerApiKey'); STATE.apiKey = null; }
    } catch(e){}
    updateModeLabel();
    addBotMessage(STATE.apiKey ? "Switched to live mode. Real Claude responses from now on." : "Switched back to demo mode.");
  }

  // ---------- Message rendering ----------

  function addBotMessage(text, opts){
    opts = opts || {};
    STATE.history.push({ role: 'bot', text: text });
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg-bot' + (opts.html ? ' ai-msg-rich' : '');
    if (opts.html) el.innerHTML = text;
    else el.textContent = text;
    STATE.msgsEl.appendChild(el);
    scrollToBottom();
  }
  function addUserMessage(text){
    STATE.history.push({ role: 'user', text: text });
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg-user';
    el.textContent = text;
    STATE.msgsEl.appendChild(el);
    scrollToBottom();
  }
  function showTyping(){
    var el = document.createElement('div');
    el.className = 'ai-msg ai-msg-bot ai-msg-typing';
    el.id = 'aiBrokerTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    STATE.msgsEl.appendChild(el);
    scrollToBottom();
  }
  function clearTyping(){
    var el = document.getElementById('aiBrokerTyping');
    if (el) el.remove();
  }
  function scrollToBottom(){ STATE.msgsEl.scrollTop = STATE.msgsEl.scrollHeight; }

  function setSuggestions(arr){
    var host = document.getElementById('aiBrokerSuggestions');
    host.innerHTML = '';
    arr.forEach(function(s){
      var b = document.createElement('button');
      b.className = 'ai-suggestion';
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', function(){ submitText(s); });
      host.appendChild(b);
    });
  }

  // ---------- Conversation flow ----------

  function startConversation(){
    setTimeout(function(){
      addBotMessage("Hey! I'm the industrio assistant. I'll help you find small/mid-bay industrial space across the GTA.");
    }, 200);
    setTimeout(function(){
      addBotMessage("Quick question to start: roughly how much space do you need? You can give a range like \u201c12,000 to 18,000 SF\u201d.");
      STATE.stage = 'size';
      setSuggestions(["~10,000 SF", "12,000 \u2013 18,000 SF", "20,000+ SF", "Just browsing"]);
    }, 900);
  }

  function onSubmit(e){
    e.preventDefault();
    var input = document.getElementById('aiBrokerInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    submitText(text);
  }

  function submitText(text){
    addUserMessage(text);
    setSuggestions([]);
    showTyping();
    var thinkMs = 600 + Math.random() * 800;
    setTimeout(function(){
      clearTyping();
      if (STATE.apiKey) routeViaClaude(text);
      else routeViaDemo(text);
    }, thinkMs);
  }

  // ---------- Demo mode (no API key) ----------

  function routeViaDemo(text){
    parseFields(text);
    nextStep();
  }

  function parseFields(text){
    var t = text.toLowerCase();

    // Size — single or range, with k or comma formatting
    var rangeM = t.match(/([\d,]+)\s*(?:k|,000)?\s*(?:to|-|\u2013|\u2014)\s*([\d,]+)\s*(?:k|,000)?(?:\s*sf)?/);
    var singleM = t.match(/([\d,]+)\s*(?:k|,000)\b|([\d,]{4,})/);
    if (rangeM){
      STATE.fields.size_min = expandSize(rangeM[1], t);
      STATE.fields.size_max = expandSize(rangeM[2], t);
    } else if (singleM){
      var n = expandSize(singleM[1] || singleM[2], t);
      if (n){
        STATE.fields.size_min = Math.round(n * 0.85);
        STATE.fields.size_max = Math.round(n * 1.15);
      }
    }

    // City
    ['mississauga','brampton','vaughan','etobicoke','scarborough','markham','oakville','burlington','north york','richmond hill','toronto'].forEach(function(c){
      if (t.indexOf(c) !== -1) STATE.fields.city = c.replace(/\b\w/g, function(m){ return m.toUpperCase(); });
    });

    // Clear height
    var clearM = t.match(/(\d{2})\s*['\u2032]?\s*(?:clear|ceiling|height|h)/);
    if (clearM) STATE.fields.clear_min = parseInt(clearM[1], 10);

    // Timing
    if (/asap|now|immediately|right away/.test(t)) STATE.fields.timing_months = 1;
    var monthM = t.match(/(\d+)\s*(?:mo|month)/);
    if (monthM) STATE.fields.timing_months = parseInt(monthM[1], 10);
    if (/(\d{4})\s*q[1-4]|q[1-4]\s*\d{4}/.test(t)){
      // Rough "Q3 2026" estimate
      STATE.fields.timing_months = STATE.fields.timing_months || 6;
    }

    // Broker
    if (/no broker|not working with|no agent|on my own|directly/.test(t)) STATE.fields.broker = 'no';
    else if (/yes,? broker|with my broker|tenant rep|my agent/.test(t)) STATE.fields.broker = 'yes';

    // Use / industry
    if (/food|kitchen|commissary/.test(t)) STATE.fields.use = 'food';
    else if (/cold|freezer|refrigerat/.test(t)) STATE.fields.use = 'cold-storage';
    else if (/3pl|logistics|fulfil/.test(t)) STATE.fields.use = '3pl';
    else if (/manufactur|fab|machin/.test(t)) STATE.fields.use = 'manufacturing';
    else if (/showroom|retail|flex/.test(t)) STATE.fields.use = 'showroom';
    else if (/cannabis|grow/.test(t)) STATE.fields.use = 'cannabis';
  }

  function expandSize(s, ctx){
    if (!s) return null;
    var n = parseFloat(String(s).replace(/,/g, ''));
    if (!isFinite(n)) return null;
    if (/k\b/.test(ctx) && n < 1000) n = n * 1000;
    if (n < 100) n = n * 1000; // someone typed "10" meaning 10k
    return Math.round(n);
  }

  function nextStep(){
    var f = STATE.fields;
    if (STATE.stage === 'size'){
      if (!f.size_min){
        addBotMessage("Got it. What size are you targeting? You can ballpark — \u201cabout 12k\u201d works.");
        return;
      }
      addBotMessage("Got it \u2014 " + fmtSize(f.size_min) + (f.size_max && f.size_max !== f.size_min ? " to " + fmtSize(f.size_max) : "") + " SF.");
      STATE.stage = 'city';
      setTimeout(function(){
        addBotMessage("Any preferred submarket? Mississauga, Brampton, Vaughan, Etobicoke, Scarborough, Markham\u2026 or open to anywhere?");
        setSuggestions(['Mississauga','Brampton','Vaughan','Etobicoke','Open to anywhere']);
      }, 600);
      return;
    }
    if (STATE.stage === 'city'){
      if (!f.city) f.city = 'Open';
      var loc = f.city === 'Open' ? "Got it \u2014 we'll cast wide across the GTA." : "Great, " + f.city + " is one of the bigger small-bay submarkets.";
      addBotMessage(loc);
      STATE.stage = 'clear';
      setTimeout(function(){
        addBotMessage("How much clear height do you need? (24', 28', 32'+ are typical brackets in this size class.)");
        setSuggestions(["20\u2032 is fine", "24\u2032+", "28\u2032+", "32\u2032+"]);
      }, 600);
      return;
    }
    if (STATE.stage === 'clear'){
      if (!f.clear_min){
        var input = STATE.history[STATE.history.length - 1].text.toLowerCase();
        if (/fine|good|whatever|any/.test(input)) f.clear_min = 20;
      }
      if (!f.clear_min) f.clear_min = 22;
      addBotMessage("OK \u2014 " + f.clear_min + "' clear minimum.");
      STATE.stage = 'timing';
      setTimeout(function(){
        addBotMessage("When do you need to be in? Roughly \u2014 1 month, 3 months, 6+ months?");
        setSuggestions(['ASAP','1\u20133 months','3\u20136 months','6\u201312 months']);
      }, 600);
      return;
    }
    if (STATE.stage === 'timing'){
      if (!f.timing_months){
        var input = STATE.history[STATE.history.length - 1].text.toLowerCase();
        if (/asap|now/.test(input)) f.timing_months = 1;
        else if (/1.{0,3}3/.test(input)) f.timing_months = 2;
        else if (/3.{0,3}6/.test(input)) f.timing_months = 4;
        else if (/6.{0,3}12/.test(input)) f.timing_months = 9;
        else f.timing_months = 6;
      }
      addBotMessage(f.timing_months <= 1 ? "Tight timeline \u2014 noted, we'll prioritize move-in-ready spaces." : "About " + f.timing_months + " months out \u2014 plenty of runway.");
      STATE.stage = 'broker';
      setTimeout(function(){
        addBotMessage("Last quick one: are you working with a tenant-rep broker, or sourcing yourself? (No wrong answer \u2014 we honor co-op fees either way.)");
        setSuggestions(['Yes, I have a broker','No, just me','Working with one casually']);
      }, 600);
      return;
    }
    if (STATE.stage === 'broker'){
      if (!f.broker){
        var input = STATE.history[STATE.history.length - 1].text.toLowerCase();
        f.broker = /yes/.test(input) ? 'yes' : 'no';
      }
      if (f.broker === 'yes'){
        addBotMessage("Perfect \u2014 if you'd like, share their email and I'll cc them on what I send next.");
      }
      STATE.stage = 'recommend';
      setTimeout(showRecommendations, 600);
      return;
    }
    if (STATE.stage === 'recommend'){
      var input = (STATE.history[STATE.history.length - 1].text || '').toLowerCase();
      if (/tour|visit|see it|in person|book/.test(input)){
        STATE.stage = 'book';
        addBotMessage("Excellent. To book a tour I'll loop in {{agent_name}} \u2014 they'll text you in the next 15 minutes with 3 time options. What's the best mobile number for them to reach?");
        return;
      }
      if (/another|more|different|other/.test(input)){
        showRecommendations({ skip: STATE.matches.map(function(m){ return m.id; }) });
        return;
      }
      addBotMessage("Want me to set up a tour for any of these, or send the details over email?");
      setSuggestions(['Book a tour','Email me the details','Show me other options','Connect me to a human']);
      return;
    }
    if (STATE.stage === 'book'){
      // Capture phone, send handoff
      addBotMessage("Got it \u2014 I've sent the lead summary to the leasing team. You'll hear back within 15 minutes during business hours. \u2728");
      setTimeout(function(){
        addBotMessage("In the meantime, here's a quick recap of what we discussed:", { html: false });
        addBotMessage(buildRecapHtml(), { html: true });
        setSuggestions(['Start over','Add another requirement']);
      }, 800);
      return;
    }
  }

  // ---------- Search the inventory ----------

  function showRecommendations(opts){
    opts = opts || {};
    var f = STATE.fields;
    var pool = collectListings();
    var skip = (opts.skip || []).reduce(function(a,k){ a[k]=true; return a; }, {});
    var scored = pool.map(function(l){ return { l: l, score: scoreFit(l, f) }; })
      .filter(function(x){ return x.score > 0 && !skip[x.l.id]; })
      .sort(function(a,b){ return b.score - a.score; });
    STATE.matches = scored.slice(0, 3).map(function(x){ return x.l; });

    if (STATE.matches.length === 0){
      addBotMessage("Hm \u2014 I don't have an exact match in my live inventory for that profile. {{agent_name}} works our off-market network constantly though. Want me to flag this as a brief and have them dig?");
      setSuggestions(['Yes, please','No, show me anything close','What about Mississauga only?']);
      return;
    }

    addBotMessage("Here are " + STATE.matches.length + " spaces that fit the brief:");
    var html = STATE.matches.map(function(l, i){
      return ''
        + '<div class="ai-listing-card">'
        +   '<div class="ai-listing-rank">#' + (i+1) + '</div>'
        +   '<div class="ai-listing-body">'
        +     '<div class="ai-listing-addr">' + escapeHtml(l.addr || l.address || '\u2014') + '</div>'
        +     '<div class="ai-listing-line">' + (l.size ? Number(l.size).toLocaleString() + ' SF' : '') + (l.clear ? ' \u00b7 ' + l.clear + "' clear" : '') + (l.dock ? ' \u00b7 ' + l.dock + ' TL' : '') + '</div>'
        +     '<div class="ai-listing-line">' + (l.priceLine || (l.net_rent_psf ? '$' + l.net_rent_psf.toFixed(2) + ' net' : '\u2014')) + '</div>'
        +     (l.why ? '<div class="ai-listing-why">' + escapeHtml(l.why) + '</div>' : '')
        +   '</div>'
        + '</div>';
    }).join('');
    addBotMessage(html, { html: true });
    setTimeout(function(){
      addBotMessage("Want to book a tour, see different options, or have one of our brokers reach out?");
      setSuggestions(['Book a tour','Show me other options','Connect me to a broker','Email me these details']);
    }, 700);
  }

  function collectListings(){
    var out = [];
    // Sample listings already on the page (sidebar cards)
    document.querySelectorAll('#listingCards .listing-card').forEach(function(card, idx){
      var addr = (card.querySelector('.listing-address')||{}).textContent || '';
      var submkt = (card.querySelector('.listing-submkt')||{}).textContent || '';
      var price = (card.querySelector('.listing-price')||{}).textContent || '';
      var tags = Array.prototype.slice.call(card.querySelectorAll('.listing-specs .tag')).map(function(t){return t.textContent;});
      var size = null, clear = null, dock = null;
      tags.forEach(function(t){
        var m = t.match(/([\d,]+)\s*SF/i); if (m) size = parseInt(m[1].replace(/,/g,''),10);
        var c = t.match(/(\d+)['\u2032]\s*clear/i); if (c) clear = parseInt(c[1],10);
        var d = t.match(/^(\d+)\s*TL/i); if (d) dock = parseInt(d[1],10);
      });
      out.push({
        id: 'sidebar-' + idx,
        addr: addr.trim(),
        size: size, clear: clear, dock: dock,
        city: submkt.split('\u00b7')[0].trim(),
        priceLine: price.replace(/\s+/g,' ').trim(),
        source: 'sidebar'
      });
    });
    // Listings.json data via globals (loaded by map.js)
    var jsonData = window.industrioListings || null;
    if (jsonData){
      ['for_lease','leased'].forEach(function(k){
        (jsonData[k] || []).forEach(function(j){
          out.push({
            id: j.id || (j.address + '-' + (j.unit||'')),
            addr: [j.address, (j.unit ? 'Unit ' + j.unit : ''), j.city].filter(Boolean).join(', '),
            size: j.size_sf, clear: j.clear_ft, dock: j.docks,
            city: j.city,
            net_rent_psf: j.net_rent_psf || j.achieved_net_psf,
            priceLine: j.net_rent_psf ? '$' + Number(j.net_rent_psf).toFixed(2) + ' net asking' :
                       j.achieved_net_psf ? 'Recent comp at $' + Number(j.achieved_net_psf).toFixed(2) + ' net' : '\u2014',
            source: k
          });
        });
      });
    }
    return out;
  }

  function scoreFit(l, f){
    var s = 50;
    var why = [];
    if (f.size_min && l.size){
      if (l.size >= (f.size_min * 0.85) && l.size <= (f.size_max || f.size_min * 1.5) * 1.15){ s += 25; why.push('Size matches'); }
      else if (Math.abs(l.size - f.size_min) / f.size_min < 0.40){ s += 8; why.push('Close on size'); }
      else { s -= 30; }
    }
    if (f.city && f.city !== 'Open' && l.city){
      if ((l.city || '').toLowerCase().indexOf(f.city.toLowerCase()) !== -1){ s += 20; why.push('In ' + f.city); }
      else { s -= 5; }
    }
    if (f.clear_min && l.clear){
      if (l.clear >= f.clear_min){ s += 10; why.push("Has " + l.clear + "' clear"); }
      else { s -= 15; }
    }
    l.why = why.slice(0, 3).join(' \u00b7 ');
    return s;
  }

  // ---------- Recap card on handoff ----------

  function buildRecapHtml(){
    var f = STATE.fields;
    var rows = [];
    if (f.size_min) rows.push(['Size', fmtSize(f.size_min) + (f.size_max && f.size_max !== f.size_min ? ' \u2013 ' + fmtSize(f.size_max) : '') + ' SF']);
    if (f.city) rows.push(['Submarket', f.city]);
    if (f.clear_min) rows.push(['Clear height', f.clear_min + "' minimum"]);
    if (f.timing_months) rows.push(['Timing', f.timing_months <= 1 ? 'ASAP' : '~' + f.timing_months + ' months out']);
    if (f.broker) rows.push(['Broker', f.broker === 'yes' ? 'Has tenant rep' : 'Sourcing direct']);
    if (f.use) rows.push(['Use', f.use]);
    return '<div class="ai-recap"><div class="ai-recap-title">Lead brief</div>'
      + '<table class="ai-recap-table">'
      + rows.map(function(r){ return '<tr><td>' + r[0] + '</td><td>' + escapeHtml(r[1]) + '</td></tr>'; }).join('')
      + '</table></div>';
  }

  // ---------- Live mode (Claude API) ----------

  function routeViaClaude(text){
    // Build the conversation in Anthropic Messages API format
    var systemPrompt = buildSystemPrompt();
    var messages = STATE.history.filter(function(m){ return m.text; }).map(function(m){
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text };
    });
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': STATE.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages: messages
      })
    }).then(function(r){ return r.json(); }).then(function(data){
      var reply = (data.content && data.content[0] && data.content[0].text) || "(no response)";
      addBotMessage(reply);
    }).catch(function(err){
      addBotMessage("(Live mode failed: " + (err.message || err) + ". Try refreshing or removing the API key in settings.)");
    });
  }

  function buildSystemPrompt(){
    var bldgs = window.industrioBuildings || {};
    var stats = (bldgs.stats || []).map(function(s){
      return '- ' + s.submarket + ': ' + s.building_count + ' bldgs, ' + (s.total_rentable_sf/1e6).toFixed(1) + 'M SF, vacancy ' + ((s.vacancy_pct||0)*100).toFixed(1) + '%, avg rent $' + (s.avg_weighted_rent_psf||0).toFixed(2);
    }).join('\n');
    return [
      'You are the industrio AI assistant — a tenant-side commercial real estate qualifier for GTA small/mid-bay industrial space.',
      '',
      'Your job: in 4–6 short messages, qualify the inquiry on size, submarket, clear height, timing, and whether they have a tenant-rep broker. Then propose the best matches from the live data below and offer to book a tour.',
      '',
      'Hard rules:',
      '- 1–3 sentences per reply, never a wall of text.',
      '- Never quote a final rent. Asking ranges OK. Effective rent depends on term/TI/free-rent.',
      '- Never disclose another tenant\'s lease terms.',
      '- If they have a tenant rep broker, cooperate fully and ask for the broker\'s email.',
      '- If asked anything legal/financial, say "let me get a licensed person on that" and offer human handoff.',
      '- Never claim to be a registered REALTOR.',
      '',
      'Live GTA market context:',
      stats,
      '',
      'Talk like a sharp commercial broker — terse, factual, helpful. No marketing fluff.'
    ].join('\n');
  }

  // ---------- Helpers ----------

  function fmtSize(n){ return Number(n).toLocaleString(); }
  function escapeHtml(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  // ---------- Boot ----------

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUI);
  else injectUI();
})();
