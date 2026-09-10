const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'my-loads.html', root: '../../', user });

  const matchId = new URLSearchParams(window.location.search).get('id');

  async function init() {
    const match = matchId ? await Api.getMatch(matchId) : null;
    if (!match || match.customerId !== user.id) {
      document.getElementById('journeyRoot').innerHTML = `<div class="empty-state panel"><h3>Consignment not found</h3><p>This road consignment doesn't exist or isn't yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>`;
    } else {
      document.getElementById('backLink').href = 'load-detail.html?id=' + match.loadId;
      await render();
    }
  }

  async function render() {
    const m = await Api.getMatch(matchId);
    const headline = UI.STAGE_HEADLINES[m.status] || 'ROAD CONSIGNMENT JOURNEY';
    const pc = Api.estimatePriceComparison(m.price);
    const track = m.digitalRecord ? await Api.trackConsignment(m.digitalRecord.consignmentId) : null;
    const ratingHtml = m.status === 'delivered' ? await renderRatingBlock(m) : '';

    const originCoord = getCityCoord(m.load ? m.load.origin : 'Vijayawada');
    const destCoord = getCityCoord(m.load ? m.load.destination : 'Hyderabad');
    const speed = (m.status === 'in_transit') ? (52 + (m.id.charCodeAt(m.id.length - 1) % 16)) : 0;
    const nextToll = (m.status === 'in_transit') ? (12 + (m.id.length % 15)) : 0;
    const highway = (m.load && m.load.origin.toLowerCase().includes('vijayawada')) ? 'NH-65 Corridor' : 'National Highway Corridor';

    document.getElementById('journeyRoot').innerHTML = `
      <div class="rf-story">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.8em;">
          <h3 style="margin:0;">${headline}</h3>
          <div class="ll-map-header-badge"><span class="nav-live-dot"></span> LIVE TELEMATICS</div>
        </div>
        <div class="rf-journey-route mt-2">
          ${(track ? track.waypoints : [m.load ? m.load.origin.split(',')[0] : 'Origin', 'En route', m.load ? m.load.destination.split(',')[0] : 'Destination']).map((w, i, arr) => `
            <span class="stop" style="color:#fff;">${w}</span>
            ${i < arr.length - 1 ? '<span class="arrow" style="color:#00E599;">↓</span>' : ''}
          `).join('')}
        </div>
        <p style="color:#C9D3CD; margin-bottom:0;">Current status: <strong style="color:#00E599;">${(UI.statusLabel[m.status] || m.status).toUpperCase()}</strong>${m.status !== 'delivered' && track ? ` · ETA ${track.etaHours}h` : ''}</p>
      </div>

      <!-- Live Interactive Map -->
      <div class="ll-map-wrapper mt-3">
        <div class="ll-map-header">
          <span>📍 Live Route GPS: <strong>${m.load ? m.load.origin : 'Origin'}</strong> ➔ <strong>${m.load ? m.load.destination : 'Destination'}</strong></span>
          <span style="color:#00D2FF; font-size:.82rem;">${m.capacity ? m.capacity.vehicleType : 'Commercial Freight'}</span>
        </div>
        <div id="leafletMap" style="height:340px;"></div>
        <div class="ll-telematics-hud">
          <div class="ll-telematics-grid">
            <div class="ll-telematics-item">
              <span class="tele-lbl">Vehicle Speed</span>
              <span class="tele-val ${speed > 0 ? 'accent-green' : ''}">${speed > 0 ? speed + ' km/h' : 'Stationary'}</span>
              <span class="tele-sub">${speed > 0 ? 'Cruising highway' : 'At cargo bay'}</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Highway Corridor</span>
              <span class="tele-val accent-blue" style="font-size:.95rem;">${highway}</span>
              <span class="tele-sub">Real-time GPS Fix</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Next Toll Plaza</span>
              <span class="tele-val">${nextToll > 0 ? nextToll + ' km' : 'Clear highway'}</span>
              <span class="tele-sub">FASTag synced</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">ETA to Destination</span>
              <span class="tele-val" style="color:#FFB800;">${m.status === 'delivered' ? 'Delivered' : (track ? track.etaHours : 2) + ' hour(s)'}</span>
              <span class="tele-sub">${m.status === 'delivered' ? 'POD Verified' : 'Corridor schedule'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rapido & Zepto Style Dual-OTP Handover Passes -->
      ${(m.status === 'accepted' || m.status === 'requested') ? `
        <div class="panel mt-3" style="background:var(--paper); border:2px solid var(--highway); border-radius:var(--radius-m); padding:1.2rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.5rem;">
            <div>
              <span style="background:var(--highway); color:var(--asphalt); font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">STAGE 1 · TAKING GOODS PASS</span>
              <h3 style="margin:.3rem 0 .1rem; font-family:var(--display);">Pickup Handover OTP: <span style="font-family:var(--mono); color:var(--asphalt); letter-spacing:4px;">${m.pickupOtp || '1234'}</span></h3>
              <p class="text-soft mb-0" style="font-size:.84rem;">Share this 4-digit code with driver <strong>${UI.escapeHtml(m.driver ? m.driver.name : 'Captain')}</strong> only after your cargo is safely loaded into the vehicle.</p>
            </div>
            <span class="badge badge--warn">Pending Loading</span>
          </div>
        </div>` : ''}

      ${(m.status === 'in_transit' || m.status === 'arrived') ? `
        <div class="panel mt-3" style="background:var(--paper); border:2px solid var(--milestone); border-radius:var(--radius-m); padding:1.2rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:.5rem;">
            <div>
              <span style="background:var(--milestone); color:#fff; font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">STAGE 2 · GIVING GOODS PASS</span>
              <h3 style="margin:.3rem 0 .1rem; font-family:var(--display);">Delivery Handover OTP: <span style="font-family:var(--mono); color:var(--milestone); letter-spacing:4px;">${(m.pod && m.pod.otp) || m.deliveryOtp || '4372'}</span></h3>
              <p class="text-soft mb-0" style="font-size:.84rem;">Share this 4-digit code with the driver only after the receiver unloads and verifies cargo condition.</p>
            </div>
            <span class="badge badge--ok">${m.status === 'arrived' ? 'Vehicle Arrived at Destination' : 'En Route on Highway'}</span>
          </div>
        </div>` : ''}

      <div class="panel mt-3">
        <div class="waybill-meta">
          <span>Consignment ID <strong>${m.digitalRecord ? m.digitalRecord.consignmentId : '—'}</strong></span>
          <span>Driver <strong>${UI.escapeHtml(m.driver ? m.driver.name : '')}</strong></span>
          <span>Vehicle <strong>${UI.escapeHtml(m.capacity ? m.capacity.vehicleType : '')}</strong></span>
          <span>Route <strong>${UI.escapeHtml(m.load ? m.load.origin : '')} → ${UI.escapeHtml(m.load ? m.load.destination : '')}</strong></span>
          <span>Payment status <strong>${m.status === 'delivered' ? 'Trip complete — bill approved' : 'Due on delivery'}</strong></span>
        </div>
      </div>

      <h2 class="mt-4">Journey stages</h2>
      ${UI.renderJourney(m)}

      <h2 class="mt-4">Price comparison</h2>
      ${UI.renderPriceComparison(pc)}

      ${ratingHtml}
    `;

    // Initialize Leaflet Map
    setTimeout(() => {
      initJourneyMap(originCoord, destCoord, m.status, m.capacity ? m.capacity.vehicleType : 'Tata Ace');
    }, 100);

    const pickersWrap = document.getElementById('ratingPickers');
    if (pickersWrap) UI.wireStarPickers(pickersWrap);

    const rateBtn = document.getElementById('submitRatingBtn');
    if (rateBtn) rateBtn.addEventListener('click', async () => {
      const ratingsWrap = document.getElementById('ratingPickers');
      const values = {};
      ratingsWrap.querySelectorAll('.rf-star-picker').forEach(p => { values[p.dataset.name] = Number(p.dataset.value || 0); });
      if (!values.overall) { UI.toast('Please rate your overall experience.', 'error'); return; }
      const review = document.getElementById('reviewText').value.trim();
      const res = await Api.rateTrip(m.id, 'customer', values, review);
      if (res.ok) { UI.toast('Thanks for rating your trip!'); await render(); }
    });
  }

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
    'bengaluru': [12.9716, 77.5946]
  };

  function getCityCoord(cityName) {
    if (!cityName) return [17.3850, 78.4867];
    const clean = cityName.split(',')[0].trim().toLowerCase();
    return CITY_COORDS[clean] || [17.3850, 78.4867];
  }

  let journeyMap = null;
  function initJourneyMap(origin, dest, status, vehicleType) {
    if (journeyMap) { journeyMap.remove(); journeyMap = null; }
    const mapEl = document.getElementById('leafletMap');
    if (!mapEl || !window.L) return;

    const points = [];
    const count = 10;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const jitter = Math.sin(t * Math.PI) * 0.1;
      points.push([origin[0] + (dest[0] - origin[0]) * t + jitter, origin[1] + (dest[1] - origin[1]) * t + jitter]);
    }

    let progressRatio = 0.55;
    if (status === 'requested' || status === 'accepted') progressRatio = 0.05;
    else if (status === 'pickup_confirmed') progressRatio = 0.15;
    else if (status === 'in_transit') progressRatio = 0.6;
    else if (status === 'arrived') progressRatio = 0.92;
    else if (status === 'delivered') progressRatio = 1.0;

    const curIdx = Math.min(Math.floor(progressRatio * (points.length - 1)), points.length - 1);
    const curPos = points[curIdx];

    journeyMap = L.map('leafletMap', { zoomControl: true, attributionControl: false }).setView(curPos, 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(journeyMap);

    const completed = points.slice(0, curIdx + 1);
    const remaining = points.slice(curIdx);
    if (completed.length > 1) L.polyline(completed, { color: '#00E599', weight: 5, opacity: 0.95 }).addTo(journeyMap);
    if (remaining.length > 1) L.polyline(remaining, { color: '#2A5177', weight: 4, opacity: 0.75, dashArray: '6, 8' }).addTo(journeyMap);

    const truckIcon = L.divIcon({
      className: 'll-truck-marker',
      html: `<div class="ll-truck-icon-wrap"><div class="ll-radar-ring"></div><svg class="ll-truck-svg" viewBox="0 0 24 24" fill="#00D2FF" stroke="#061A2B" stroke-width="1.5"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5" fill="#00E599"/><circle cx="18.5" cy="18.5" r="2.5" fill="#00E599"/></svg></div>`,
      iconSize: [44, 44], iconAnchor: [22, 22]
    });
    L.marker(curPos, { icon: truckIcon }).addTo(journeyMap).bindPopup(`<strong>${vehicleType}</strong><br>GPS Tracking Active`).openPopup();
    journeyMap.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }

  async function renderRatingBlock(m) {
    const ratings = await Api.getRatingsForMatch(m.id);
    const mine = ratings ? ratings.customer : null;
    if (mine) {
      return `
        <h2 class="mt-4">Your rating</h2>
        <div class="panel">
          <p class="mb-0">${UI.stars(mine.ratings.overall)} <span class="text-soft">(${mine.ratings.overall}/5 overall)</span></p>
          ${mine.review ? `<p class="text-soft mt-1 mb-0">"${UI.escapeHtml(mine.review)}"</p>` : ''}
        </div>`;
    }
    return `
      <h2 class="mt-4">Rate your experience</h2>
      <div class="panel" id="ratingPickers">
        <div class="field"><label>Driver experience</label>${UI.renderStarPicker('driver')}</div>
        <div class="field"><label>Pickup experience</label>${UI.renderStarPicker('pickup')}</div>
        <div class="field"><label>Delivery experience</label>${UI.renderStarPicker('delivery')}</div>
        <div class="field"><label>Overall experience</label>${UI.renderStarPicker('overall')}</div>
        <div class="field"><label for="reviewText">Short review (optional)</label><textarea id="reviewText" rows="2"></textarea></div>
        <button class="btn btn-primary btn-sm" id="submitRatingBtn">Submit rating</button>
      </div>`;
  }

  init();
}
