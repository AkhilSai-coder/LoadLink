const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'my-loads.html', root: '../../', user });

  const loadId = new URLSearchParams(window.location.search).get('id');
  let load = null;

  // City coordinate registry for Indian Road Freight Corridors
  const CITY_COORDS = {
    'vijayawada': [16.5062, 80.6480],
    'hyderabad': [17.3850, 78.4867],
    'nagpur': [21.1458, 79.0882],
    'mumbai': [19.0760, 72.8777],
    'pune': [18.5204, 73.8567],
    'nashik': [19.9975, 73.7898],
    'surat': [21.1702, 72.8311],
    'delhi': [28.6139, 77.2090],
    'jaipur': [26.9124, 75.7873],
    'bengaluru': [12.9716, 77.5946],
    'bangalore': [12.9716, 77.5946],
    'chennai': [13.0827, 80.2707],
    'kolkata': [22.5726, 88.3639],
    'ahmedabad': [23.0225, 72.5714],
    'chandigarh': [30.7333, 76.7794],
    'lucknow': [26.8467, 80.9462],
    'bhopal': [23.2599, 77.4126],
    'indore': [22.7196, 75.8577],
    'visakhapatnam': [17.6868, 83.2185],
    'vizag': [17.6868, 83.2185]
  };

  function getCityCoord(cityName) {
    if (!cityName) return [17.3850, 78.4867];
    const clean = cityName.split(',')[0].trim().toLowerCase();
    return CITY_COORDS[clean] || [17.3850, 78.4867];
  }

  function getHaversineDistance(c1, c2) {
    const R = 6371;
    const dLat = (c2[0] - c1[0]) * Math.PI / 180;
    const dLng = (c2[1] - c1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(45, Math.round(R * c * 1.22));
  }

  function buildCorridorRoute(originCoord, destCoord) {
    const points = [];
    const count = 12;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const jitter = Math.sin(t * Math.PI) * 0.12;
      const lat = originCoord[0] + (destCoord[0] - originCoord[0]) * t + jitter;
      const lng = originCoord[1] + (destCoord[1] - originCoord[1]) * t + jitter;
      points.push([lat, lng]);
    }
    return points;
  }

  async function init() {
    load = await Api.getLoad(loadId);
    if (!load || load.customerId !== user.id) {
      document.querySelector('.main-content').innerHTML = '<div class="empty-state panel"><h3>Load not found</h3><p>This load doesn\'t exist or isn\'t yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>';
    } else {
      await renderAll();
    }
  }

  async function renderAll() {
    load = await Api.getLoad(loadId);
    renderHead();
    renderActions();
    await renderCorridorMap();
    await renderMatchOrTrip();
  }

  function renderHead() {
    document.getElementById('loadHead').innerHTML = `
      <div class="waybill-top" style="margin-top:1em;">
        <h1 class="mb-0">${UI.escapeHtml(load.material)}</h1>
        <span class="stamp ${UI.stampClass(load.status)}">${UI.statusLabel[load.status]}</span>
      </div>
      <div class="route mt-2"><span class="pt">${UI.escapeHtml(load.origin)}</span><span class="line"></span><span class="pt">${UI.escapeHtml(load.destination)}</span></div>
      <div class="waybill-meta">
        <span>Cargo <strong>${load.weightTons}${load.unit || 'T'}</strong></span>
        <span>Pickup <strong>${UI.date(load.pickupDate)}</strong></span>
        <span>Target Budget <strong>${UI.money(load.budget)}</strong></span>
        <span>WAYBILL <strong>${load.id.toUpperCase()}</strong></span>
      </div>
      ${load.notes ? `<p class="text-soft">${UI.escapeHtml(load.notes)}</p>` : ''}
    `;
  }

  function renderActions() {
    const wrap = document.getElementById('loadActions');
    let html = '';
    if (load.status === 'draft') {
      html += `<button class="btn btn-primary" id="publishBtn">Publish load</button>`;
    }
    if (load.status === 'draft' || load.status === 'open') {
      html += `<button class="btn btn-danger" id="cancelBtn">Cancel load</button>`;
    }
    wrap.innerHTML = html;
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) publishBtn.addEventListener('click', async () => {
      await Api.publishLoad(load.id);
      UI.toast('Load published — LoadLink is matching it against live backhaul capacity now.');
      renderAll();
    });
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', async () => {
      if (!UI.confirmAction('Cancel this load? This can\'t be undone.')) return;
      await Api.cancelLoad(load.id);
      UI.toast('Load cancelled.');
      renderAll();
    });
  }

  async function renderCorridorMap() {
    const mapSection = document.getElementById('loadRouteSection');
    if (!mapSection) return;

    const originCoord = getCityCoord(load.origin);
    const destCoord = getCityCoord(load.destination);
    const corridorKm = getHaversineDistance(originCoord, destCoord);

    // Determine detour deviation
    let detourKm = 0;
    let match = null;
    if (load.matchId) {
      match = await Api.getMatch(load.matchId);
      if (match && match.detourKm != null) {
        detourKm = Number(match.detourKm);
      }
    } else if (load.status === 'open') {
      const candidates = await Api.findMatchesForLoad(load.id);
      if (candidates && candidates.length && candidates[0].detourKm != null) {
        detourKm = Number(candidates[0].detourKm);
      }
    }

    const hasDetour = detourKm > 0;
    const detourCost = Math.round(detourKm * 24);
    const efficiencyPct = hasDetour ? Math.max(88, Math.round(100 - (detourKm / corridorKm * 100 * 2.5))) : 100;

    mapSection.innerHTML = `
      <div class="panel" style="padding:1.2rem; background:var(--paper); border:1px solid var(--concrete-2); border-radius:var(--radius-m); box-shadow:0 2px 10px rgba(0,0,0,0.03);">
        <div class="flex-between" style="flex-wrap:wrap; gap:.6rem; margin-bottom:.8rem;">
          <div>
            <span class="eyebrow-marker" style="margin-bottom:.2rem;">NATIONAL HIGHWAY FREIGHT CORRIDOR TELEMETRICS</span>
            <h2 style="margin:.2rem 0; font-family:var(--display); font-size:1.3rem;">Corridor Route & Detour Deviation Map</h2>
          </div>
          <div style="display:flex; gap:.6rem; align-items:center; flex-wrap:wrap;">
            <span class="stamp stamp-active" style="display:inline-flex; align-items:center; gap:5px; font-size:.78rem;">
              <span style="width:8px; height:8px; border-radius:50%; background:var(--asphalt); display:inline-block;"></span>
              Expressway Corridor
            </span>
            ${hasDetour ? `
              <span class="stamp" style="display:inline-flex; align-items:center; gap:5px; font-size:.78rem; background:rgba(228,85,43,0.12); color:var(--milestone); border:1px dashed var(--milestone);">
                <span style="width:8px; height:8px; border-radius:50%; background:var(--milestone); display:inline-block;"></span>
                Pickup Detour (+${detourKm} km)
              </span>
            ` : `
              <span class="stamp stamp-delivered" style="font-size:.78rem;">
                Direct Trunk Route (0 km detour)
              </span>
            `}
          </div>
        </div>

        <div id="routeMapCanvas" style="height:320px; width:100%; border-radius:var(--radius-s); border:1px solid var(--concrete-2); overflow:hidden; z-index:1; position:relative;"></div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; margin-top:1rem; background:var(--concrete); padding:.8rem 1rem; border-radius:var(--radius-s); font-family:var(--mono); font-size:.85rem;">
          <div>
            <span class="text-soft" style="display:block; font-size:.7rem; letter-spacing:0.5px;">ESTIMATED CORRIDOR HAUL</span>
            <strong style="color:var(--asphalt); font-size:1rem;">~${corridorKm} KM</strong>
          </div>
          <div>
            <span class="text-soft" style="display:block; font-size:.7rem; letter-spacing:0.5px;">ROUTE DEVIATION / DETOUR</span>
            <strong style="color:${hasDetour ? 'var(--milestone)' : 'var(--signal)'}; font-size:1rem;">${hasDetour ? `+${detourKm} km` : '0.0 km (Direct)'}</strong>
          </div>
          <div>
            <span class="text-soft" style="display:block; font-size:.7rem; letter-spacing:0.5px;">DETOUR COST ALLOWANCE</span>
            <strong style="color:var(--asphalt); font-size:1rem;">${hasDetour ? `₹${detourCost} (Included)` : '₹0 (On-Corridor)'}</strong>
          </div>
          <div>
            <span class="text-soft" style="display:block; font-size:.7rem; letter-spacing:0.5px;">ROUTE EFFICIENCY</span>
            <strong style="color:var(--signal); font-size:1rem;">${efficiencyPct}% ALIGNED</strong>
          </div>
        </div>

        <div class="mt-2" style="font-size:.82rem; color:var(--steel);">
          ${hasDetour ? `
            <strong>Backhaul Route Deviation:</strong> The driver diverts <strong>+${detourKm} km</strong> from the national highway interchange directly to your pickup location dock. This deviation is calibrated in the LoadLink match score (detour breakdown) and compensated in the fair freight rate without empty deadhead miles.
          ` : `
            <strong>Direct Corridor Alignment:</strong> Both pickup and delivery locations lie directly along the driver's planned backhaul transit corridor with <strong>zero detour penalty</strong>.
          `}
        </div>
      </div>
    `;

    // Initialize Leaflet Map
    if (typeof L === 'undefined') return;

    if (window._loadDetailMap) {
      try { window._loadDetailMap.remove(); } catch (e) {}
      window._loadDetailMap = null;
    }

    const map = L.map('routeMapCanvas', { zoomControl: true, scrollWheelZoom: false });
    window._loadDetailMap = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    }).addTo(map);

    const corridorPoints = buildCorridorRoute(originCoord, destCoord);

    // Main Trunk Corridor Polyline
    L.polyline(corridorPoints, {
      color: '#14171C',
      weight: 5,
      opacity: 0.9,
      smoothFactor: 1
    }).addTo(map);

    // Origin Marker
    L.circleMarker(originCoord, {
      radius: 8,
      fillColor: '#2E7D5B',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map).bindPopup(`<strong>Origin: ${UI.escapeHtml(load.origin)}</strong><br>Consignment Pickup Point`);

    // Destination Marker
    L.circleMarker(destCoord, {
      radius: 8,
      fillColor: '#E4552B',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map).bindPopup(`<strong>Destination: ${UI.escapeHtml(load.destination)}</strong><br>Consignment Delivery Point`);

    const allPointsToFit = [originCoord, destCoord];

    // If there is detour deviation, plot divergence point and detour path
    if (hasDetour) {
      const divIdx = Math.max(1, Math.min(corridorPoints.length - 2, Math.floor(corridorPoints.length * 0.25)));
      const divPoint = corridorPoints[divIdx];
      const offsetFactor = Math.min(0.2, 0.04 + (detourKm * 0.015));
      const detourPoint = [divPoint[0] + offsetFactor, divPoint[1] - (offsetFactor * 0.8)];

      // Detour polyline (dashed milestone color)
      L.polyline([divPoint, detourPoint], {
        color: '#E4552B',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.95
      }).addTo(map);

      // Return polyline back to corridor point
      const rejoinIdx = Math.min(corridorPoints.length - 1, divIdx + 1);
      const rejoinPoint = corridorPoints[rejoinIdx];
      L.polyline([detourPoint, rejoinPoint], {
        color: '#F5B700',
        weight: 3,
        dashArray: '5, 5',
        opacity: 0.85
      }).addTo(map);

      // Detour Warehouse Marker
      L.marker(detourPoint, {
        icon: L.divIcon({
          className: 'detour-marker',
          html: `<div style="background:var(--milestone); color:#fff; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); border:2px solid #fff;">📍 +${detourKm}km Detour Dock</div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 24]
        })
      }).addTo(map).bindPopup(`<strong>Off-Corridor Pickup Detour</strong><br>Deviation: +${detourKm} km<br>Detour Allowance: ₹${detourCost}`);

      allPointsToFit.push(detourPoint);
    }

    const bounds = L.latLngBounds(allPointsToFit);
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  async function renderMatchOrTrip() {
    const matchWrap = document.getElementById('matchSection');
    const tripWrap = document.getElementById('tripSection');

    if (load.status === 'open') {
      const candidates = await Api.findMatchesForLoad(load.id);
      matchWrap.innerHTML = `<h2>LoadLink matches on this corridor</h2>` + (candidates.length
        ? candidates.map(c => `
          <div class="rf-score-card mb-3">
            <div class="rf-score-ring" style="--pct:${c.matchScore}"><span>${c.matchScore}%</span></div>
            <div style="flex:1; min-width:220px;">
              <div class="flex-between">
                <strong>${c.matchScore}% LOADLINK MATCH</strong>
                <span class="stamp stamp-pending">Available ${UI.date(c.availableDate)}</span>
              </div>
              <div class="route mt-2"><span class="pt">${UI.escapeHtml(c.origin)}</span><span class="line"></span><span class="pt">${UI.escapeHtml(c.destination)}</span></div>
              <div class="waybill-meta">
                <span>${UI.escapeHtml(c.vehicleType)}</span>
                <span>Remaining capacity <strong>${c.remainingTons}${c.unit || 'T'}</strong></span>
                <span>From <strong>${UI.money(c.minPrice)}</strong></span>
                ${c.detourKm != null ? `<span>Detour <strong>+${c.detourKm} km</strong></span>` : ''}
              </div>
              ${UI.capacityBar(c)}
              <div class="rf-score-breakdown">
                <span>Route ${c.matchBreakdown.route}/25</span>
                <span>Capacity ${c.matchBreakdown.capacity}/20</span>
                <span>Time ${c.matchBreakdown.time}/15</span>
                <span>Detour ${c.matchBreakdown.detour}/15</span>
                <span>Vehicle ${c.matchBreakdown.vehicle}/10</span>
                <span>Driver reliability ${c.matchBreakdown.reliability}/15</span>
              </div>
              <p class="text-soft" style="font-size:.72rem; margin-top:.3em;">LoadLink Backhaul Match Engine — deterministic corridor routing.</p>
              <details class="rf-why mt-2">
                <summary>Why this match?</summary>
                <ul>${c.reasons.map(r => `<li>${UI.escapeHtml(r)}</li>`).join('')}</ul>
              </details>
              ${(() => { const p = Api.estimatePriceComparison(Math.max(c.minPrice, load.budget)); return `<div class="mt-2">${UI.renderPriceComparison(p)}</div>`; })()}
              <div class="waybill-actions">
                <button class="btn btn-primary btn-sm request-btn" data-cap="${c.id}" data-price="${Math.max(c.minPrice, load.budget)}" ${!c.fits ? 'disabled' : ''}>Request booking</button>
              </div>
            </div>
          </div>
        `).join('')
        : `<div class="empty-state panel"><h3>No backhaul capacity matched yet</h3><p>We're watching for return trips on this corridor — check back soon.</p></div>`);

      matchWrap.querySelectorAll('.request-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const res = await Api.requestBooking(load.id, btn.dataset.cap, btn.dataset.price);
          if (res.ok) { UI.toast('Booking requested — the driver will review it.'); renderAll(); }
          else UI.toast(res.error, 'error');
        });
      });
      tripWrap.innerHTML = '';
    } else if (load.status === 'requested' && load.matchId) {
      const match = await Api.getMatch(load.matchId);
      matchWrap.innerHTML = `
        <h2>Booking request</h2>
        <div class="panel" style="border-color:var(--amber-600); background:var(--amber-100);">
          <div class="flex-between">
            <div>
              <strong>${match.matchScore}% LOADLINK MATCH</strong> with ${UI.escapeHtml(match.driver.name || 'a driver')}
              <p class="text-soft mb-0">Waiting for the driver to accept or reject your request.</p>
            </div>
            <span class="stamp ${UI.stampClass(match.status)}">${UI.statusLabel[match.status]}</span>
          </div>
        </div>
        <button class="btn btn-danger btn-sm mt-2" id="cancelReqBtn">Cancel request</button>
      `;
      const cancelReqBtn = document.getElementById('cancelReqBtn');
      if (cancelReqBtn) cancelReqBtn.addEventListener('click', async () => {
        await Api.cancelBooking(match.id, 'customer');
        UI.toast('Booking request cancelled.');
        renderAll();
      });
      tripWrap.innerHTML = '';
    } else if (['matched', 'in_transit', 'delivered', 'disputed'].includes(load.status) && load.matchId) {
      const match = await Api.getMatch(load.matchId);
      matchWrap.innerHTML = `
        <h2>Trip Details</h2>
        <div class="panel panel--accent">
          <div class="flex-between">
            <div>
              <strong>${UI.escapeHtml(match.driver.name || 'Driver')}</strong>
              <p class="text-soft mb-0">${UI.escapeHtml(match.capacity ? match.capacity.vehicleType : '')} · ${UI.escapeHtml(match.driver.vehicleNumber || '')} · ${UI.escapeHtml(match.driver.phone || '')}</p>
            </div>
            <span class="stamp ${UI.stampClass(match.status)}">${UI.statusLabel[match.status]}</span>
          </div>
          <p class="mt-2 mb-0">Agreed price: <strong>${UI.money(match.price)}</strong> · ${match.matchScore}% match ${match.detourKm != null ? ` · Detour: +${match.detourKm}km` : ''}</p>
        </div>
        <div class="flex-wrap mt-2">
          <a class="btn btn-outline btn-sm" href="consignment-journey.html?id=${match.id}">Open road consignment journey</a>
          <a class="btn btn-outline btn-sm" href="../../track.html?q=${match.id}" target="_blank">Live GPS Radar</a>
          ${match.status !== 'delivered' && match.status !== 'disputed' ? `<button class="btn btn-danger btn-sm" id="disputeBtn">Raise a dispute</button>` : ''}
        </div>

        <h2 class="mt-4">Tracking</h2>
        ${UI.renderTimeline(match.events)}

        ${match.digitalRecord ? await renderDigitalRecordBlock(match) : ''}

        ${match.status === 'arrived' && match.pod && match.pod.otp && !match.pod.otpVerified ? renderOtpBlock(match) : ''}
        ${match.pod && match.pod.otpVerified ? await renderPodBlock(match) : ''}
      `;
      const disputeBtn = document.getElementById('disputeBtn');
      if (disputeBtn) disputeBtn.addEventListener('click', async () => {
        const reason = window.prompt('Briefly describe the issue with this trip:');
        if (!reason) return;
        await Api.raiseDispute(match.id, user.id, reason);
        UI.toast('Dispute raised — our team will review it.');
        await renderAll();
      });
      const otpBtn = document.getElementById('verifyOtpBtn');
      if (otpBtn) otpBtn.addEventListener('click', async () => {
        const val = document.getElementById('otpInput').value.trim();
        if (!val) return;
        const res = await Api.verifyDeliveryOtp(match.id, val, user.name);
        if (res.ok) { UI.toast('OTP verified — shipment marked delivered.'); await renderAll(); }
        else UI.toast(res.error, 'error');
      });

      const photos = Api.getTripPhotos(match.id);
      tripWrap.innerHTML = `
        <h2>Trip photos</h2>
        ${photos.length ? photos.map(p => `
          <div class="panel mt-2 flex-between">
            <div>
              <strong>${p.type === 'pickup' ? 'Pickup proof' : 'Delivery proof'}</strong>
              <p class="text-soft mb-0">${UI.escapeHtml(p.label)} · uploaded ${UI.date(p.uploadedAt)}</p>
            </div>
            <span class="stamp ${UI.stampClass(p.reviewStatus)}">${UI.statusLabel[p.reviewStatus] || p.reviewStatus}</span>
          </div>
        `).join('') : `<p class="text-soft">No photos uploaded yet.</p>`}
      `;
    } else {
      matchWrap.innerHTML = '';
      tripWrap.innerHTML = '';
    }
  }

  async function renderDigitalRecordBlock(match) {
    const rec = await Api.getDigitalRecord(match.id);
    if (!rec) return '';
    return `
      <h2 class="mt-4">Digital Logistics Record</h2>
      <div class="rf-record">
        <div class="rf-record-head">
          <span class="rf-record-id">${rec.consignmentId}</span>
          <div class="rf-qr" title="Digital Logistics Record"></div>
        </div>
        <div class="rf-record-grid">
          <span class="k">Booking ID</span><span class="v">${rec.bookingId}</span>
          <span class="k">Customer</span><span class="v">${UI.escapeHtml(rec.customer || '')}</span>
          <span class="k">Driver</span><span class="v">${UI.escapeHtml(rec.driver || '')}</span>
          <span class="k">Vehicle</span><span class="v">${UI.escapeHtml(rec.vehicle || '')}</span>
          <span class="k">Goods</span><span class="v">${UI.escapeHtml(rec.goods || '')}</span>
          <span class="k">Weight</span><span class="v">${rec.weight}</span>
          <span class="k">Pickup</span><span class="v">${UI.escapeHtml(rec.pickup || '')}</span>
          <span class="k">Drop</span><span class="v">${UI.escapeHtml(rec.drop || '')}</span>
          <span class="k">Price</span><span class="v">${UI.money(rec.price)}</span>
          <span class="k">Created</span><span class="v">${UI.date(rec.createdAt)}</span>
        </div>
        <div class="rf-record-foot">Digital Logistics Record generated by LoadLink. This does not replace legally required government transport documents.</div>
      </div>`;
  }

  function renderOtpBlock(match) {
    return `
      <h2 class="mt-4">Verify delivery</h2>
      <div class="panel panel--accent">
        <p>The driver has arrived. Enter the OTP shared by the driver to confirm receipt.</p>
        <div class="rf-otp-box">
          <input id="otpInput" maxlength="4" placeholder="0000">
          <button class="btn btn-primary btn-sm" id="verifyOtpBtn">Verify & confirm delivery</button>
        </div>
      </div>`;
  }

  async function renderPodBlock(match) {
    const pod = await Api.getPOD(match.id);
    if (!pod) return '';
    return `
      <h2 class="mt-4">Proof of Delivery</h2>
      <div class="rf-record">
        <div class="rf-record-head">
          <span class="rf-record-id">${pod.podId}</span>
          <div class="rf-qr" title="Proof of Delivery"></div>
        </div>
        <div class="rf-record-grid">
          <span class="k">Consignment ID</span><span class="v">${pod.consignmentId || '—'}</span>
          <span class="k">Delivery time</span><span class="v">${UI.date(pod.deliveryTime)}</span>
          <span class="k">Delivery location</span><span class="v">${UI.escapeHtml(pod.deliveryLocation || '')}</span>
          <span class="k">Receiver</span><span class="v">${UI.escapeHtml(pod.receiverName || '')}</span>
          <span class="k">Driver</span><span class="v">${UI.escapeHtml(pod.driver || '')}</span>
          <span class="k">Vehicle</span><span class="v">${UI.escapeHtml(pod.vehicle || '')}</span>
        </div>
      </div>`;
  }

  init();
}
