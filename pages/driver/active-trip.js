const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'matched-loads.html', root: '../../', user });

  const matchId = new URLSearchParams(window.location.search).get('id');
  const startedKey = 'rf_trip_started_' + matchId;

  async function init() {
    const initial = matchId ? await Api.getMatch(matchId) : null;
    if (!initial || initial.driverId !== user.id) {
      document.getElementById('tripRoot').innerHTML = `<div class="empty-state panel"><h3>Road trip not found</h3><p>This booking doesn't exist or isn't yours.</p><a class="btn btn-primary" href="matched-loads.html">Back to road trips</a></div>`;
    } else {
      await render();
    }
  }

  async function render() {
    const m = await Api.getMatch(matchId);
    const util = m.capacityId ? Api.getCapacityUtilization(m.capacityId) : null;
    const readiness = Api.getTripReadiness(m.id);
    const started = sessionStorage.getItem(startedKey) === '1';
    const otpPending = m.status === 'arrived' && m.pod && m.pod.otp && !m.pod.otpVerified;
    const photos = Api.getTripPhotos(m.id);
    const hasPickup = photos.some(p => p.type === 'pickup');
    const hasDelivery = photos.some(p => p.type === 'delivery');

    document.getElementById('tripRoot').innerHTML = `
      <div class="rf-story">
        <span class="rf-tagline">Active Road Trip</span>
        <h3 style="margin-top:0;">${UI.escapeHtml(m.load ? m.load.origin : '')} → ${UI.escapeHtml(m.load ? m.load.destination : '')}</h3>
        <p style="color:#C9D3CD;">Status: <strong style="color:#fff;">${(UI.statusLabel[m.status] || m.status).toUpperCase()}</strong> · Shipper <strong style="color:#fff;">${UI.escapeHtml(m.customer.name || '')}</strong></p>
        ${m.digitalRecord ? `<p style="color:#9FE0C0; font-size:.85rem;">Digital Road Consignment ${m.digitalRecord.consignmentId}</p>` : ''}
      </div>

      ${util ? `
      <h2 class="mt-4">Capacity visualization</h2>
      <div class="panel">
        <div class="waybill-meta">
          <span>Total vehicle capacity <strong>${util.total}${util.unit}</strong></span>
          <span>Existing cargo <strong>${util.before}${util.unit}</strong></span>
          <span>LoadLink cargo (this trip) <strong>${m.weightTons}${m.unit}</strong></span>
          <span>Remaining capacity <strong>${util.remaining}${util.unit}</strong></span>
        </div>
        <div class="mt-2"><div class="progress"><span style="width:${util.utilizationAfterPct}%;"></span></div></div>
        <p class="text-soft mt-1" style="font-size:.82rem;">Capacity utilization: ${util.utilizationBeforePct}% → ${util.utilizationAfterPct}%</p>
      </div>` : ''}

      ${m.status === 'accepted' && !started ? UI.renderChecklist(readiness) : ''}

      ${m.status === 'accepted' && started ? `
        <div class="panel panel--accent mt-3" style="background:var(--paper); border:2px solid var(--highway); border-radius:var(--radius-m); padding:1.2rem;">
          <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.4rem;">
            <span style="background:var(--highway); color:var(--asphalt); font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">STAGE 1 · TAKING GOODS</span>
            <strong style="font-family:var(--display); font-size:1rem;">Shipper Handover Verification</strong>
          </div>
          <p class="text-soft mb-2" style="font-size:.85rem;">
            Inspect cargo packaging, load into truck bed, and ask the shipper for their 4-digit <strong>Pickup OTP</strong> (Shipper Pass: <span style="font-family:var(--mono); font-weight:700; color:var(--asphalt);">${m.pickupOtp || '1234'}</span>).
          </p>
          <div class="rf-otp-box" style="display:flex; gap:.5rem; max-width:360px;">
            <input id="pickupOtpInput" maxlength="4" placeholder="4-digit OTP" style="font-family:var(--mono); font-size:1.15rem; text-align:center; letter-spacing:4px; font-weight:700;" value="${m.pickupOtp || ''}">
            <button class="btn btn-primary btn-sm" id="verifyPickupOtpBtn" style="white-space:nowrap;">Verify & Load Goods</button>
          </div>
        </div>` : ''}

      ${otpPending || m.status === 'arrived' ? `
        <div class="panel panel--accent mt-3" style="background:var(--paper); border:2px solid var(--milestone); border-radius:var(--radius-m); padding:1.2rem;">
          <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.4rem;">
            <span style="background:var(--milestone); color:#fff; font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">STAGE 2 · GIVING GOODS</span>
            <strong style="font-family:var(--display); font-size:1rem;">Receiver Delivery Handover Verification</strong>
          </div>
          <p class="text-soft mb-2" style="font-size:.85rem;">
            Unload cargo, let the consignee/receiver inspect goods, and ask for their 4-digit <strong>Delivery OTP</strong> (Receiver Pass: <span style="font-family:var(--mono); font-weight:700; color:var(--asphalt);">${(m.pod && m.pod.otp) || m.deliveryOtp || '4372'}</span>).
          </p>
          <div class="rf-otp-box" style="display:flex; gap:.5rem; max-width:360px;">
            <input id="otpInput" maxlength="4" placeholder="4-digit OTP" style="font-family:var(--mono); font-size:1.15rem; text-align:center; letter-spacing:4px; font-weight:700;" value="${(m.pod && m.pod.otp) || m.deliveryOtp || ''}">
            <button class="btn btn-primary btn-sm" id="completeBtn" style="white-space:nowrap;">Complete Road Consignment</button>
          </div>
        </div>` : ''}

      ${m.status === 'in_transit' || m.status === 'arrived' ? `
        <div class="waybill-actions mt-3">
          <button class="btn btn-outline btn-sm photo-btn" data-type="pickup" ${hasPickup ? 'disabled' : ''}>${hasPickup ? '✓ Pickup photo added' : 'Add pickup photo'}</button>
          <button class="btn btn-outline btn-sm photo-btn" data-type="delivery" ${hasDelivery ? 'disabled' : ''}>${hasDelivery ? '✓ Delivery photo added' : 'Add delivery photo'}</button>
        </div>` : ''}

      ${renderPrimaryAction(m, readiness, started, otpPending)}

      ${m.status === 'delivered' ? `
        <div class="panel panel--accent mt-3">
          <strong>Road consignment complete.</strong>
          <p class="mb-0">Extra road transport income from this trip: <strong>${UI.money(m.price)}</strong></p>
          <a class="btn btn-outline btn-sm mt-2" href="matched-loads.html">Back to road trips</a>
        </div>` : ''}
    `;

    const startBtn = document.getElementById('startTripBtn');
    if (startBtn) startBtn.addEventListener('click', () => { sessionStorage.setItem(startedKey, '1'); render(); });

    const verifyPickupOtpBtn = document.getElementById('verifyPickupOtpBtn');
    if (verifyPickupOtpBtn) {
      verifyPickupOtpBtn.addEventListener('click', async () => {
        const val = document.getElementById('pickupOtpInput').value.trim();
        if (!val) { UI.toast('Enter the 4-digit Pickup OTP.', 'error'); return; }
        const res = await Api.verifyPickupOtp(m.id, val, 'Origin Loading Dock');
        if (res.ok) {
          UI.toast('✓ Pickup OTP verified! Goods loaded safely.');
          await render();
        } else {
          UI.toast(res.error || 'Incorrect OTP', 'error');
        }
      });
    }

    const transitBtn = document.getElementById('markTransitBtn');
    if (transitBtn) transitBtn.addEventListener('click', async () => { await Api.startTransit(m.id); UI.toast('Marked in transit — safe driving.'); await render(); });

    const arriveBtn = document.getElementById('markArrivedBtn');
    if (arriveBtn) arriveBtn.addEventListener('click', async () => {
      await Api.markArrived(m.id);
      await Api.initiateDelivery(m.id);
      UI.toast('Marked arrived at destination. Delivery OTP generated.');
      await render();
    });

    const verifyBtn = document.getElementById('verifyDeliveryBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', async () => {
      const res = await Api.initiateDelivery(m.id);
      if (res.ok) UI.toast('Delivery OTP generated: ' + res.otp);
      else UI.toast(res.error, 'error');
      await render();
    });

    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) completeBtn.addEventListener('click', async () => {
      const val = document.getElementById('otpInput').value.trim();
      if (!val) return;
      const res = await Api.verifyDeliveryOtp(m.id, val, m.customer.name);
      if (res.ok) { UI.toast('✓ Delivery OTP verified! Road consignment completed.'); await render(); }
      else UI.toast(res.error, 'error');
    });

    document.querySelectorAll('.photo-btn').forEach(b => b.addEventListener('click', async () => {
      if (b.disabled) return;
      const label = window.prompt('Describe the ' + b.dataset.type + ' photo (e.g. location, timestamp):', b.dataset.type === 'pickup' ? 'Loaded at origin warehouse' : 'Delivered at destination');
      if (!label) return;
      await Api.addTripPhoto(m.id, b.dataset.type, label);
      UI.toast('Photo uploaded for review.');
      await render();
    }));
  }

  function renderPrimaryAction(m, readiness, started, otpPending) {
    if (m.status === 'accepted' && !started) {
      return `<button class="btn btn-primary rf-active-action" id="startTripBtn" ${!readiness.ready ? 'disabled' : ''}>START ROAD TRIP</button>${!readiness.ready ? '<p class="text-soft" style="font-size:.8rem;">Complete the readiness checklist above to start.</p>' : ''}`;
    }
    if (m.status === 'pickup_confirmed') {
      return `<button class="btn btn-primary rf-active-action" id="markTransitBtn">MARK IN TRANSIT (DEPART FOR HIGHWAY)</button>`;
    }
    if (m.status === 'in_transit') {
      return `<button class="btn btn-primary rf-active-action" id="markArrivedBtn">MARK ARRIVED AT DESTINATION</button>`;
    }
    if (m.status === 'arrived' && !otpPending) {
      return `<button class="btn btn-primary rf-active-action" id="verifyDeliveryBtn">GENERATE DELIVERY OTP</button>`;
    }
    return '';
  }
}
