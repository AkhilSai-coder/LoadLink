const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'matched-loads.html', root: '../../', user });

  let activeFilter = 'all';

  // Wire filter buttons
  const filterBtns = document.querySelectorAll('#tripFilters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
        b.style.fontWeight = '';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--highway)';
      btn.style.color = 'var(--asphalt)';
      btn.style.borderColor = 'var(--highway)';
      btn.style.fontWeight = '700';
      activeFilter = btn.dataset.filter || 'all';
      render();
    });
  });

  async function render() {
    const rawMatches = await Api.getMatchesForUser(user.id, 'driver');
    const allBills = await Api.getBillsForDriver(user.id);
    const wrap = document.getElementById('matchList');

    // 1. Deduplicate matches by ID to guarantee zero duplicates
    const seen = new Set();
    const matches = (rawMatches || []).filter(m => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // 2. Compute dynamic counts
    const countAll = matches.length;
    const countActive = matches.filter(m => ['accepted', 'pickup_confirmed', 'in_transit', 'arrived'].includes(m.status)).length;
    const countPending = matches.filter(m => m.status === 'requested').length;
    const countDelivered = matches.filter(m => m.status === 'delivered').length;

    const cAllEl = document.getElementById('countAll');
    if (cAllEl) cAllEl.textContent = countAll;
    const cActEl = document.getElementById('countActive');
    if (cActEl) cActEl.textContent = countActive;
    const cPenEl = document.getElementById('countPending');
    if (cPenEl) cPenEl.textContent = countPending;
    const cDelEl = document.getElementById('countDelivered');
    if (cDelEl) cDelEl.textContent = countDelivered;

    // 3. Filter matches based on active tab
    let filtered = matches;
    if (activeFilter === 'active') {
      filtered = matches.filter(m => ['accepted', 'pickup_confirmed', 'in_transit', 'arrived'].includes(m.status));
    } else if (activeFilter === 'pending') {
      filtered = matches.filter(m => m.status === 'requested');
    } else if (activeFilter === 'delivered') {
      filtered = matches.filter(m => m.status === 'delivered');
    }

    if (!filtered.length) {
      // If no matches under this filter
      if (matches.length === 0) {
        // Fetch open loads dynamically to give the driver available backhaul options
        const openLoads = await Api.getOpenLoads();
        const openLoadsHtml = (openLoads && openLoads.length) ? `
          <div class="mt-4" style="text-align:left;">
            <div class="flex-between mb-2">
              <div>
                <span class="eyebrow-marker">FREIGHT OPPORTUNITIES</span>
                <h3 style="margin:.2rem 0; font-family:var(--display);">Available Loads Waiting for Backhaul Trucks</h3>
                <p class="text-soft mb-0" style="font-size:.85rem;">Post return capacity on these routes or contact shippers immediately.</p>
              </div>
              <a class="btn btn-sm btn-primary" href="post-capacity.html">Post Capacity to Match</a>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem; margin-top:1rem;">
              ${openLoads.slice(0, 4).map(l => `
                <div class="panel" style="background:var(--paper); border:1px solid var(--concrete-2); border-radius:var(--radius-m); padding:1rem;">
                  <div class="flex-between">
                    <strong style="font-size:.95rem;">${UI.escapeHtml(l.material)}</strong>
                    <span class="stamp stamp-pending">${l.weightTons}${l.unit || 'T'}</span>
                  </div>
                  <div class="route mt-2" style="font-size:.85rem;">
                    <span class="pt">${UI.escapeHtml(l.origin)}</span>
                    <span class="line"></span>
                    <span class="pt">${UI.escapeHtml(l.destination)}</span>
                  </div>
                  <div class="waybill-meta mt-2" style="font-size:.8rem;">
                    <span>Budget <strong>${UI.money(l.budget)}</strong></span>
                    <span>Pickup <strong>${UI.date(l.pickupDate)}</strong></span>
                  </div>
                  <a class="btn btn-outline btn-sm mt-2" style="width:100%; text-align:center;" href="post-capacity.html?origin=${encodeURIComponent(l.origin)}&destination=${encodeURIComponent(l.destination)}">Match This Route &rarr;</a>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';

        wrap.innerHTML = `
          <div class="empty-state panel">
            <h3>No road trip requests yet</h3>
            <p>Post your unused backhaul capacity to get matched with shippers returning along your route.</p>
            <a class="btn btn-primary" href="post-capacity.html">Post Backhaul Capacity</a>
          </div>
          ${openLoadsHtml}
        `;
      } else {
        wrap.innerHTML = `
          <div class="empty-state panel">
            <h3>No trips found for "${activeFilter}" filter</h3>
            <p>Try switching to "All Trips" to view your full backhaul freight queue.</p>
            <button class="btn btn-outline btn-sm" id="resetFilterBtn">View All Trips (${matches.length})</button>
          </div>
        `;
        const resetBtn = document.getElementById('resetFilterBtn');
        if (resetBtn) resetBtn.addEventListener('click', () => {
          filterBtns[0].click();
        });
      }
      return;
    }

    wrap.innerHTML = filtered.map(m => {
      const bills = (allBills || []).filter(b => b.matchId === m.id);
      const ratings = m.ratings || { customer: null, driver: null };
      const inActiveTrip = ['accepted', 'pickup_confirmed', 'in_transit', 'arrived'].includes(m.status);

      return `
      <div class="waybill" style="box-shadow:0 2px 8px rgba(0,0,0,0.04); transition:transform 0.15s ease, box-shadow 0.15s ease;">
        <div class="waybill-top">
          <span class="waybill-id">${m.status === 'requested' ? 'REQUEST' : 'ROAD CONSIGNMENT'} &middot; ${m.id.toUpperCase()} &middot; ${m.load ? m.load.material : 'General Freight'}</span>
          <span class="stamp ${UI.stampClass(m.status)}">${UI.statusLabel[m.status]}</span>
        </div>
        <div class="route"><span class="pt">${UI.escapeHtml(m.load ? m.load.origin : '')}</span><span class="line"></span><span class="pt">${UI.escapeHtml(m.load ? m.load.destination : '')}</span></div>
        <div class="waybill-meta">
          <span>Shipper <strong>${UI.escapeHtml((m.customer && m.customer.name) || 'Direct Shipper')}</strong></span>
          <span>Cargo weight <strong>${m.weightTons}${m.unit || 'T'}</strong></span>
          <span>Agreed Payout <strong>${UI.money(m.price)}</strong></span>
          ${m.matchScore != null ? `<span>Match Score <strong>${m.matchScore}%</strong></span>` : ''}
          ${m.detourKm != null ? `<span>Detour <strong>+${m.detourKm} km</strong></span>` : ''}
        </div>
        ${m.status === 'requested' && m.matchBreakdown ? `
          <div class="rf-score-breakdown mb-2">
            <span>Route ${m.matchBreakdown.route || 0}/25</span>
            <span>Capacity ${m.matchBreakdown.capacity || 0}/20</span>
            <span>Time ${m.matchBreakdown.time || 0}/15</span>
            <span>Detour ${m.matchBreakdown.detour || 0}/15</span>
            <span>Vehicle ${m.matchBreakdown.vehicle || 0}/10</span>
            <span>Reliability ${m.matchBreakdown.reliability || 0}/15</span>
          </div>
          <details class="rf-why mb-2"><summary>Why this match?</summary><ul>${(m.reasons || []).map(r => `<li>${UI.escapeHtml(r)}</li>`).join('')}</ul></details>
        ` : ''}
        ${m.digitalRecord ? `
          <div class="flex-between mt-2 mb-2 p-2" style="background:var(--concrete); border-radius:var(--radius-s); font-size:.82rem;">
            <span>Digital Road Consignment: <strong>${m.digitalRecord.consignmentId}</strong></span>
            <span class="text-soft">&bull; Dual-OTP Verified Waybill</span>
          </div>
        ` : ''}
        <div class="waybill-actions">
          ${m.status === 'requested' ? `
            <button class="btn btn-primary btn-sm accept-btn" data-id="${m.id}">Accept Booking</button>
            <button class="btn btn-danger btn-sm reject-btn" data-id="${m.id}">Decline</button>
          ` : ''}
          ${inActiveTrip ? `<a class="btn btn-primary btn-sm" href="active-trip.html?id=${m.id}">Open Active Cabin HUD &rarr;</a>` : ''}
          ${m.status === 'delivered' && !bills.length ? `<button class="btn btn-navy btn-sm bill-btn" data-id="${m.id}">Submit E-Bill</button>` : ''}
          ${bills.length ? `<span class="text-soft" style="font-size:.85rem; padding:4px 8px; background:var(--concrete-2); border-radius:var(--radius-s);">Bill Status: <strong>${UI.statusLabel[bills[0].status] || bills[0].status}</strong></span>` : ''}
          ${m.status === 'delivered' ? `<button class="btn btn-outline btn-sm rate-btn" data-id="${m.id}">${ratings.driver ? 'Update Shipper Rating' : 'Rate Shipper'}</button>` : ''}
          <a class="btn btn-outline btn-sm" href="../../track.html?q=${m.id}" target="_blank">GPS Radar</a>
        </div>
        ${ratings.customer ? `<p class="text-soft mt-1" style="font-size:.8rem;">Shipper rated this trip ${UI.stars(ratings.customer.ratings.overall)} (${ratings.customer.ratings.overall}/5)</p>` : ''}
      </div>`;
    }).join('');

    wrap.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', async () => {
      const res = await Api.decideBooking(b.dataset.id, 'accepted');
      if (res.ok) UI.toast('Booking accepted — digital road consignment generated.');
      else UI.toast(res.error, 'error');
      await render();
    }));
    wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {
      if (!UI.confirmAction('Reject this transport request?')) return;
      await Api.decideBooking(b.dataset.id, 'rejected');
      UI.toast('Request rejected.');
      await render();
    }));
    wrap.querySelectorAll('.bill-btn').forEach(b => b.addEventListener('click', async () => {
      const match = await Api.getMatch(b.dataset.id);
      const freight = window.prompt('Freight amount (₹):', match.price);
      if (freight === null) return;
      const tolls = window.prompt('Toll charges (₹):', '0') || 0;
      const other = window.prompt('Other charges (₹):', '0') || 0;
      await Api.submitBill(b.dataset.id, freight, tolls, other, user.id);
      UI.toast('Bill submitted for approval.');
      await render();
    }));
    wrap.querySelectorAll('.rate-btn').forEach(b => b.addEventListener('click', async () => {
      const readiness = window.prompt('Rate cargo readiness (1-5):', '5');
      if (readiness === null) return;
      const accuracy = window.prompt('Rate cargo information accuracy (1-5):', '5') || '5';
      const cooperation = window.prompt('Rate pickup cooperation (1-5):', '5') || '5';
      const res = await Api.rateTrip(b.dataset.id, 'driver', {
        readiness: Number(readiness), accuracy: Number(accuracy), cooperation: Number(cooperation),
        overall: Math.round((Number(readiness) + Number(accuracy) + Number(cooperation)) / 3)
      }, '');
      if (res.ok) { UI.toast('Shipper rated.'); await render(); }
      else UI.toast(res.error, 'error');
    }));
  }

  render();
}
