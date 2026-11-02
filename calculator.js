(function(){
  'use strict';

  function fmt(x){
    var neg = x < 0;
    var v = Math.round(Math.abs(x));
    var s = '$' + v.toLocaleString('en-US');
    return neg ? '\u2212' + s : s;
  }
  function n(id){ return Number(document.getElementById(id).value) || 0; }

  function calc(){
    var size     = n('calc-size');
    var pricePsf = n('calc-price');
    var hold     = Math.max(1, Math.floor(n('calc-hold')));
    var downPct  = n('calc-down') / 100;
    var rate     = n('calc-rate') / 100;
    var amortYrs = Math.max(1, n('calc-amort'));
    var rent     = n('calc-rent');
    var tmi      = n('calc-tmi');
    var esc      = n('calc-esc') / 100;
    var condo    = n('calc-condo');
    var appr     = n('calc-appr') / 100;
    var tax      = n('calc-tax') / 100;
    var sellPct  = n('calc-sell') / 100;

    // LEASE path — annual rent + TMI, escalating each year
    var totalLease = 0, netLeaseByYr = [];
    for (var y = 0; y < hold; y++){
      totalLease += size * (rent + tmi) * Math.pow(1 + esc, y);
      netLeaseByYr.push(totalLease * (1 - tax));
    }
    var leaseTaxShield = totalLease * tax;
    var netLease = totalLease - leaseTaxShield;

    // OWN path — commercial mortgage amortization
    var price   = size * pricePsf;
    var down    = price * downPct;
    var loan    = Math.max(0, price - down);
    var mr      = rate / 12;
    var nTot    = amortYrs * 12;
    var pmt     = mr > 0 ? loan * mr / (1 - Math.pow(1 + mr, -nTot)) : loan / nTot;
    var annualPI = pmt * 12;

    var balance = loan, totalInt = 0;
    var intByYr = [], balByYr = [];
    for (var y = 0; y < hold; y++){
      var intY = 0;
      for (var m = 0; m < 12 && balance > 0.01; m++){
        var iM = balance * mr;
        var pM = Math.min(pmt - iM, balance);
        balance -= pM;
        intY += iM;
        totalInt += iM;
      }
      intByYr.push(intY);
      balByYr.push(balance);
    }

    // Condo / op costs, same escalation as lease
    var totalCondo = 0, cumCondo = [];
    for (var y = 0; y < hold; y++){
      totalCondo += size * condo * Math.pow(1 + esc, y);
      cumCondo.push(totalCondo);
    }

    // CCA — 4% declining balance on 90% building portion, half-year rule yr 1
    var book = price * 0.90, ccaTotal = 0, ccaByYr = [];
    for (var y = 0; y < hold; y++){
      var ded = book * 0.04 * (y === 0 ? 0.5 : 1);
      book -= ded;
      ccaTotal += ded;
      ccaByYr.push(ccaTotal);
    }

    // Exit economics
    var marketValue = price * Math.pow(1 + appr, hold);
    var sellingCost = marketValue * sellPct;
    var grossEquity = marketValue - balance - sellingCost;
    var capitalGain = Math.max(0, marketValue - price);
    var capGainsTax = capitalGain * 0.5 * tax;
    var recaptureTax = ccaTotal * tax;
    var netProceeds = grossEquity - capGainsTax - recaptureTax;

    var cashOut    = down + (annualPI * hold) + totalCondo;
    var taxShields = (totalInt + ccaTotal) * tax;
    var netOwn     = cashOut - taxShields - netProceeds;

    // Break-even year (first year cumulative own net < cumulative lease net)
    var breakEvenYr = null;
    var cumInt = 0;
    for (var y = 0; y < hold; y++){
      cumInt += intByYr[y];
      var mvY = price * Math.pow(1 + appr, y + 1);
      var sellY = mvY * sellPct;
      var equityY = mvY - balByYr[y] - sellY;
      var cgY = Math.max(0, mvY - price) * 0.5 * tax;
      var recY = ccaByYr[y] * tax;
      var netProcY = equityY - cgY - recY;
      var ownCumY = down + (annualPI * (y + 1)) + cumCondo[y] - (cumInt + ccaByYr[y]) * tax - netProcY;
      if (ownCumY < netLeaseByYr[y] && breakEvenYr === null) breakEvenYr = y + 1;
    }

    var diff = netLease - netOwn;
    var ownWins = diff > 0;

    var rows = [];
    rows.push('<div style="display:flex;justify-content:space-between;margin-bottom:16px;">');
    rows.push('<span class="tag">' + hold + '-yr after-tax net cost</span>');
    rows.push('<span class="tag">' + (ownWins ? 'Own wins' : 'Lease wins') + '</span>');
    rows.push('</div>');
    rows.push('<div class="data-list">');
    rows.push('<div class="row"><span class="label" style="color:var(--text);font-weight:600;">LEASE path</span><span class="value"></span></div>');
    rows.push('<div class="row"><span class="label">Gross rent + TMI (' + hold + ' yr)</span><span class="value">' + fmt(totalLease) + '</span></div>');
    rows.push('<div class="row"><span class="label">Less: tax shield</span><span class="value">' + fmt(-leaseTaxShield) + '</span></div>');
    rows.push('<div class="row"><span class="label" style="color:var(--accent);font-weight:600;">Net lease cost</span><span class="value" style="color:var(--accent);">' + fmt(netLease) + '</span></div>');
    rows.push('<div class="row" style="margin-top:10px;"><span class="label" style="color:var(--text);font-weight:600;">OWN path</span><span class="value"></span></div>');
    rows.push('<div class="row"><span class="label">Purchase price</span><span class="value">' + fmt(price) + '</span></div>');
    rows.push('<div class="row"><span class="label">Down payment</span><span class="value">' + fmt(down) + '</span></div>');
    rows.push('<div class="row"><span class="label">' + hold + '-yr P&amp;I paid</span><span class="value">' + fmt(annualPI * hold) + '</span></div>');
    rows.push('<div class="row"><span class="label">' + hold + '-yr condo + op</span><span class="value">' + fmt(totalCondo) + '</span></div>');
    rows.push('<div class="row"><span class="label">Interest + CCA tax shield</span><span class="value">' + fmt(-taxShields) + '</span></div>');
    rows.push('<div class="row"><span class="label">Market value at exit</span><span class="value">' + fmt(marketValue) + '</span></div>');
    rows.push('<div class="row"><span class="label">Loan balance at exit</span><span class="value">' + fmt(balance) + '</span></div>');
    rows.push('<div class="row"><span class="label">Net exit proceeds (after tax)</span><span class="value">+' + fmt(netProceeds) + '</span></div>');
    rows.push('<div class="row"><span class="label" style="color:var(--accent);font-weight:600;">Net own cost</span><span class="value" style="color:var(--accent);">' + fmt(netOwn) + '</span></div>');
    rows.push('<div class="row"><span class="label">Break-even year</span><span class="value">' + (breakEvenYr ? 'Yr ' + breakEvenYr : 'Beyond hold') + '</span></div>');
    rows.push('</div>');

    document.getElementById('calc-results').innerHTML = rows.join('');

    document.getElementById('calc-summary').innerHTML =
      '<span class="label">' + (ownWins ? 'Owning is cheaper by' : 'Leasing is cheaper by') + '</span>' +
      '<span class="winner">' + fmt(Math.abs(diff)) + '</span>';
  }

  function wire(){
    var inputs = document.querySelectorAll('#calculator input');
    for (var i = 0; i < inputs.length; i++){
      inputs[i].addEventListener('input', calc);
    }
    calc();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
