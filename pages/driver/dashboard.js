const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'dashboard.html', root: '../../', user });
  document.getElementById('greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0];

  const kycBanner = document.getElementById('kycBanner');
  if (user.kycStatus !== 'verified') {
    const msgs = {
      none: { text: 'Complete your KYC to start listing capacity and getting matched.', cls: 'panel--accent' },
      pending: { text: 'Your KYC documents are under review. This usually takes under a day.', cls: '' },
      rejected: { text: 'Your KYC was rejected' + (user.kycNote ? ': ' + user.kycNote : '') + '. Please resubmit.', cls: '' }
    };
    const m = msgs[user.kycStatus] || msgs.none;
    kycBanner.innerHTML = `
      <div class="panel ${m.cls} mt-2" style="border-color:var(--amber-600); background:var(--amber-100);">
        <div class="flex-between">
          <p class="mb-0">${m.text}</p>
          ${user.kycStatus !== 'pending' ? `<a class="btn btn-navy btn-sm" href="kyc-onboarding.html">${user.kycStatus === 'rejected' ? 'Resubmit KYC' : 'Complete KYC'}</a>` : ''}
        </div>
      </div>`;
  }

  async function initDashboard() {
    const caps = await Api.getCapacitiesByDriver(user.id);
    const matches = await Api.getMatchesForUser(user.id, 'driver');
  document.getElementById('statOpen').textContent = caps.filter(c => c.remainingTons > 0).length;
  document.getElementById('statMatched').textContent = matches.filter(m => m.status === 'accepted').length;
  document.getElementById('statTransit').textContent = matches.filter(m => ['pickup_confirmed', 'in_transit', 'arrived'].includes(m.status)).length;
  const earned = matches.filter(m => m.status === 'delivered').reduce((s, m) => s + m.price, 0);
  document.getElementById('statEarned').textContent = UI.money(earned);

  // PRIORITY 4 — make the existing-trip / unused-capacity story impossible to miss.
  const storyWrap = document.getElementById('tripStory');
  const featured = caps.find(c => c.remainingTons > 0) || caps[0];
  if (storyWrap) {
    if (!featured) {
      storyWrap.innerHTML = '';
    } else {
      const acceptedForCap = matches.filter(m => m.capacityId === featured.id && ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'].includes(m.status));
      const extraIncome = acceptedForCap.reduce((s, m) => s + m.price, 0) || featured.minPrice;
      storyWrap.innerHTML = `
        <div class="rf-story">
          <span class="rf-tagline">"Don't create another trip. Fill the empty one."</span>
          <h3>YOUR EXISTING TRIP</h3>
          <div class="route mt-2"><span class="pt" style="color:#fff;">${UI.escapeHtml(featured.origin)}</span><span class="line"></span><span class="pt" style="color:#fff;">${UI.escapeHtml(featured.destination)}</span></div>
          <p style="color:#C9D3CD; margin:.6em 0;">Vehicle: <strong style="color:#fff;">${UI.escapeHtml(featured.vehicleType)}</strong> · Total capacity <strong style="color:#fff;">${featured.totalCapacityTons}${featured.unit}</strong> · Existing load <strong style="color:#fff;">${featured.existingLoadTons}${featured.unit}</strong> · Unused capacity <strong style="color:#9FE0C0;">${featured.availableBackhaulTons}${featured.unit}</strong></p>
          <div class="rf-compare">
            <div class="rf-compare-card">
              <div class="text-soft" style="color:#C9D3CD;">NORMAL RETURN</div>
              <div class="rf-amt">₹0</div>
              <div style="color:#C9D3CD; font-size:.85rem;">additional income</div>
            </div>
            <div class="rf-compare-card rf-highlight">
              <div>WITH LOADLINK</div>
              <div class="rf-amt">${UI.money(extraIncome)}</div>
              <div style="font-size:.85rem;">additional income</div>
            </div>
          </div>
          <p style="color:#fff; font-weight:600; margin-top:var(--space-2);">Your vehicle is already returning. Why return empty?</p>
          <a class="btn btn-primary mt-2" href="post-capacity.html">Publish Available Capacity</a>
        </div>`;
    }
  }

  const wrap = document.getElementById('capacityList');
  if (!caps.length) {
    wrap.innerHTML = `<div class="empty-state panel"><h3>No road trips posted yet</h3><p>List your return trip and start earning on the empty leg.</p><a class="btn btn-primary" href="post-capacity.html">Post capacity</a></div>`;
  } else {
    wrap.innerHTML = caps.map(c => {
      const util = Api.getCapacityUtilization(c.id);
      const opp = Api.getRoadCorridorOpportunity(c.id);
      return `
      <div class="waybill">
        <div class="waybill-top">
          <span class="waybill-id">ROAD TRIP · ${c.id.toUpperCase()} · ${UI.date(c.availableDate)}</span>
          <span class="stamp ${UI.stampClass(c.status)}">${UI.statusLabel[c.status]}</span>
        </div>
        <div class="route"><span class="pt">${UI.escapeHtml(c.origin)}</span><span class="line"></span><span class="pt">${UI.escapeHtml(c.destination)}</span></div>
        <div class="waybill-meta">
          <span>${UI.escapeHtml(c.vehicleType)}</span>
          <span>Available <strong>${UI.date(c.availableDate)}</strong></span>
          <span>Total <strong>${c.totalCapacityTons}${c.unit}</strong></span>
          <span>From <strong>${UI.money(c.minPrice)}</strong></span>
        </div>
        ${UI.capacityBar(c)}
        <p class="text-soft mt-1" style="font-size:.8rem;">Capacity utilization: ${util.utilizationBeforePct}% → ${util.utilizationAfterPct}% · Extra income so far <strong style="color:var(--emerald-600);">${UI.money(util.extraIncome)}</strong></p>
        ${opp ? `
          <div class="rf-opportunity">
            <div class="flex-between">
              <span class="lvl">ROAD CORRIDOR OPPORTUNITY — ${opp.corridor}</span>
              <span class="lvl">${opp.demandLevel} DEMAND</span>
            </div>
            <div class="rf-opportunity-grid">
              <div><strong>${opp.activeRequests}</strong>active requests</div>
              <div><strong>${opp.unusedDemandTons}T</strong>unused capacity demand</div>
              <div><strong>${UI.money(opp.earningLow)}–${UI.money(opp.earningHigh)}</strong>earning opportunity</div>
              <div><strong>${opp.opportunityScore}%</strong>opportunity score</div>
            </div>
            <p style="color:#9FE0C0; font-size:.72rem; margin:.5em 0 0;">Demo/estimated corridor demand — not a live market feed.</p>
          </div>` : ''}
        <div class="waybill-actions">
          <a class="btn btn-outline btn-sm" href="matched-loads.html">View bookings on this trip</a>
        </div>
      </div>
    `;
    }).join('');
  }
  }
  initDashboard();
}
