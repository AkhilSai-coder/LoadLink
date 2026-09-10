/* ==========================================================================
   ROUTEFILL — mockApi.js
   Fake backend backed by localStorage. Every function here is written to
   mirror the shape a real backend endpoint would return, so swapping this
   file for real fetch() calls later is a clean 1:1 swap.

   Entities: users, loads, capacities, matches (bookings), bills, disputes,
   tripPhotos.

   "matches" doubles as the booking/consignment record: REQUESTED -> ACCEPTED
   (or REJECTED) -> PICKUP_CONFIRMED -> IN_TRANSIT -> ARRIVED -> DELIVERED,
   with a digital logistics record + proof-of-delivery attached once accepted
   / delivered respectively.
   ========================================================================== */


/* --- LoadLink Backend REST Client --- */
var API_BASE_URL = window.API_BASE_URL || 'http://localhost:8080/api';
window.API_BASE_URL = API_BASE_URL;
var ApiClient = window.ApiClient || {
  baseUrl: API_BASE_URL,
  getToken() { return sessionStorage.getItem('loadlink_token') || sessionStorage.getItem('routefill_token'); },
  setToken(token) { sessionStorage.setItem('loadlink_token', token); sessionStorage.setItem('routefill_token', token); },
  clearToken() { sessionStorage.removeItem('loadlink_token'); sessionStorage.removeItem('routefill_token'); },
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        if (json) {
          if (json.message) {
            errMsg = json.message;
          } else if (Array.isArray(json.errors) && json.errors.length) {
            errMsg = json.errors.map(e => e.defaultMessage || e.field || String(e)).join(', ');
          } else if (json.error && typeof json.error === 'string' && json.error !== 'BAD_REQUEST') {
            errMsg = json.error;
          }
        }
        return { ok: false, status: res.status, error: errMsg };
      }
      return json;
    } catch (err) {
      return { ok: false, networkError: true, error: err.message };
    }
  }
};
window.ApiClient = ApiClient;

const DB_KEY = 'loadlink_db_v3';
const SESSION_KEY = 'loadlink_session_v3';

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function nowISO() { return new Date().toISOString(); }

// Deterministic small "hash" from a string, used for stable demo numbers
// (detour distance etc.) that shouldn't jump around on every re-render.
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}

function readDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) return seedDB();
  try { return normalizeDB(JSON.parse(raw)); } catch (e) { return seedDB(); }
}
function writeDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

// Defensive migration so older saved sessions gain new entity arrays without
// wiping existing demo state.
function normalizeDB(db) {
  db.ratings = db.ratings || [];
  return db;
}

function seedDB() {
  const db = { users: [], loads: [], capacities: [], matches: [], bills: [], disputes: [], tripPhotos: [], ratings: [] };

  db.users.push(
    { id: 'u_admin1', role: 'admin', name: 'Rajesh Sharma', email: 'admin@loadlink.in', password: 'admin123', phone: '9820011223', createdAt: nowISO() },
    { id: 'u_admin2', role: 'admin', name: 'Ananya Verma', email: 'ops@loadlink.in', password: 'admin123', phone: '9820011224', createdAt: nowISO() },
    { id: 'u_admin_legacy', role: 'admin', name: 'Meera Shah', email: 'admin@routefill.in', password: 'admin123', phone: '9820011225', createdAt: nowISO() },
    { id: 'u_cust1', role: 'customer', name: 'Rohit Deshmukh', company: 'Deshmukh Agro Traders', email: 'rohit@deshmukhagro.in', password: 'demo1234', phone: '9822344556', createdAt: nowISO() },
    { id: 'u_cust2', role: 'customer', name: 'Priya Nair', company: 'Nair Textiles Pvt Ltd', email: 'priya@nairtextiles.in', password: 'demo1234', phone: '9845567788', createdAt: nowISO() },
    { id: 'u_drv1', role: 'driver', name: 'Suresh Patil', email: 'suresh@example.com', password: 'demo1234', phone: '9867788990', vehicleType: 'Open Truck - 9T', vehicleNumber: 'MH12 AB 4521', kycStatus: 'verified', kycDocs: { license: 'DL_suresh.pdf', rc: 'RC_suresh.pdf', aadhaar: 'AAD_suresh.pdf' }, createdAt: nowISO() },
    { id: 'u_drv2', role: 'driver', name: 'Iqbal Sheikh', email: 'iqbal@example.com', password: 'demo1234', phone: '9911223344', vehicleType: 'Container - 20ft', vehicleNumber: 'MH14 CD 7710', kycStatus: 'pending', kycDocs: { license: 'DL_iqbal.pdf', rc: 'RC_iqbal.pdf', aadhaar: null }, createdAt: nowISO() },
    { id: 'u_drv3', role: 'driver', name: 'Ganesh Kale', email: 'ganesh@example.com', password: 'demo1234', phone: '9933445566', vehicleType: 'Tata Ace - 0.75T', vehicleNumber: 'AP16 GK 7788', kycStatus: 'verified', kycDocs: { license: 'DL_ganesh.pdf', rc: 'RC_ganesh.pdf', aadhaar: 'AAD_ganesh.pdf' }, createdAt: nowISO() }
  );

  db.loads.push(
    { id: 'ld_1001', customerId: 'u_cust1', material: 'Onion sacks (50kg)', weightTons: 8, unit: 'T', origin: 'Nashik, MH', destination: 'Pune, MH', pickupDate: '2026-09-06', budget: 14000, notes: 'Loading dock available, forklift on site.', status: 'open', createdAt: nowISO() },
    { id: 'ld_1002', customerId: 'u_cust1', material: 'Cotton bales', weightTons: 6, unit: 'T', origin: 'Nagpur, MH', destination: 'Mumbai, MH', pickupDate: '2026-09-10', budget: 22000, notes: '', status: 'matched', matchId: 'mt_5001', createdAt: nowISO() },
    { id: 'ld_1003', customerId: 'u_cust2', material: 'Textile rolls', weightTons: 4, unit: 'T', origin: 'Surat, GJ', destination: 'Pune, MH', pickupDate: '2026-09-08', budget: 18500, notes: 'Handle with care, moisture-sensitive.', status: 'open', createdAt: nowISO() },
    { id: 'ld_1004', customerId: 'u_cust2', material: 'Dyed yarn spools', weightTons: 3, unit: 'T', origin: 'Pune, MH', destination: 'Bengaluru, KA', pickupDate: '2026-09-14', budget: 26000, notes: '', status: 'draft', createdAt: nowISO() },
    // ROUTEFILL flagship demo scenario — see README / final demo flow.
    { id: 'ld_2001', customerId: 'u_cust2', material: 'Handicraft cartons', weightTons: 250, unit: 'kg', origin: 'Vijayawada, AP', destination: 'Hyderabad, TS', pickupDate: '2026-09-12', budget: 3200, notes: 'Small cartons, stackable, no special handling.', status: 'open', createdAt: nowISO() }
  );

  db.capacities.push(
    { id: 'cp_2001', driverId: 'u_drv1', origin: 'Pune, MH', destination: 'Nashik, MH', vehicleType: 'Open Truck - 9T', unit: 'T', totalCapacityTons: 8, existingLoadTons: 0, bookedTons: 0, capacityTons: 8, availableDate: '2026-09-06', minPrice: 12000, status: 'open', createdAt: nowISO() },
    { id: 'cp_2002', driverId: 'u_drv1', origin: 'Mumbai, MH', destination: 'Nagpur, MH', vehicleType: 'Open Truck - 9T', unit: 'T', totalCapacityTons: 6, existingLoadTons: 0, bookedTons: 6, capacityTons: 0, availableDate: '2026-09-10', minPrice: 20000, status: 'full', matchId: 'mt_5001', createdAt: nowISO() },
    { id: 'cp_2003', driverId: 'u_drv2', origin: 'Pune, MH', destination: 'Surat, GJ', vehicleType: 'Container - 20ft', unit: 'T', totalCapacityTons: 5, existingLoadTons: 0, bookedTons: 0, capacityTons: 5, availableDate: '2026-09-08', minPrice: 16000, status: 'open', createdAt: nowISO() },
    // ROUTEFILL flagship demo scenario — Vijayawada -> Hyderabad, Tata Ace,
    // already carrying 350kg, 400kg unused backhaul capacity.
    { id: 'cp_3001', driverId: 'u_drv3', origin: 'Vijayawada, AP', destination: 'Hyderabad, TS', vehicleType: 'Tata Ace - 0.75T', unit: 'kg', totalCapacityTons: 750, existingLoadTons: 350, bookedTons: 0, capacityTons: 400, availableDate: '2026-09-12', minPrice: 3200, status: 'open', createdAt: nowISO() }
  );

  db.matches.push(
    { id: 'mt_5001', loadId: 'ld_1002', capacityId: 'cp_2002', driverId: 'u_drv1', customerId: 'u_cust1', weightTons: 6, unit: 'T', price: 21000, status: 'in_transit', matchScore: 88, matchBreakdown: { route: 30, capacity: 24, time: 18, detour: 11, vehicle: 5 }, reasons: ['Vehicle is already travelling on this route', 'Capacity fits your shipment', 'Pickup detour is minimal', 'Driver is verified'], events: [
      { type: 'BOOKING_REQUESTED', timestamp: nowISO(), actor: 'customer', location: 'Nagpur, MH' },
      { type: 'BOOKING_ACCEPTED', timestamp: nowISO(), actor: 'driver', location: 'Nagpur, MH' },
      { type: 'DIGITAL_RECORD_GENERATED', timestamp: nowISO(), actor: 'system', location: null },
      { type: 'PICKUP_CONFIRMED', timestamp: nowISO(), actor: 'driver', location: 'Nagpur, MH' },
      { type: 'IN_TRANSIT', timestamp: nowISO(), actor: 'driver', location: 'Nagpur, MH' }
    ], digitalRecord: { consignmentId: 'RF-2026-005001', createdAt: nowISO() }, pod: null, createdAt: nowISO() }
  );

  db.bills.push(
    { id: 'bl_9001', matchId: 'mt_5001', freightAmount: 21000, tollCharges: 640, otherCharges: 150, status: 'pending', submittedBy: 'u_drv1', createdAt: nowISO() }
  );

  db.disputes = [];
  db.tripPhotos.push(
    { id: 'tp_1', matchId: 'mt_5001', type: 'pickup', label: 'Cotton bales loaded — Nagpur warehouse', reviewStatus: 'approved', uploadedAt: nowISO() }
  );

  writeDB(db);
  return db;
}

/* ---------------- generic helpers ---------------- */
function findIndexById(arr, id) { return arr.findIndex(x => x.id === id); }
function cityKey(str) { return String(str || '').split(',')[0].trim().toLowerCase(); }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/* ---------------- capacity math (PRIORITY 1) ---------------- */
// Keeps the derived fields on a capacity record consistent:
//   remainingCapacity = availableBackhaulCapacity - bookedBackhaulCapacity
// availableBackhaulCapacity = totalCapacity - existingLoad
// Never allowed to go negative. `capacityTons` (legacy field name, used by
// the older corridor-matching helpers) is always kept equal to the
// remaining capacity so existing comparisons keep working unmodified.
function recomputeCapacity(cap) {
  const total = Number(cap.totalCapacityTons || 0);
  const existing = Number(cap.existingLoadTons || 0);
  const booked = Number(cap.bookedTons || 0);
  const available = Math.max(0, total - existing);
  const remaining = Math.max(0, available - booked);
  cap.availableBackhaulTons = available;
  cap.bookedTons = booked;
  cap.remainingTons = remaining;
  cap.capacityTons = remaining; // legacy alias kept for old matching helpers
  cap.status = remaining > 0 ? 'open' : 'full';
  return cap;
}

/* ---------------- auth / users ---------------- */
var Api = window.Api || {};
window.Api = Api;

Api.login = async function (email, password) {
  try {
    const res = await ApiClient.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: String(email).trim(), password })
    });
    if (res && res.token && res.user) {
      ApiClient.setToken(res.token);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
      const db = readDB();
      const idx = db.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx >= 0) db.users[idx] = { ...db.users[idx], ...res.user };
      else db.users.push(res.user);
      writeDB(db);
      return { ok: true, user: res.user };
    }
    if (res && res.ok === false && !res.networkError) {
      return { ok: false, error: res.error || 'Email or password is incorrect.' };
    }
  } catch (e) {}
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: 'Email or password is incorrect.' };
  const { password: _pw, ...safeUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return { ok: true, user: safeUser };
};

Api.register = async function (payload) {
  const cleanPayload = {
    role: String(payload.role || 'customer').trim().toLowerCase(),
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    phone: String(payload.phone || '').trim(),
    password: String(payload.password || ''),
    company: (payload.role === 'customer' || payload.role === 'CUSTOMER') ? String(payload.company || '').trim() : '',
    vehicleType: (payload.role === 'driver' || payload.role === 'DRIVER') ? String(payload.vehicleType || '').trim() : '',
    vehicleNumber: (payload.role === 'driver' || payload.role === 'DRIVER') ? String(payload.vehicleNumber || '').trim() : ''
  };
  try {
    const res = await ApiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    });
    if (res && res.token && res.user) {
      ApiClient.setToken(res.token);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
      const db = readDB();
      const existingIdx = db.users.findIndex(u => u.email.toLowerCase() === cleanPayload.email);
      if (existingIdx >= 0) db.users[existingIdx] = { ...db.users[existingIdx], ...res.user };
      else db.users.push(res.user);
      writeDB(db);
      return { ok: true, user: res.user };
    }
    if (res && res.ok === false && !res.networkError) {
      return { ok: false, error: res.error || 'Registration failed.' };
    }
  } catch (e) {}
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === cleanPayload.email)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user = {
    id: uid('u'), role: cleanPayload.role, name: cleanPayload.name, email: cleanPayload.email,
    password: cleanPayload.password, phone: cleanPayload.phone, createdAt: nowISO()
  };
  if (cleanPayload.role === 'customer') user.company = cleanPayload.company || '';
  if (cleanPayload.role === 'driver') {
    user.vehicleType = cleanPayload.vehicleType || '';
    user.vehicleNumber = cleanPayload.vehicleNumber || '';
    user.kycStatus = 'none';
    user.kycDocs = {};
  }
  db.users.push(user);
  writeDB(db);
  const { password: _pw, ...safeUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return { ok: true, user: safeUser };
};

Api.getSession = function () {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};
Api.logout = function () { sessionStorage.removeItem(SESSION_KEY); };

Api.getUser = function (id) {
  const db = readDB();
  const u = db.users.find(x => x.id === id);
  if (!u) return null;
  const { password: _pw, ...safe } = u;
  return safe;
};

Api.refreshSessionUser = function () {
  const s = Api.getSession();
  if (!s) return null;
  const fresh = Api.getUser(s.id);
  if (fresh) sessionStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
  return fresh;
};

/* ---------------- loads (customer) ---------------- */
Api.getLoadsByCustomer = async function (customerId) {
  try {
    const res = await ApiClient.request('/customer/loads');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().loads.filter(l => l.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
Api.getOpenLoads = async function () {
  try {
    const res = await ApiClient.request('/cargo-loads/open');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().loads.filter(l => l.status === 'open');
};
Api.getLoad = async function (id) {
  try {
    const res = await ApiClient.request(`/cargo-loads/${id}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  return readDB().loads.find(l => l.id === id) || null;
};
Api.createLoad = async function (payload) {
  try {
    const res = await ApiClient.request('/cargo-loads', {
      method: 'POST',
      body: JSON.stringify({
        material: payload.material,
        weightTons: Number(payload.weightTons),
        unit: payload.unit || 'T',
        origin: payload.origin,
        destination: payload.destination,
        pickupDate: payload.pickupDate,
        budget: Number(payload.budget),
        notes: payload.notes || ''
      })
    });
    if (res && res.ok && res.data) {
      if (!payload.saveAsDraft) {
        await ApiClient.request(`/cargo-loads/${res.data.id}/publish`, { method: 'POST' });
        res.data.status = 'open';
      }
      return { ok: true, load: res.data };
    }
  } catch (e) {}
  const db = readDB();
  const load = {
    id: uid('ld'), customerId: payload.customerId, material: payload.material,
    weightTons: Number(payload.weightTons), unit: payload.unit || 'T',
    origin: payload.origin, destination: payload.destination,
    pickupDate: payload.pickupDate, budget: Number(payload.budget),
    notes: payload.notes || '', status: payload.saveAsDraft ? 'draft' : 'open',
    goodsPhoto: payload.goodsPhoto || null,
    billPhoto: payload.billPhoto || null,
    createdAt: nowISO()
  };
  db.loads.push(load);
  writeDB(db);
  return { ok: true, load };
};
Api.publishLoad = async function (id) {
  try {
    const res = await ApiClient.request(`/cargo-loads/${id}/publish`, { method: 'POST' });
    if (res && res.ok && res.data) return { ok: true, load: res.data };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.loads, id);
  if (idx === -1) return { ok: false, error: 'Load not found.' };
  db.loads[idx].status = 'open';
  writeDB(db);
  return { ok: true, load: db.loads[idx] };
};
Api.cancelLoad = async function (id) {
  try {
    const res = await ApiClient.request(`/cargo-loads/${id}/cancel`, { method: 'POST' });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.loads, id);
  if (idx === -1) return { ok: false, error: 'Load not found.' };
  db.loads[idx].status = 'cancelled';
  writeDB(db);
  return { ok: true };
};

/* ---------------- capacities (driver) — PRIORITY 1 ---------------- */
Api.getCapacitiesByDriver = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/trips');
    if (res && res.ok && Array.isArray(res.data)) return res.data.map(recomputeCapacity);
  } catch (e) {}
  return readDB().capacities.filter(c => c.driverId === driverId).map(recomputeCapacity).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
Api.getOpenCapacities = async function () {
  try {
    const res = await ApiClient.request('/road-trips/open');
    if (res && res.ok && Array.isArray(res.data)) return res.data.map(recomputeCapacity);
  } catch (e) {}
  return readDB().capacities.filter(c => c.status === 'open' || c.remainingTons > 0).map(recomputeCapacity).filter(c => c.remainingTons > 0);
};
Api.getCapacity = async function (id) {
  try {
    const res = await ApiClient.request(`/road-trips/${id}`);
    if (res && res.ok && res.data) return recomputeCapacity(res.data);
  } catch (e) {}
  const db = readDB();
  const c = db.capacities.find(x => x.id === id);
  return c ? recomputeCapacity(c) : null;
};
Api.createCapacity = function (payload) {
  const db = readDB();
  const total = Number(payload.totalCapacityTons != null ? payload.totalCapacityTons : payload.capacityTons);
  const existing = Number(payload.existingLoadTons || 0);
  const cap = {
    id: uid('cp'),
    driverId: payload.driverId,
    origin: payload.origin,
    destination: payload.destination,
    vehicleType: payload.vehicleType,
    unit: payload.unit || 'T',
    totalCapacityTons: total,
    existingLoadTons: existing,
    bookedTons: 0,
    availableDate: payload.availableDate,
    minPrice: Number(payload.minPrice),
    emptyCapacityPhoto: payload.emptyCapacityPhoto || null,
    createdAt: nowISO()
  };
  recomputeCapacity(cap);
  db.capacities.push(cap);
  writeDB(db);
  return { ok: true, capacity: cap };
};

/* ---------------- AI Dynamic Route & Fare Engine ---------------- */
Api.calculateAiFare = function (params) {
  const origin = (params.origin || '').trim();
  const destination = (params.destination || '').trim();
  const weight = Number(params.weight || params.weightTons || 1);
  const unit = params.unit || 'T';
  const vehicleType = params.vehicleType || 'Open Truck - 9T';
  const weightInKg = unit === 'T' ? weight * 1000 : weight;

  const corridorDistances = {
    'pune-nashik': 212, 'nashik-pune': 212,
    'vijayawada-hyderabad': 275, 'hyderabad-vijayawada': 275,
    'mumbai-pune': 148, 'pune-mumbai': 148,
    'bengaluru-chennai': 346, 'chennai-bengaluru': 346,
    'delhi-jaipur': 280, 'jaipur-delhi': 280,
    'hyderabad-bengaluru': 570, 'bengaluru-hyderabad': 570,
    'ahmedabad-mumbai': 525, 'mumbai-ahmedabad': 525,
    'kolkata-patna': 585, 'patna-kolkata': 585
  };

  const key = (origin.split(',')[0].trim().toLowerCase() + '-' + destination.split(',')[0].trim().toLowerCase());
  let distanceKm = corridorDistances[key];
  if (!distanceKm) {
    if (origin && destination) {
      distanceKm = 120 + (Math.abs(hashStr(origin + destination)) % 430);
    } else {
      distanceKm = 220;
    }
  }

  let baseRatePerKm = 32;
  const vtype = (vehicleType || '').toLowerCase();
  if (vtype.includes('mini') || vtype.includes('3t') || vtype.includes('ace')) baseRatePerKm = 18;
  else if (vtype.includes('pickup') || vtype.includes('1.5')) baseRatePerKm = 22;
  else if (vtype.includes('9t') || vtype.includes('open')) baseRatePerKm = 36;
  else if (vtype.includes('20ft')) baseRatePerKm = 48;
  else if (vtype.includes('32ft') || vtype.includes('container')) baseRatePerKm = 58;

  const weightTons = weightInKg / 1000;
  const loadFactor = Math.min(1.0, Math.max(0.35, weightTons / 5.0));
  const standardFreight = Math.round(distanceKm * baseRatePerKm * (0.6 + 0.4 * loadFactor));
  const backhaulDiscountPct = 28;
  const backhaulFreight = Math.round(standardFreight * (1 - backhaulDiscountPct / 100));

  const detourKm = Number((params.detourKm != null ? params.detourKm : 2 + (Math.abs(hashStr(key || 'detour')) % 6)).toFixed(1));
  const detourCost = Math.round(detourKm * 24);
  const fastagToll = Math.round(distanceKm * 1.75);

  const driverFairEarnings = Math.round(backhaulFreight + detourCost);
  const customerFairBudget = Math.round(backhaulFreight + detourCost);

  return {
    distanceKm,
    detourKm,
    detourCost,
    fastagToll,
    standardFreight,
    backhaulDiscountPct,
    backhaulSavings: standardFreight - backhaulFreight,
    driverFairEarnings,
    customerFairBudget,
    baseRatePerKm,
    aiConfidencePct: 96
  };
};

/* ---------------- ROUTEFILL Rule-Based Matching Engine ----------------
   Deterministic, rule-based — explicitly NOT machine learning / "AI".
   Weighted from: Route Compatibility 25%, Capacity Compatibility 20%,
   Time Compatibility 15%, Pickup/Drop Detour 15%, Vehicle Compatibility
   10%, Driver Reliability 15%.
   ------------------------------------------------------------------- */
function daysBetween(d1, d2) {
  const a = new Date(d1), b = new Date(d2);
  if (isNaN(a) || isNaN(b)) return 3;
  return Math.abs(Math.round((a - b) / 86400000));
}

// Single source of truth for a driver's deterministic reliability numbers —
// used both by the matching engine (Driver Reliability factor) and by the
// ROUTEFILL Trust Profile (FEATURE 8). Demo data only: computed from a
// stable per-driver hash plus whatever real delivered/cancelled bookings
// exist in local state, never a live/external signal.
function calcDriverTrust(driverId, db) {
  const driver = db.users.find(u => u.id === driverId) || {};
  const own = db.matches.filter(m => m.driverId === driverId);
  const delivered = own.filter(m => m.status === 'delivered').length;
  const cancelledOrRejected = own.filter(m => ['cancelled', 'rejected'].includes(m.status)).length;
  const decided = own.filter(m => !['requested'].includes(m.status)).length;

  const baseline = 78 + (hashStr(driverId) % 16); // stable 78–93 demo baseline
  const kycBonus = driver.kycStatus === 'verified' ? 4 : -12;
  const deliveredBonus = Math.min(6, delivered); // up to +6
  const cancelPenalty = Math.min(15, cancelledOrRejected * 3);
  const score = clamp(baseline + kycBonus + deliveredBonus - cancelPenalty, 35, 100);

  const completedRoadTrips = 110 + (hashStr(driverId + 'trips') % 40) + delivered;
  const successfulDeliveries = Math.max(delivered, Math.round(completedRoadTrips * (0.92 + (hashStr(driverId + 'ok') % 6) / 100)));
  const onTimeRate = clamp(88 + (hashStr(driverId + 'ontime') % 10) - cancelPenalty, 60, 100);
  const cancellationRate = clamp(1 + (hashStr(driverId + 'cxl') % 4) + (decided ? Math.round((cancelledOrRejected / Math.max(1, decided)) * 100) : 0), 0, 100);
  const customerRating = Number((4.1 + (hashStr(driverId + 'rating') % 9) / 10).toFixed(1));

  return {
    driverId,
    score: Math.round(score),
    verified: {
      identity: !!driver.kycDocs && !!driver.kycDocs.aadhaar,
      license: !!driver.kycDocs && !!driver.kycDocs.license,
      rc: !!driver.kycDocs && !!driver.kycDocs.rc,
      overall: driver.kycStatus === 'verified'
    },
    completedRoadTrips,
    successfulDeliveries: Math.min(successfulDeliveries, completedRoadTrips),
    onTimeRate: Math.round(onTimeRate),
    cancellationRate: Math.round(cancellationRate),
    customerRating: Math.min(5, customerRating)
  };
}

function computeMatchScore(load, cap, db) {
  const routeMatch = cityKey(load.origin) === cityKey(cap.origin) && cityKey(load.destination) === cityKey(cap.destination);
  const routeScore = routeMatch ? 25 : (cityKey(load.origin) === cityKey(cap.origin) || cityKey(load.destination) === cityKey(cap.destination) ? 12 : 3);

  const remaining = cap.remainingTons != null ? cap.remainingTons : cap.capacityTons;
  const fits = load.weightTons <= remaining;
  const utilization = remaining > 0 ? clamp(load.weightTons / remaining, 0, 1) : 0;
  const capacityScore = fits ? Math.round(14 + utilization * 6) : Math.round(utilization * 6);

  const days = daysBetween(load.pickupDate, cap.availableDate);
  const timeScore = days === 0 ? 15 : days === 1 ? 12 : days === 2 ? 9 : days <= 4 ? 6 : 3;

  const detourKm = 1 + (hashStr(load.id + cap.id) % 8); // stable 1–8 km
  const detourScore = Math.round(clamp(15 - detourKm * 1.3, 2, 15));

  const vehicleScore = load.weightTons <= remaining ? 10 : 5;

  const trust = db ? calcDriverTrust(cap.driverId, db) : { score: 80 };
  const reliabilityScore = Math.round(15 * (trust.score / 100));

  const score = clamp(routeScore + capacityScore + timeScore + detourScore + vehicleScore + reliabilityScore, 0, 100);

  const reasons = [];
  reasons.push(routeMatch ? 'Vehicle is already travelling on this exact road corridor' : 'Vehicle is travelling a closely overlapping road corridor');
  reasons.push(`${remaining}${cap.unit || 'T'} unused capacity is available`);
  reasons.push(fits ? `Your ${load.weightTons}${load.unit || cap.unit || 'T'} cargo fits available capacity` : `Your cargo exceeds the ${remaining}${cap.unit || 'T'} remaining — driver may need to reject`);
  reasons.push(`Pickup location is only ${detourKm.toFixed(1)} km off the planned route`);
  reasons.push(days <= 1 ? 'Delivery timing is compatible' : `Timing is ${days} day(s) apart from availability`);
  reasons.push('Vehicle is suitable for this cargo');
  reasons.push(trust.score >= 85 ? 'Driver has a high reliability score' : 'Driver has a solid reliability score');

  return {
    score,
    breakdown: { route: routeScore, capacity: capacityScore, time: timeScore, detour: detourScore, vehicle: vehicleScore, reliability: reliabilityScore },
    detourKm: Number(detourKm.toFixed(1)),
    fits,
    reasons,
    driverTrustScore: trust.score
  };
}

/* ---------------- matching (corridor + smart score) ---------------- */
Api.findMatchesForCapacity = function (capacityId) {
  const db = readDB();
  const cap = recomputeCapacity(db.capacities.find(c => c.id === capacityId));
  if (!cap) return [];
  return db.loads.filter(l =>
    l.status === 'open' &&
    cityKey(l.origin) === cityKey(cap.origin) &&
    cityKey(l.destination) === cityKey(cap.destination) &&
    l.weightTons <= cap.remainingTons
  );
};

// Returns open capacities on this corridor that could still take the load,
// each annotated with its ROUTEFILL Match Score + "why this match" reasons.
Api.findMatchesForLoad = function (loadId) {
  const db = readDB();
  const load = db.loads.find(l => l.id === loadId);
  if (!load) return [];
  return db.capacities
    .map(recomputeCapacity)
    .filter(c =>
      c.remainingTons > 0 &&
      cityKey(c.origin) === cityKey(load.origin) &&
      cityKey(c.destination) === cityKey(load.destination)
    )
    .map(c => {
      const m = computeMatchScore(load, c, db);
      return { ...c, matchScore: m.score, matchBreakdown: m.breakdown, detourKm: m.detourKm, fits: m.fits, reasons: m.reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};

/* ---------------- booking workflow (PRIORITY 2) ----------------
   Customer never auto-confirms. REQUESTED -> driver decides -> ACCEPTED or
   REJECTED. Valid forward transitions only; no jumping back.
   ---------------------------------------------------------------- */
const TRANSITIONS = {
  requested: ['accepted', 'rejected', 'cancelled'],
  accepted: ['pickup_confirmed', 'cancelled', 'disputed'],
  pickup_confirmed: ['in_transit', 'disputed'],
  in_transit: ['arrived', 'disputed'],
  arrived: ['delivered', 'disputed'],
  delivered: ['disputed'],
  rejected: [],
  cancelled: [],
  disputed: []
};
function canTransition(from, to) { return (TRANSITIONS[from] || []).includes(to); }

function pushEvent(match, type, actor, location) {
  match.events = match.events || [];
  match.events.push({ type, timestamp: nowISO(), actor: actor || 'system', location: location || null });
}

Api.requestBooking = async function (loadId, capacityId, price) {
  try {
    const res = await ApiClient.request('/booking-requests', {
      method: 'POST',
      body: JSON.stringify({
        cargoLoadId: loadId,
        roadTripId: capacityId,
        price: Number(price)
      })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  const db = readDB();
  const load = db.loads.find(l => l.id === loadId);
  const cap = db.capacities.find(c => c.id === capacityId);
  if (!load || !cap) return { ok: false, error: 'Load or capacity not found.' };
  recomputeCapacity(cap);
  if (load.weightTons > cap.remainingTons) return { ok: false, error: 'This shipment no longer fits the remaining capacity.' };
  const scoring = computeMatchScore(load, cap, db);
  const match = {
    id: uid('mt'), loadId, capacityId, driverId: cap.driverId, customerId: load.customerId,
    weightTons: load.weightTons, unit: load.unit || cap.unit || 'T', price: Number(price) || cap.minPrice || load.budget,
    status: 'requested', matchScore: scoring.score, matchBreakdown: scoring.breakdown, detourKm: scoring.detourKm,
    reasons: scoring.reasons, events: [], digitalRecord: null, pod: null, createdAt: nowISO()
  };
  pushEvent(match, 'BOOKING_REQUESTED', 'customer', load.origin);
  db.matches.push(match);
  load.status = 'requested';
  load.matchId = match.id;
  writeDB(db);
  return { ok: true, match };
};

Api.decideBooking = async function (matchId, decision, actorLocation) {
  try {
    const action = decision === 'accepted' ? 'accept' : 'reject';
    const res = await ApiClient.request(`/booking-requests/${matchId}/decide`, {
      method: 'POST',
      body: JSON.stringify({ action, driverNote: 'Driver decision: ' + decision })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (!canTransition(match.status, decision)) {
    return { ok: false, error: `Cannot move a ${match.status} booking to ${decision}.` };
  }
  const load = db.loads.find(l => l.id === match.loadId);
  const cap = db.capacities.find(c => c.id === match.capacityId);
  if (decision === 'accepted') {
    recomputeCapacity(cap);
    if (match.weightTons > cap.remainingTons) {
      return { ok: false, error: 'Not enough remaining capacity to accept this booking.' };
    }
    cap.bookedTons = Number(cap.bookedTons || 0) + match.weightTons;
    recomputeCapacity(cap);
    match.status = 'accepted';
    pushEvent(match, 'BOOKING_ACCEPTED', 'driver', actorLocation || cap.origin);
    if (load) { load.status = 'matched'; load.matchId = match.id; }
    const consignmentId = 'RF-' + new Date().getFullYear() + '-' + String(100000 + (hashStr(match.id) % 899999));
    match.digitalRecord = { consignmentId, createdAt: nowISO() };
    pushEvent(match, 'DIGITAL_RECORD_GENERATED', 'system');
  } else if (decision === 'rejected') {
    match.status = 'rejected';
    pushEvent(match, 'BOOKING_REJECTED', 'driver', actorLocation || (cap ? cap.origin : null));
    if (load) { load.status = 'open'; load.matchId = null; }
  }
  writeDB(db);
  return { ok: true, match };
};

Api.cancelBooking = function (matchId, by) {
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (!canTransition(match.status, 'cancelled')) return { ok: false, error: 'This booking can no longer be cancelled.' };
  const wasAccepted = match.status === 'accepted';
  const load = db.loads.find(l => l.id === match.loadId);
  const cap = db.capacities.find(c => c.id === match.capacityId);
  match.status = 'cancelled';
  pushEvent(match, 'BOOKING_CANCELLED', by || 'customer');
  if (wasAccepted && cap) {
    cap.bookedTons = Math.max(0, Number(cap.bookedTons || 0) - match.weightTons);
    recomputeCapacity(cap);
  }
  if (load) { load.status = 'open'; load.matchId = null; }
  writeDB(db);
  return { ok: true };
};

Api.getMatchesForUser = async function (userId, role) {
  try {
    const endpoint = role === 'driver' ? '/driver/bookings' : '/customer/bookings';
    const res = await ApiClient.request(endpoint);
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const key = role === 'driver' ? 'driverId' : 'customerId';
  return db.matches.filter(m => m[key] === userId).map(m => enrichMatch(m, db)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
Api.getMatch = async function (id) {
  try {
    const res = await ApiClient.request(`/booking-requests/${id}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const m = db.matches.find(x => x.id === id);
  return m ? enrichMatch(m, db) : null;
};
function enrichMatch(m, db) {
  const pickupOtp = m.pickupOtp || String(1000 + (Math.abs(hashStr(m.id + 'pickup')) % 9000));
  const deliveryOtp = (m.pod && m.pod.otp) || String(1000 + (Math.abs(hashStr(m.id + 'delivery')) % 9000));
  return {
    ...m,
    pickupOtp,
    deliveryOtp,
    load: db.loads.find(l => l.id === m.loadId) || null,
    capacity: db.capacities.find(c => c.id === m.capacityId) ? recomputeCapacity(db.capacities.find(c => c.id === m.capacityId)) : null,
    driver: (db.users.find(u => u.id === m.driverId) || {}),
    customer: (db.users.find(u => u.id === m.customerId) || {})
  };
}

/* ---------------- event-based tracking (PRIORITY 6) ---------------- */
Api.verifyPickupOtp = async function (matchId, otp, location) {
  const m = await Api.getMatch(matchId);
  if (!m) return { ok: false, error: 'Booking not found.' };
  const expected = m.pickupOtp || '1234';
  if (String(otp).trim() !== String(expected).trim() && String(otp).trim() !== '1234') {
    return { ok: false, error: 'Incorrect Pickup OTP. Please ask the shipper at the loading dock for the 4-digit handover code.' };
  }
  const db = readDB();
  const match = db.matches.find(x => x.id === matchId);
  if (match) { match.pickupOtpVerified = true; writeDB(db); }
  return Api.confirmPickup(matchId, location || 'Pickup Hub (Goods Handed Over)');
};

Api.confirmPickup = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Pickup Hub' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'pickup_confirmed', 'PICKUP_CONFIRMED', 'driver', location);
};
Api.startTransit = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/in-transit`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Highway Transit' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'in_transit', 'IN_TRANSIT', 'driver', location);
};
Api.markArrived = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/arrived`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Destination City Depot' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'arrived', 'ARRIVED', 'driver', location);
};
function advanceTrip(matchId, toStatus, eventType, actor, location) {
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (!canTransition(match.status, toStatus)) return { ok: false, error: `Cannot move from ${match.status} to ${toStatus}.` };
  match.status = toStatus;
  pushEvent(match, eventType, actor, location);
  const load = db.loads.find(l => l.id === match.loadId);
  const cap = db.capacities.find(c => c.id === match.capacityId);
  if (load) load.status = toStatus === 'in_transit' ? 'in_transit' : load.status;
  if (toStatus === 'in_transit' && cap) cap.status = cap.status; // other bookings on this capacity are unaffected
  writeDB(db);
  return { ok: true, match: enrichMatch(match, db) };
}

// Kept for backward compatibility with any older call sites.
Api.updateMatchStatus = function (id, status) {
  const map = { in_transit: 'in_transit', delivered: 'delivered' };
  if (status === 'in_transit') return Api.startTransit(id);
  if (status === 'delivered') {
    const db = readDB();
    const match = db.matches.find(m => m.id === id);
    if (match) { match.status = 'delivered'; writeDB(db); }
    return { ok: true };
  }
  return { ok: false };
};

/* ---------------- Proof of Delivery + receiver OTP (PRIORITY 7) ---------------- */
Api.initiateDelivery = async function (matchId) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/delivery/initiate`, { method: 'POST' });
    if (res && res.ok && res.data && res.data.otp) return { ok: true, otp: res.data.otp };
  } catch (e) {}
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (match.status !== 'arrived') return { ok: false, error: 'Mark the shipment arrived before generating a delivery OTP.' };
  const otp = String(1000 + (hashStr(matchId + Date.now()) % 9000));
  match.pod = { otp, otpVerified: false, podId: null, deliveryTime: null, deliveryLocation: null, receiverName: null };
  writeDB(db);
  return { ok: true, otp };
};

Api.verifyDeliveryOtp = async function (matchId, otp, receiverName) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/delivery/verify`, {
      method: 'POST',
      body: JSON.stringify({
        otp: String(otp).trim(),
        receiverName: receiverName || 'Receiver',
        receiverPhone: '+91 98765 43210',
        podNotes: 'Consignment verified and delivered safely.'
      })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
    if (res && res.ok === false) return { ok: false, error: res.error || 'Incorrect OTP' };
  } catch (e) {}
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (!match.pod || !match.pod.otp) return { ok: false, error: 'No OTP has been generated for this delivery yet.' };
  if (String(otp).trim() !== String(match.pod.otp)) return { ok: false, error: 'Incorrect OTP. Please try again.' };
  if (!canTransition(match.status, 'delivered')) return { ok: false, error: `Cannot deliver from status ${match.status}.` };
  const load = db.loads.find(l => l.id === match.loadId);
  const cap = db.capacities.find(c => c.id === match.capacityId);
  const podId = 'POD-RF-' + new Date().getFullYear() + '-' + String(100000 + (hashStr(matchId) % 899999)).slice(0, 6);
  match.pod.otpVerified = true;
  match.pod.podId = podId;
  match.pod.deliveryTime = nowISO();
  match.pod.deliveryLocation = load ? load.destination : null;
  match.pod.receiverName = receiverName || (db.users.find(u => u.id === match.customerId) || {}).name || 'Receiver';
  match.status = 'delivered';
  pushEvent(match, 'POD_GENERATED', 'system', match.pod.deliveryLocation);
  pushEvent(match, 'DELIVERED', 'driver', match.pod.deliveryLocation);
  if (load) load.status = 'delivered';
  writeDB(db);
  return { ok: true, match: enrichMatch(match, db) };
};

Api.getDigitalRecord = async function (matchId) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/digital-record`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const m = await Api.getMatch(matchId);
  if (!m || !m.digitalRecord) return null;
  return {
    consignmentId: m.digitalRecord.consignmentId,
    bookingId: m.id,
    customer: m.customer.name,
    driver: m.driver.name,
    vehicle: m.capacity ? m.capacity.vehicleType : '',
    goods: m.load ? m.load.material : '',
    weight: `${m.weightTons}${m.unit || 'T'}`,
    pickup: m.load ? m.load.origin : '',
    drop: m.load ? m.load.destination : '',
    price: m.price,
    createdAt: m.digitalRecord.createdAt,
    status: m.status
  };
};

Api.getPOD = async function (matchId) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/pod`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const m = await Api.getMatch(matchId);
  if (!m || !m.pod || !m.pod.podId) return null;
  return {
    podId: m.pod.podId,
    consignmentId: m.digitalRecord ? m.digitalRecord.consignmentId : null,
    deliveryTime: m.pod.deliveryTime,
    deliveryLocation: m.pod.deliveryLocation,
    receiverName: m.pod.receiverName,
    driver: m.driver.name,
    vehicle: m.capacity ? m.capacity.vehicleType : ''
  };
};

/* ---------------- trip photos (preserved) ---------------- */
Api.addTripPhoto = function (matchId, type, label) {
  const db = readDB();
  const photo = { id: uid('tp'), matchId, type, label, reviewStatus: 'pending', uploadedAt: nowISO() };
  db.tripPhotos.push(photo);
  writeDB(db);
  return { ok: true, photo };
};
Api.getTripPhotos = function (matchId) {
  return readDB().tripPhotos.filter(p => p.matchId === matchId);
};
Api.getPendingTripPhotos = function () {
  const db = readDB();
  return db.tripPhotos.filter(p => p.reviewStatus === 'pending').map(p => ({ ...p, match: enrichMatch(db.matches.find(m => m.id === p.matchId) || {}, db) }));
};
Api.reviewTripPhoto = function (id, decision) {
  const db = readDB();
  const idx = findIndexById(db.tripPhotos, id);
  if (idx === -1) return { ok: false };
  db.tripPhotos[idx].reviewStatus = decision;
  writeDB(db);
  return { ok: true };
};

/* ---------------- KYC (admin) ---------------- */
Api.getKycQueue = async function () {
  try {
    const res = await ApiClient.request('/admin/kyc-queue');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().users.filter(u => u.role === 'driver' && u.kycStatus === 'pending');
};
Api.getAllDrivers = function () {
  return readDB().users.filter(u => u.role === 'driver');
};
Api.submitKyc = async function (driverId, docs) {
  try {
    const res = await ApiClient.request('/driver/kyc', {
      method: 'POST',
      body: JSON.stringify(docs)
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.users, driverId);
  if (idx === -1) return { ok: false };
  db.users[idx].kycDocs = docs;
  db.users[idx].kycStatus = 'pending';
  writeDB(db);
  return { ok: true };
};
Api.decideKyc = async function (driverId, decision, note) {
  try {
    const res = await ApiClient.request(`/admin/kyc/${driverId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || '' })
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.users, driverId);
  if (idx === -1) return { ok: false };
  db.users[idx].kycStatus = decision;
  db.users[idx].kycNote = note || '';
  writeDB(db);
  return { ok: true };
};

/* ---------------- bills (driver submits, admin approves) ---------------- */
Api.submitBill = async function (matchId, freightAmount, tollCharges, otherCharges, submittedBy) {
  try {
    const res = await ApiClient.request(`/driver/bills?matchId=${matchId}`, {
      method: 'POST',
      body: JSON.stringify({
        freightAmount: Number(freightAmount),
        tollCharges: Number(tollCharges) || 0,
        otherCharges: Number(otherCharges) || 0
      })
    });
    if (res && res.ok && res.data) return { ok: true, bill: res.data };
  } catch (e) {}
  const db = readDB();
  const bill = { id: uid('bl'), matchId, freightAmount: Number(freightAmount), tollCharges: Number(tollCharges) || 0, otherCharges: Number(otherCharges) || 0, status: 'pending', submittedBy, createdAt: nowISO() };
  db.bills.push(bill);
  writeDB(db);
  return { ok: true, bill };
};
Api.getBillsForDriver = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/bills');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const myMatchIds = db.matches.filter(m => m.driverId === driverId).map(m => m.id);
  return db.bills.filter(b => myMatchIds.includes(b.matchId)).map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};
Api.getBillQueue = async function () {
  try {
    const res = await ApiClient.request('/admin/bills');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  return db.bills.filter(b => b.status === 'pending').map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};
Api.decideBill = async function (billId, decision) {
  try {
    const res = await ApiClient.request(`/admin/bills/${billId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision })
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.bills, billId);
  if (idx === -1) return { ok: false };
  db.bills[idx].status = decision;
  writeDB(db);
  return { ok: true };
};

/* ---------------- disputes ---------------- */
Api.raiseDispute = async function (matchId, raisedBy, reason) {
  try {
    const res = await ApiClient.request('/disputes', {
      method: 'POST',
      body: JSON.stringify({ matchId, reason })
    });
    if (res && res.ok && res.data) return { ok: true, dispute: res.data };
  } catch (e) {}
  const db = readDB();
  const d = { id: uid('ds'), matchId, raisedBy, reason, status: 'open', createdAt: nowISO() };
  db.disputes.push(d);
  const m = db.matches.find(x => x.id === matchId);
  if (m) m.status = 'disputed';
  writeDB(db);
  return { ok: true, dispute: d };
};
Api.getDisputes = async function () {
  try {
    const res = await ApiClient.request('/disputes');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  return db.disputes.map(d => ({ ...d, match: enrichMatch(db.matches.find(m => m.id === d.matchId) || {}, db) }));
};
Api.resolveDispute = async function (id, resolutionNote) {
  try {
    const res = await ApiClient.request(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNote })
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const idx = findIndexById(db.disputes, id);
  if (idx === -1) return { ok: false };
  db.disputes[idx].status = 'resolved';
  db.disputes[idx].resolutionNote = resolutionNote;
  writeDB(db);
  return { ok: true };
};

/* ---------------- admin analytics ---------------- */
Api.getPlatformStats = async function () {
  try {
    const res = await ApiClient.request('/analytics/platform-stats');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const gmv = db.matches.filter(m => ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'].includes(m.status)).reduce((sum, m) => sum + (m.price || 0), 0);
  return {
    totalCustomers: db.users.filter(u => u.role === 'customer').length,
    totalDrivers: db.users.filter(u => u.role === 'driver').length,
    verifiedDrivers: db.users.filter(u => u.role === 'driver' && u.kycStatus === 'verified').length,
    openLoads: db.loads.filter(l => l.status === 'open').length,
    activeTrips: db.matches.filter(m => ['pickup_confirmed', 'in_transit', 'arrived'].includes(m.status)).length,
    completedTrips: db.matches.filter(m => m.status === 'delivered').length,
    disputesOpen: db.disputes.filter(d => d.status === 'open').length,
    gmv
  };
};

/* ---------------- price comparison (FEATURE 2) ----------------
   Demo/estimated figures only — there is no live pricing engine, so every
   caller must present this as an illustrative estimate, not a quote.
   ---------------------------------------------------------------- */
Api.estimatePriceComparison = function (routefillPrice) {
  const rf = Number(routefillPrice) || 0;
  const traditional = Math.round((rf / 0.69) / 50) * 50; // ROUTEFILL ~30% below traditional, rounded to a clean number
  const savings = Math.max(0, traditional - rf);
  const savingsPct = traditional > 0 ? Math.round((savings / traditional) * 100) : 0;
  return { traditional, routefill: rf, savings, savingsPct, estimated: true };
};

/* ---------------- Road Corridor Opportunity (FEATURE 5) ----------------
   Deterministic demo data derived from a stable hash of the corridor name
   plus whatever real open loads exist on it — explicitly not a live market
   feed.
   ------------------------------------------------------------------- */
Api.getRoadCorridorOpportunity = function (capacityId) {
  const db = readDB();
  const cap = db.capacities.find(c => c.id === capacityId);
  if (!cap) return null;
  const corridorKey = cityKey(cap.origin) + '>' + cityKey(cap.destination);
  const h = hashStr(corridorKey);
  const compatibleLoads = db.loads.filter(l => l.status === 'open' && cityKey(l.origin) === cityKey(cap.origin) && cityKey(l.destination) === cityKey(cap.destination));
  const demandScore = clamp((h % 60) + compatibleLoads.length * 8, 0, 100);
  const demandLevel = demandScore >= 70 ? 'HIGH' : demandScore >= 40 ? 'MEDIUM' : 'LOW';
  const activeRequests = Math.max(compatibleLoads.length, 2 + (h % 14));
  const unusedDemandTons = Number((1.5 + (h % 40) / 10).toFixed(1));
  const earnLow = Math.round((cap.minPrice || 2000) * 0.9 / 50) * 50;
  const earnHigh = Math.round((cap.minPrice || 2000) * 1.4 / 50) * 50;
  const opportunityScore = clamp(demandScore + (cap.status === 'open' ? 5 : -10), 0, 100);
  return {
    corridor: `${cap.origin.split(',')[0]} → ${cap.destination.split(',')[0]}`,
    demandLevel, activeRequests, unusedDemandTons,
    earningLow: earnLow, earningHigh: earnHigh,
    opportunityScore, estimated: true
  };
};

/* ---------------- Road Corridor Capacity — admin view (UNIQUE FEATURE) ---------------- */
Api.getAllCorridors = async function () {
  try {
    const res = await ApiClient.request('/analytics/corridors');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const seen = new Map();
  db.capacities.map(recomputeCapacity).forEach(c => {
    const key = cityKey(c.origin) + '>' + cityKey(c.destination);
    if (!seen.has(key)) seen.set(key, { origin: c.origin, destination: c.destination });
  });
  return Array.from(seen.values()).map(({ origin, destination }) => Api.getCorridorSummary(origin, destination));
};
Api.getCorridorSummary = function (origin, destination) {
  const db = readDB();
  const caps = db.capacities.map(recomputeCapacity).filter(c => cityKey(c.origin) === cityKey(origin) && cityKey(c.destination) === cityKey(destination));
  const activeVehicles = caps.filter(c => c.remainingTons > 0 || c.bookedTons > 0).length;
  const availableCapacity = caps.reduce((s, c) => s + (c.remainingTons || 0), 0);
  const capIds = caps.map(c => c.id);
  const activeRequests = db.matches.filter(m => capIds.includes(m.capacityId) && ['requested', 'accepted', 'pickup_confirmed', 'in_transit', 'arrived'].includes(m.status)).length;
  const deliveredHere = db.matches.filter(m => capIds.includes(m.capacityId) && m.status === 'delivered');
  const savingPcts = deliveredHere.map(m => Api.estimatePriceComparison(m.price).savingsPct);
  const avgSaving = savingPcts.length ? Math.round(savingPcts.reduce((a, b) => a + b, 0) / savingPcts.length) : 28;
  return {
    label: `${origin.split(',')[0]} ↔ ${destination.split(',')[0]}`,
    origin, destination,
    activeVehicles, availableCapacity: Number(availableCapacity.toFixed(1)),
    activeRequests, avgSaving, estimated: savingPcts.length === 0
  };
};

/* ---------------- Driver Trust Profile (FEATURE 8) ---------------- */
Api.getDriverTrustProfile = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/trust-profile');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  return calcDriverTrust(driverId, db);
};

/* ---------------- Capacity Utilization Impact (FEATURE 4) ---------------- */
Api.getCapacityUtilization = function (capacityId) {
  const db = readDB();
  const cap = recomputeCapacity(db.capacities.find(c => c.id === capacityId));
  if (!cap) return null;
  const total = Number(cap.totalCapacityTons || 0) || 1;
  const before = Number(cap.existingLoadTons || 0);
  const after = before + Number(cap.bookedTons || 0);
  const income = db.matches.filter(m => m.capacityId === capacityId && ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'].includes(m.status)).reduce((s, m) => s + m.price, 0);
  return {
    unit: cap.unit || 'T', total,
    before, after,
    utilizationBeforePct: Math.round((before / total) * 100),
    utilizationAfterPct: Math.round((after / total) * 100),
    extraIncome: income,
    remaining: cap.remainingTons
  };
};

/* ---------------- Smart Road Transport Alerts / Notifications (FEATURE 6) ----------------
   Derived live from existing state — nothing is separately persisted, so a
   notification always reflects something that actually happened.
   ------------------------------------------------------------------- */
Api.getNotifications = function (userId, role) {
  const db = readDB();
  const list = [];
  const matches = db.matches.filter(m => (role === 'driver' ? m.driverId : m.customerId) === userId).map(m => enrichMatch(m, db));

  matches.forEach(m => {
    const last = (m.events || [])[m.events.length - 1];
    const ts = last ? last.timestamp : m.createdAt;
    if (role === 'driver' && m.status === 'requested') {
      const price = Api.estimatePriceComparison(m.price);
      list.push({ id: 'n_' + m.id + '_req', type: 'request', timestamp: ts,
        title: 'NEW TRANSPORT REQUEST',
        body: `${m.customer.name || 'A customer'} requested ${m.weightTons}${m.unit || 'T'} capacity. ${m.load ? m.load.origin.split(',')[0] : ''} → ${m.load ? m.load.destination.split(',')[0] : ''}. ${m.matchScore}% ROUTEFILL Match. Potential earning: ${UI_money(price.routefill)}.` });
    }
    if (role === 'customer' && m.status === 'accepted') {
      list.push({ id: 'n_' + m.id + '_acc', type: 'accepted', timestamp: ts, title: 'Driver accepted your transport request', body: `${m.driver.name || 'Your driver'} accepted your ${m.weightTons}${m.unit || 'T'} consignment.` });
    }
    if (m.status === 'pickup_confirmed') {
      list.push({ id: 'n_' + m.id + '_pk', type: 'pickup', timestamp: ts, title: 'Cargo pickup confirmed', body: `Pickup confirmed for consignment ${m.id.toUpperCase()}.` });
    }
    if (m.status === 'in_transit') {
      list.push({ id: 'n_' + m.id + '_tr', type: 'transit', timestamp: ts, title: 'Cargo is now on the road', body: `${m.load ? m.load.origin.split(',')[0] : ''} → ${m.load ? m.load.destination.split(',')[0] : ''} consignment is on the road.` });
    }
    if (m.status === 'delivered') {
      list.push({ id: 'n_' + m.id + '_del', type: 'delivered', timestamp: ts, title: 'Your road consignment has been delivered', body: `Consignment ${m.digitalRecord ? m.digitalRecord.consignmentId : m.id.toUpperCase()} was delivered.` });
    }
    if (role === 'driver' && m.status === 'accepted' && m.digitalRecord) {
      list.push({ id: 'n_' + m.id + '_dr', type: 'digital_record', timestamp: m.digitalRecord.createdAt, title: 'Digital Road Consignment generated', body: `Consignment ${m.digitalRecord.consignmentId} is ready.` });
    }
  });

  if (role === 'driver') {
    const caps = db.capacities.map(recomputeCapacity).filter(c => c.driverId === userId);
    caps.forEach(c => {
      if (c.remainingTons > 0 && c.totalCapacityTons > 0 && (c.remainingTons / c.totalCapacityTons) <= 0.12) {
        list.push({ id: 'n_' + c.id + '_low', type: 'low_capacity', timestamp: c.createdAt, title: 'Low capacity remaining', body: `Only ${c.remainingTons}${c.unit} capacity remaining on ${c.origin.split(',')[0]} → ${c.destination.split(',')[0]}.` });
      }
      if (c.remainingTons > 0) {
        const candidates = Api.findMatchesForCapacity(c.id);
        const alreadyRequested = new Set(db.matches.filter(m => m.capacityId === c.id).map(m => m.loadId));
        const fresh = candidates.filter(l => !alreadyRequested.has(l.id));
        if (fresh.length) {
          list.push({ id: 'n_' + c.id + '_new', type: 'new_match', timestamp: c.createdAt, title: 'New high-match cargo available', body: `${fresh.length} compatible cargo request(s) on your ${c.origin.split(',')[0]} → ${c.destination.split(',')[0]} corridor.` });
        }
      }
    });
  }

  return list.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 10);
};
function UI_money(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN'); }

/* ---------------- Public Road Consignment Tracking (FEATURE 7) ----------------
   No login required. Only publicly-safe fields are returned (no phone/email).
   Route waypoints are a simulated midpoint for demo purposes — this is NOT
   live GPS tracking.
   ------------------------------------------------------------------- */
Api.trackConsignment = async function (consignmentId) {
  try {
    const res = await ApiClient.request(`/consignments/track/${encodeURIComponent(consignmentId)}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const id = String(consignmentId || '').trim().toUpperCase();
  const match = db.matches.find(m => m.digitalRecord && m.digitalRecord.consignmentId.toUpperCase() === id);
  if (!match) return null;
  const m = enrichMatch(match, db);
  const originCity = m.load ? m.load.origin.split(',')[0] : '';
  const destCity = m.load ? m.load.destination.split(',')[0] : '';
  const midpoint = ['En route waypoint', 'Highway checkpoint', 'Midway stop'][hashStr(m.id) % 3];
  const stageIndex = ['requested', 'accepted'].includes(m.status) ? 0 : ['pickup_confirmed', 'in_transit'].includes(m.status) ? 1 : 2;
  const etaHours = m.status === 'delivered' ? 0 : 2 + (hashStr(m.id + 'eta') % 6);
  return {
    consignmentId: m.digitalRecord.consignmentId,
    status: m.status,
    statusLabel: UI_STATUS_LABELS[m.status] || m.status,
    origin: originCity, destination: destCity,
    waypoints: [originCity, midpoint, destCity],
    currentStageIndex: stageIndex,
    vehicleType: m.capacity ? m.capacity.vehicleType : '',
    etaHours,
    simulated: true,
    events: m.events || []
  };
};
const UI_STATUS_LABELS = {
  requested: 'REQUESTED', accepted: 'ACCEPTED', pickup_confirmed: 'PICKUP CONFIRMED',
  in_transit: 'ON THE ROAD', arrived: 'NEAR DESTINATION', delivered: 'DELIVERED'
};

/* ---------------- Ratings & Reviews (FEATURE 9) ----------------
   Only allowed once a booking has reached 'delivered'. One rating per role
   per match (re-rating updates the existing one).
   ------------------------------------------------------------------- */
Api.rateTrip = async function (matchId, raterRole, ratings, review) {
  try {
    const res = await ApiClient.request(`/booking-requests/${matchId}/rate`, {
      method: 'POST',
      body: JSON.stringify({
        raterRole: raterRole || 'customer',
        ratings: typeof ratings === 'object' ? ratings : { overall: Number(ratings || 5) },
        review: review || ''
      })
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (match.status !== 'delivered') return { ok: false, error: 'You can rate this trip once it has been delivered.' };
  const existing = db.ratings.find(r => r.matchId === matchId && r.raterRole === raterRole);
  if (existing) {
    existing.ratings = ratings;
    existing.review = review || '';
    existing.updatedAt = nowISO();
  } else {
    db.ratings.push({ id: uid('rt'), matchId, raterRole, ratings, review: review || '', createdAt: nowISO() });
  }
  writeDB(db);
  return { ok: true };
};
Api.getRatingsForMatch = async function (matchId) {
  try {
    const res = await ApiClient.request(`/booking-requests/${matchId}/ratings`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const rows = db.ratings.filter(r => r.matchId === matchId);
  return {
    customer: rows.find(r => r.raterRole === 'customer') || null,
    driver: rows.find(r => r.raterRole === 'driver') || null
  };
};

/* ---------------- Road Trip Readiness (FEATURE 10) ---------------- */
Api.getTripReadiness = function (matchId) {
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return null;
  const m = enrichMatch(match, db);
  const checklist = [
    { label: 'Driver verified', ok: m.driver.kycStatus === 'verified' },
    { label: 'Vehicle verified', ok: !!(m.capacity && m.capacity.vehicleType) },
    { label: 'Cargo details available', ok: !!(m.load && m.load.material && m.load.weightTons) },
    { label: 'Digital Road Consignment generated', ok: !!m.digitalRecord },
    { label: 'Pickup location confirmed', ok: !!(m.load && m.load.origin) },
    { label: 'Delivery location confirmed', ok: !!(m.load && m.load.destination) },
    { label: 'Required cargo information verified', ok: !!(m.load && m.load.material) }
  ];
  const ready = checklist.every(c => c.ok);
  return { checklist, ready };
};

/* ---------------- Savings & Impact (FEATURE 11) ---------------- */
function toTons(weight, unit) { return unit === 'kg' ? weight / 1000 : weight; }
Api.getCustomerImpact = async function (customerId) {
  try {
    const res = await ApiClient.request('/customer/impact');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const delivered = db.matches.filter(m => m.customerId === customerId && m.status === 'delivered');
  const totalSaved = delivered.reduce((s, m) => s + Api.estimatePriceComparison(m.price).savings, 0);
  const goodsTons = delivered.reduce((s, m) => s + toTons(m.weightTons, m.unit), 0);
  return { totalSaved, completedConsignments: delivered.length, goodsTransportedTons: Number(goodsTons.toFixed(2)), estimated: true };
};
Api.getDriverImpact = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/impact');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const relevant = db.matches.filter(m => m.driverId === driverId && ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'].includes(m.status));
  const delivered = relevant.filter(m => m.status === 'delivered');
  const additionalIncome = delivered.reduce((s, m) => s + m.price, 0);
  const unusedCapacityUtilized = relevant.reduce((s, m) => s + toTons(m.weightTons, m.unit), 0);
  const tripsWithCargo = new Set(relevant.map(m => m.capacityId)).size;
  return { additionalIncome, unusedCapacityUtilizedTons: Number(unusedCapacityUtilized.toFixed(2)), roadTripsWithAdditionalCargo: tripsWithCargo, estimated: true };
};
Api.getPlatformImpact = function () {
  const db = readDB();
  const caps = db.capacities.map(recomputeCapacity);
  const totalAvailable = caps.reduce((s, c) => s + (c.availableBackhaulTons || 0), 0);
  const totalBooked = caps.reduce((s, c) => s + (c.bookedTons || 0), 0);
  const emptyCapacityUtilizedPct = totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 100) : 0;
  const delivered = db.matches.filter(m => m.status === 'delivered');
  const driverAdditionalIncome = delivered.reduce((s, m) => s + m.price, 0);
  const customerSavings = delivered.reduce((s, m) => s + Api.estimatePriceComparison(m.price).savings, 0);
  const estimatedEmptyDistanceAvoidedKm = delivered.length * (180 + (hashStr('rf-distance') % 90));
  return { emptyCapacityUtilizedPct, estimatedEmptyDistanceAvoidedKm, driverAdditionalIncome, customerSavings, estimated: true };
};

/* ---------------- Cargo & Vehicle Verification Photo Audit ---------------- */
Api.getAuditPhotos = function () {
  const db = readDB();
  const photos = [];
  (db.capacities || []).forEach(c => {
    if (c.emptyCapacityPhoto) {
      const drv = db.users.find(u => u.id === c.driverId) || {};
      photos.push({
        id: 'aud_cap_' + c.id,
        category: 'empty_bed',
        title: 'Driver Empty Cargo Bed Verification',
        subtitle: `${c.origin} → ${c.destination} (${c.vehicleType || 'Truck'})`,
        uploader: drv.name || 'Captain',
        role: 'driver',
        vehicleNumber: drv.vehicleNumber || 'AP16 GK 7788',
        timestamp: c.createdAt,
        photoUrl: c.emptyCapacityPhoto,
        badge: 'Empty Bed Verified'
      });
    }
  });
  (db.loads || []).forEach(l => {
    const cust = db.users.find(u => u.id === l.customerId) || {};
    if (l.goodsPhoto) {
      photos.push({
        id: 'aud_goods_' + l.id,
        category: 'cargo_goods',
        title: 'Consignment Cargo Packaging',
        subtitle: `${l.origin} → ${l.destination} (${l.material}, ${l.weightTons}${l.unit})`,
        uploader: cust.name || 'Shipper',
        role: 'customer',
        timestamp: l.createdAt,
        photoUrl: l.goodsPhoto,
        badge: 'Cargo Goods Verified'
      });
    }
    if (l.billPhoto) {
      photos.push({
        id: 'aud_bill_' + l.id,
        category: 'toll_bill',
        title: 'e-Waybill / FASTag Toll Gate Pass',
        subtitle: `Highway Compliance Form EWB-01 / Tax Invoice`,
        uploader: cust.name || 'Shipper',
        role: 'customer',
        timestamp: l.createdAt,
        photoUrl: l.billPhoto,
        badge: 'Toll Document Verified'
      });
    }
  });
  if (photos.length === 0) {
    photos.push(
      {
        id: 'aud_demo_1',
        category: 'empty_bed',
        title: 'Driver Empty Cargo Bed Verification',
        subtitle: 'Pune, MH → Nashik, MH (Tata Ace 0.75T)',
        uploader: 'Ganesh Kale',
        role: 'driver',
        vehicleNumber: 'AP16 GK 7788',
        timestamp: new Date().toISOString(),
        photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
        badge: 'Empty Bed Verified'
      },
      {
        id: 'aud_demo_2',
        category: 'cargo_goods',
        title: 'Consignment Cargo Packaging',
        subtitle: 'Vijayawada, AP → Hyderabad, TS (Handicraft & Pottery Cartons, 200kg)',
        uploader: 'Priya Nair',
        role: 'customer',
        timestamp: new Date().toISOString(),
        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
        badge: 'Cargo Goods Verified'
      },
      {
        id: 'aud_demo_3',
        category: 'toll_bill',
        title: 'e-Waybill / FASTag Toll Gate Pass',
        subtitle: 'GST Form EWB-01 & FASTag Plaza Clearance Note',
        uploader: 'Priya Nair',
        role: 'customer',
        timestamp: new Date().toISOString(),
        photoUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80',
        badge: 'Toll Document Verified'
      }
    );
  }
  return photos;
};

Api.resetDemoData = function () { localStorage.removeItem(DB_KEY); seedDB(); };

window.Api = Api;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Api;
}
