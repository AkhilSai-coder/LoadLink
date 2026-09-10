const params = new URLSearchParams(window.location.search);
const prefill = params.get('id');
if (prefill) document.getElementById('consignmentInput').value = prefill;

let liveMap = null;
let markerInterval = null;

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
  'ahmedabad': [23.0225, 72.5714]
};

function getCityCoord(cityName) {
  if (!cityName) return [17.3850, 78.4867];
  const clean = cityName.split(',')[0].trim().toLowerCase();
  return CITY_COORDS[clean] || [17.3850, 78.4867];
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

// ==========================================
// ROLE-ADAPTIVE DASHBOARD ENGINE
// ==========================================
const FLEET_DATA = [
  { id: 'RF-2026-498231', driver: 'Ganesh Kale', truck: 'Tata Ace (AP16 GK 7788)', origin: 'Vijayawada, AP', destination: 'Hyderabad, TS', status: 'in_transit', speed: 56, toll: 'NH-65 Suryapet (14 km)', cargo: 'Handicrafts & Terracotta (200kg)' },
  { id: 'RF-2026-005001', driver: 'Suresh Patil', truck: 'Open Truck 9T (MH12 AB 9012)', origin: 'Nagpur, MH', destination: 'Mumbai, MH', status: 'in_transit', speed: 62, toll: 'Samruddhi Mahamarg (22 km)', cargo: 'Automotive Spares (1.8T)' },
  { id: 'RF-2026-003011', driver: 'Vikram Singh', truck: 'Pickup 1.5T (DL1A 2049)', origin: 'Delhi, DL', destination: 'Jaipur, RJ', status: 'arrived', speed: 0, toll: 'Manesar Plaza (Cleared)', cargo: 'Textile Rolls (750kg)' },
  { id: 'RF-2026-009182', driver: 'Manoj Reddy', truck: 'Container 20ft (KA01 8831)', origin: 'Bengaluru, KA', destination: 'Chennai, TN', status: 'delivered', speed: 0, toll: 'Hosur Toll (Delivered)', cargo: 'Industrial Electronics (3.2T)' }
];

let activeRole = 'public';
const sessionUser = (window.Api && Api.getSession) ? Api.getSession() : null;
if (sessionUser && sessionUser.role) {
  activeRole = sessionUser.role;
}

function updateRoleBadge(role) {
  const badge = document.getElementById('currentRoleBadge');
  const roleNames = {
    admin: '🛡️ Admin / Manager Fleet View',
    driver: '🚚 Driver Live Location View',
    customer: '📦 Customer Load Tracking',
    public: '🔍 Public Tracking'
  };
  badge.textContent = roleNames[role] || 'Public View';

  document.querySelectorAll('.role-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
    if (btn.dataset.role === role) {
      btn.style.background = 'var(--highway)';
      btn.style.color = 'var(--asphalt)';
      btn.style.borderColor = 'var(--highway)';
      btn.style.fontWeight = '700';
    } else {
      btn.style.background = 'none';
      btn.style.color = '#C7CCD4';
      btn.style.borderColor = 'rgba(255,255,255,0.2)';
      btn.style.fontWeight = '500';
    }
  });
}

function renderRoleSection(role) {
  const container = document.getElementById('roleDashboardSection');
  if (!container) return;

  if (role === 'admin') {
    container.innerHTML = `
      <div class="dash-hero-glass" style="margin-bottom:1rem; padding:1.2rem 1.4rem;">
        <div class="dash-hero-content">
          <div class="dash-hero-meta">
            <span class="dash-role-badge">Fleet Ops Map</span>
            <span class="dash-status-pill"><span class="dash-pulse-dot"></span> 4 Return Trucks Live on Highway</span>
          </div>
          <h2 style="color:#fff; font-family:var(--display); margin:.4rem 0 .2rem;">Live Trucks on National Highways</h2>
          <p style="color:#C9D3CD; font-size:.85rem; margin-bottom:.8rem;">
            Real-time GPS tracking on major highways. Click any truck below to see its route, speed, and status.
          </p>
          <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
            ${FLEET_DATA.map(f => `
              <button type="button" class="btn btn-sm btn-outline fleet-select-btn" data-id="${f.id}" style="border-color:rgba(0,210,255,.4); color:#fff; font-size:.78rem; font-family:var(--mono);">
                🚛 ${f.truck.split(' ')[0]} ${f.truck.split('(')[1].replace(')', '')} &middot; ${f.origin.split(',')[0]} ➔ ${f.destination.split(',')[0]}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="dash-hero-actions">
          <a class="btn btn-primary btn-sm" href="pages/admin/dashboard.html">Admin Hub →</a>
        </div>
      </div>
    `;
    container.querySelectorAll('.fleet-select-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.getElementById('consignmentInput').value = b.dataset.id;
        renderTrack(b.dataset.id);
      });
    });
  } else if (role === 'driver') {
    const defaultConsignment = 'RF-2026-498231';
    container.innerHTML = `
      <div class="panel" style="background:var(--asphalt-2); border:1px solid var(--highway); color:#fff; border-radius:var(--radius-m); padding:1.2rem;">
        <div class="flex-between" style="flex-wrap:wrap; gap:.8rem;">
          <div>
            <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.3rem;">
              <span style="background:var(--highway); color:var(--asphalt); font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">DRIVER CABIN SCREEN</span>
              <strong style="font-family:var(--display); font-size:1.05rem;">Ganesh Kale &middot; Tata Ace (AP16 GK 7788)</strong>
            </div>
            <p style="color:#C9D3CD; font-size:.85rem; margin-bottom:0;">
              Route: <strong>Vijayawada, AP ➔ Hyderabad, TS</strong> &middot; Next Toll: <strong>NH-65 Suryapet (14 km)</strong> &middot; FASTag Ready
            </p>
          </div>
          <div style="display:flex; gap:.5rem;">
            <button class="btn btn-sm btn-primary" onclick="quickTrack('${defaultConsignment}')">View My Route</button>
            <a class="btn btn-sm btn-outline" style="color:#fff; border-color:rgba(255,255,255,.3);" href="pages/driver/active-trip.html">Current Trip Page →</a>
          </div>
        </div>
      </div>
    `;
  } else if (role === 'customer') {
    container.innerHTML = `
      <div class="panel" style="background:var(--asphalt-2); border:1px solid rgba(0,229,153,0.3); color:#fff; border-radius:var(--radius-m); padding:1.2rem;">
        <div class="flex-between" style="flex-wrap:wrap; gap:.8rem;">
          <div>
            <div style="display:flex; align-items:center; gap:.5rem; margin-bottom:.3rem;">
              <span style="background:var(--signal); color:#fff; font-weight:700; font-size:.7rem; padding:2px 6px; border-radius:4px; font-family:var(--mono);">CUSTOMER GOODS TRACKER</span>
              <strong style="font-family:var(--display); font-size:1.05rem;">Priya Nair &middot; Nair Textiles Pvt Ltd</strong>
            </div>
            <p style="color:#C9D3CD; font-size:.85rem; margin-bottom:0;">
              Your booked goods are currently moving on the highway. Choose one to track:
            </p>
          </div>
          <a class="btn btn-sm btn-outline" style="color:#fff; border-color:rgba(255,255,255,.3);" href="pages/customer/my-loads.html">My Bookings →</a>
        </div>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.8rem;">
          <button class="btn btn-sm btn-navy cust-quick-track" data-id="RF-2026-498231" style="font-size:.8rem; font-family:var(--mono);">
            📦 RF-2026-498231 (Handicrafts &middot; Moving)
          </button>
          <button class="btn btn-sm btn-navy cust-quick-track" data-id="RF-2026-005001" style="font-size:.8rem; font-family:var(--mono);">
            📦 RF-2026-005001 (Auto Spares &middot; Moving)
          </button>
        </div>
      </div>
    `;
    container.querySelectorAll('.cust-quick-track').forEach(b => {
      b.addEventListener('click', () => {
        document.getElementById('consignmentInput').value = b.dataset.id;
        renderTrack(b.dataset.id);
      });
    });
  } else {
    container.innerHTML = '';
  }
}

function setRole(role) {
  activeRole = role;
  updateRoleBadge(role);
  renderRoleSection(role);
  if (role === 'admin') {
    renderAdminFleetView();
  } else if (role === 'driver') {
    document.getElementById('consignmentInput').value = 'RF-2026-498231';
    renderTrack('RF-2026-498231');
  } else if (role === 'customer') {
    document.getElementById('consignmentInput').value = 'RF-2026-498231';
    renderTrack('RF-2026-498231');
  }
}

document.querySelectorAll('.role-switch-btn').forEach(btn => {
  btn.addEventListener('click', () => setRole(btn.dataset.role));
});

// ==========================================
// ADMIN MULTI-FLEET RADAR MAP VIEW
// ==========================================
function renderAdminFleetView() {
  if (markerInterval) clearInterval(markerInterval);
  const wrap = document.getElementById('trackResult');
  wrap.innerHTML = `
    <div class="rf-record">
      <div class="rf-record-head">
        <div>
          <span class="rf-record-id">ALL TRUCKS ON MAP</span>
          <span class="stamp stamp-ok">4 TRUCKS ON THE ROAD</span>
        </div>
        <div class="ll-map-header-badge">
          <span class="nav-live-dot"></span> LIVE GPS ACTIVE
        </div>
      </div>

      <div class="ll-map-wrapper">
        <div class="ll-map-header">
          <span>🛰️ Real-Time Highway Routes (NH-44 &middot; NH-65 &middot; Samruddhi)</span>
          <span style="color:#00D2FF; font-size:.8rem;">4 Trucks Live on Map</span>
        </div>
        <div id="leafletMap" style="height:420px;"></div>
        <div class="ll-telematics-hud">
          <div class="ll-telematics-grid">
            <div class="ll-telematics-item">
              <span class="tele-lbl">Active Trucks</span>
              <span class="tele-val accent-green">4 Trucks</span>
              <span class="tele-sub">No road issues</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Total Trip Money</span>
              <span class="tele-val accent-blue">₹73,200</span>
              <span class="tele-sub">Live trip bookings</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">FASTag Toll Status</span>
              <span class="tele-val">100% Paid</span>
              <span class="tele-sub">Zero toll wait</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Diesel Saved</span>
              <span class="tele-val" style="color:#FFB800;">412 Litres</span>
              <span class="tele-sub">Return space filled</span>
            </div>
          </div>
        </div>
      </div>

      <div class="table-scroll mt-3">
        <table class="ledger">
          <thead>
            <tr><th>Tracking ID</th><th>Driver &amp; Truck</th><th>Route</th><th>Status</th><th>Speed</th><th>Next Toll Gate</th><th>Action</th></tr>
          </thead>
          <tbody>
            ${FLEET_DATA.map(f => `
              <tr>
                <td><strong style="font-family:var(--mono); color:var(--asphalt);">${f.id}</strong></td>
                <td><strong>${f.driver}</strong><br><small class="text-soft">${f.truck}</small></td>
                <td>${f.origin.split(',')[0]} ➔ ${f.destination.split(',')[0]}</td>
                <td><span class="stamp ${UI.stampClass(f.status)}">${(UI.statusLabel[f.status] || f.status).toUpperCase()}</span></td>
                <td><strong style="font-family:var(--mono); color:${f.speed > 0 ? '#10B981' : '#8A93A0'}">${f.speed > 0 ? f.speed + ' km/h' : '0 km/h'}</strong></td>
                <td style="font-size:.82rem;">${f.toll}</td>
                <td><button class="btn btn-sm btn-navy" onclick="quickTrack('${f.id}')">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (liveMap) { liveMap.remove(); liveMap = null; }
    const mapEl = document.getElementById('leafletMap');
    if (!mapEl || !window.L) return;

    liveMap = L.map('leafletMap', { zoomControl: true, attributionControl: false }).setView([19.0, 78.5], 6);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(liveMap);

    const bounds = L.latLngBounds([]);

    FLEET_DATA.forEach(f => {
      const orig = getCityCoord(f.origin);
      const dest = getCityCoord(f.destination);
      bounds.extend(orig); bounds.extend(dest);

      const routeCoords = buildCorridorRoute(orig, dest);
      L.polyline(routeCoords, { color: '#2A5177', weight: 3, opacity: 0.6, dashArray: '5, 8' }).addTo(liveMap);

      const midIdx = Math.floor(routeCoords.length * (f.status === 'delivered' ? 0.95 : 0.55));
      const truckPos = routeCoords[midIdx];

      const truckIcon = L.divIcon({
        className: 'll-truck-marker',
        html: `
          <div class="ll-truck-icon-wrap">
            <div class="ll-radar-ring" style="border-color:${f.speed > 0 ? '#00E599' : '#F5B700'};"></div>
            <svg class="ll-truck-svg" viewBox="0 0 24 24" fill="${f.speed > 0 ? '#00D2FF' : '#F5B700'}" stroke="#061A2B" stroke-width="1.5">
              <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5" fill="#00E599"/><circle cx="18.5" cy="18.5" r="2.5" fill="#00E599"/>
            </svg>
          </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      L.marker(truckPos, { icon: truckIcon }).addTo(liveMap)
        .bindPopup(`<strong>${f.id}</strong><br>${f.driver} (${f.truck})<br>Speed: ${f.speed} km/h<br>${f.origin.split(',')[0]} ➔ ${f.destination.split(',')[0]}`);
    });

    liveMap.fitBounds(bounds, { padding: [50, 50] });
  }, 100);
}

// ==========================================
// SINGLE CONSIGNMENT TRACKING VIEW
// ==========================================
document.getElementById('trackForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('consignmentInput').value.trim();
  if (!id) return;
  await renderTrack(id);
});

window.renderTrack = async function(id) {
  if (markerInterval) clearInterval(markerInterval);
  const result = await Api.trackConsignment(id);
  const wrap = document.getElementById('trackResult');
  if (!result) {
    wrap.innerHTML = `<div class="empty-state panel"><h3>Tracking ID not found</h3><p>Please double check the ID (e.g. <strong>RF-2026-005001</strong>) and try again.</p></div>`;
    return;
  }

  const originCoord = getCityCoord(result.origin);
  const destCoord = getCityCoord(result.destination);
  const routeCoords = buildCorridorRoute(originCoord, destCoord);

  let progressRatio = 0.55;
  if (result.status === 'requested' || result.status === 'accepted') progressRatio = 0.05;
  else if (result.status === 'pickup_confirmed') progressRatio = 0.12;
  else if (result.status === 'in_transit') progressRatio = 0.58;
  else if (result.status === 'arrived') progressRatio = 0.92;
  else if (result.status === 'delivered') progressRatio = 1.0;

  const currentIdx = Math.min(Math.floor(progressRatio * (routeCoords.length - 1)), routeCoords.length - 1);
  const currentPos = routeCoords[currentIdx];

  const speed = (result.status === 'in_transit') ? (54 + Math.floor((id.charCodeAt(0) % 15))) : 0;
  const nextTollDist = (result.status === 'in_transit') ? (14 + (id.length % 18)) : 0;
  const highwayName = (result.origin.toLowerCase().includes('vijayawada') || result.destination.toLowerCase().includes('hyderabad')) 
    ? 'NH-65 Highway' 
    : (result.origin.toLowerCase().includes('mumbai') || result.destination.toLowerCase().includes('pune'))
    ? 'Mumbai-Pune Expressway'
    : 'National Highway (NH-44)';

  wrap.innerHTML = `
    <div class="rf-record">
      <div class="rf-record-head">
        <div>
          <span class="rf-record-id">${result.consignmentId}</span>
          <span class="stamp ${UI.stampClass(result.status)}">${UI.statusLabel[result.status] || result.status}</span>
        </div>
        <div class="ll-map-header-badge">
          <span class="nav-live-dot"></span> LIVE GPS ACTIVE
        </div>
      </div>

      <div class="ll-map-wrapper">
        <div class="ll-map-header">
          <span>📍 Route: <strong>${result.origin}</strong> ➔ <strong>${result.destination}</strong></span>
          <span style="color:#00D2FF; font-size:.8rem;">${result.vehicleType}</span>
        </div>
        <div id="leafletMap" style="height:360px;"></div>
        <div class="ll-telematics-hud">
          <div class="ll-telematics-grid">
            <div class="ll-telematics-item">
              <span class="tele-lbl">Truck Speed</span>
              <span class="tele-val ${speed > 0 ? 'accent-green' : ''}">${speed > 0 ? speed + ' km/h' : '0 km/h'}</span>
              <span class="tele-sub">${speed > 0 ? 'Moving on highway' : 'Stopped / Loading'}</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Highway Route</span>
              <span class="tele-val accent-blue" style="font-size:1rem;">${highwayName}</span>
              <span class="tele-sub">Live GPS Location</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Next Toll Gate</span>
              <span class="tele-val">${nextTollDist > 0 ? nextTollDist + ' km' : 'Clear road'}</span>
              <span class="tele-sub">FASTag ready</span>
            </div>
            <div class="ll-telematics-item">
              <span class="tele-lbl">Expected Arrival Time</span>
              <span class="tele-val" style="color:#FFB800;">${result.status === 'delivered' ? 'Delivered' : result.etaHours + ' hour(s)'}</span>
              <span class="tele-sub">${result.status === 'delivered' ? 'Delivered Safely' : 'Moving on schedule'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="waybill-meta mt-3">
        <span>Truck Type: <strong>${UI.escapeHtml(result.vehicleType)}</strong></span>
        <span>Pickup City: <strong>${UI.escapeHtml(result.origin)}</strong></span>
        <span>Drop City: <strong>${UI.escapeHtml(result.destination)}</strong></span>
      </div>

      <h2 class="mt-4">Trip &amp; Delivery Progress</h2>
      ${UI.renderJourney({ status: result.status })}
    </div>`;

  setTimeout(() => {
    if (liveMap) { liveMap.remove(); liveMap = null; }
    const mapEl = document.getElementById('leafletMap');
    if (!mapEl || !window.L) return;

    liveMap = L.map('leafletMap', { zoomControl: true, attributionControl: false }).setView(currentPos, 8);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(liveMap);

    const completedCoords = routeCoords.slice(0, currentIdx + 1);
    const remainingCoords = routeCoords.slice(currentIdx);

    if (completedCoords.length > 1) {
      L.polyline(completedCoords, { color: '#00E599', weight: 5, opacity: 0.95 }).addTo(liveMap);
    }
    if (remainingCoords.length > 1) {
      L.polyline(remainingCoords, { color: '#2A5177', weight: 4, opacity: 0.75, dashArray: '6, 8' }).addTo(liveMap);
    }

    const originIcon = L.divIcon({
      className: 'll-pin-origin',
      html: '<div style="background:#0D1F30; color:#00D2FF; border:2px solid #00D2FF; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; box-shadow:0 0 10px rgba(0,210,255,.5);">A</div>',
      iconSize: [24, 24], iconAnchor: [12, 12]
    });
    L.marker(originCoord, { icon: originIcon }).addTo(liveMap).bindPopup(`<strong>Origin:</strong> ${result.origin}`);

    const destIcon = L.divIcon({
      className: 'll-pin-dest',
      html: '<div style="background:#0D1F30; color:#00E599; border:2px solid #00E599; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; box-shadow:0 0 10px rgba(0,229,153,.5);">B</div>',
      iconSize: [24, 24], iconAnchor: [12, 12]
    });
    L.marker(destCoord, { icon: destIcon }).addTo(liveMap).bindPopup(`<strong>Destination:</strong> ${result.destination}`);

    const truckIcon = L.divIcon({
      className: 'll-truck-marker',
      html: `
        <div class="ll-truck-icon-wrap">
          <div class="ll-radar-ring"></div>
          <svg class="ll-truck-svg" viewBox="0 0 24 24" fill="#00D2FF" stroke="#061A2B" stroke-width="1.5">
            <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5" fill="#00E599"/><circle cx="18.5" cy="18.5" r="2.5" fill="#00E599"/>
          </svg>
        </div>`,
      iconSize: [44, 44], iconAnchor: [22, 22]
    });

    const truckMarker = L.marker(currentPos, { icon: truckIcon }).addTo(liveMap);
    truckMarker.bindPopup(`<strong>${result.vehicleType}</strong><br>Speed: ${speed} km/h<br>Corridor: ${highwayName}`).openPopup();

    const bounds = L.latLngBounds(routeCoords);
    liveMap.fitBounds(bounds, { padding: [40, 40] });

    if (result.status === 'in_transit') {
      let step = 0;
      markerInterval = setInterval(() => {
        step = (step + 1) % 4;
        truckMarker.setLatLng([currentPos[0] + (step * 0.0006), currentPos[1] + (step * 0.0006)]);
      }, 2500);
    }
  }, 100);
};

// Initialize based on detected role or query parameter
setRole(activeRole);
if (prefill) {
  renderTrack(prefill);
} else if (activeRole === 'public') {
  renderTrack('RF-2026-498231');
}
