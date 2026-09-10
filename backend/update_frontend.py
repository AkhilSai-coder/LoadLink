import os
import re

BASE_DIR = r"d:\SIH"

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Reading mockApi.js...")
mock_api = read_file(os.path.join(BASE_DIR, "js", "mockApi.js"))

# 1. Update ApiClient at top of mockApi.js if not present
api_client_code = """
/* --- ROUTEFILL Backend REST Client --- */
const API_BASE_URL = 'http://localhost:8080/api';
const ApiClient = window.ApiClient || {
  baseUrl: API_BASE_URL,
  getToken() { return sessionStorage.getItem('routefill_token'); },
  setToken(token) { sessionStorage.setItem('routefill_token', token); },
  clearToken() { sessionStorage.removeItem('routefill_token'); },
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(url, { ...options, headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, status: res.status, error: (json && (json.error || json.message)) || `Request failed (${res.status})` };
      }
      return json;
    } catch (err) {
      return { ok: false, networkError: true, error: err.message };
    }
  }
};
window.ApiClient = ApiClient;
"""

if "/* --- ROUTEFILL Backend REST Client --- */" not in mock_api:
    mock_api = mock_api.replace("const DB_KEY = 'routefill_db_v2';", api_client_code + "\nconst DB_KEY = 'routefill_db_v2';")

# 2. Upgrade Api methods to async and REST-first with fallback
# Auth
old_login = """Api.login = function (email, password) {
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
  if (!user) return { ok: false, error: 'Email or password is incorrect.' };
  const { password: _pw, ...safeUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return { ok: true, user: safeUser };
};"""

new_login = """Api.login = async function (email, password) {
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
};"""
mock_api = mock_api.replace(old_login, new_login)

old_register = """Api.register = function (payload) {
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user = {
    id: uid('u'),
    role: payload.role,
    name: payload.name,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
    createdAt: nowISO()
  };
  if (payload.role === 'customer') {
    user.company = payload.company || '';
  }
  if (payload.role === 'driver') {
    user.vehicleType = payload.vehicleType || '';
    user.vehicleNumber = payload.vehicleNumber || '';
    user.kycStatus = 'none';
    user.kycDocs = {};
  }
  db.users.push(user);
  writeDB(db);
  const { password: _pw, ...safeUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return { ok: true, user: safeUser };
};"""

new_register = """Api.register = async function (payload) {
  try {
    const res = await ApiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.token && res.user) {
      ApiClient.setToken(res.token);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
      const db = readDB();
      db.users.push(res.user);
      writeDB(db);
      return { ok: true, user: res.user };
    }
    if (res && res.ok === false && !res.networkError) {
      return { ok: false, error: res.error || 'Registration failed.' };
    }
  } catch (e) {}
  const db = readDB();
  if (db.users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user = {
    id: uid('u'), role: payload.role, name: payload.name, email: payload.email,
    password: payload.password, phone: payload.phone, createdAt: nowISO()
  };
  if (payload.role === 'customer') user.company = payload.company || '';
  if (payload.role === 'driver') {
    user.vehicleType = payload.vehicleType || '';
    user.vehicleNumber = payload.vehicleNumber || '';
    user.kycStatus = 'none';
    user.kycDocs = {};
  }
  db.users.push(user);
  writeDB(db);
  const { password: _pw, ...safeUser } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return { ok: true, user: safeUser };
};"""
mock_api = mock_api.replace(old_register, new_register)

old_loads_by_customer = """Api.getLoadsByCustomer = function (customerId) {
  return readDB().loads.filter(l => l.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""

new_loads_by_customer = """Api.getLoadsByCustomer = async function (customerId) {
  try {
    const res = await ApiClient.request('/customer/loads');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().loads.filter(l => l.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""
mock_api = mock_api.replace(old_loads_by_customer, new_loads_by_customer)

old_get_open_loads = """Api.getOpenLoads = function () {
  return readDB().loads.filter(l => l.status === 'open');
};"""

new_get_open_loads = """Api.getOpenLoads = async function () {
  try {
    const res = await ApiClient.request('/cargo-loads/open');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().loads.filter(l => l.status === 'open');
};"""
mock_api = mock_api.replace(old_get_open_loads, new_get_open_loads)

old_get_load = """Api.getLoad = function (id) {
  return readDB().loads.find(l => l.id === id) || null;
};"""

new_get_load = """Api.getLoad = async function (id) {
  try {
    const res = await ApiClient.request(`/cargo-loads/${id}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  return readDB().loads.find(l => l.id === id) || null;
};"""
mock_api = mock_api.replace(old_get_load, new_get_load)

old_create_load = """Api.createLoad = function (payload) {
  const db = readDB();
  const load = {
    id: uid('ld'),
    customerId: payload.customerId,
    material: payload.material,
    weightTons: Number(payload.weightTons),
    unit: payload.unit || 'T',
    origin: payload.origin,
    destination: payload.destination,
    pickupDate: payload.pickupDate,
    budget: Number(payload.budget),
    notes: payload.notes || '',
    status: payload.saveAsDraft ? 'draft' : 'open',
    createdAt: nowISO()
  };
  db.loads.push(load);
  writeDB(db);
  return { ok: true, load };
};"""

new_create_load = """Api.createLoad = async function (payload) {
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
    createdAt: nowISO()
  };
  db.loads.push(load);
  writeDB(db);
  return { ok: true, load };
};"""
mock_api = mock_api.replace(old_create_load, new_create_load)

old_publish_load = """Api.publishLoad = function (id) {
  const db = readDB();
  const idx = findIndexById(db.loads, id);
  if (idx === -1) return { ok: false, error: 'Load not found.' };
  db.loads[idx].status = 'open';
  writeDB(db);
  return { ok: true, load: db.loads[idx] };
};"""

new_publish_load = """Api.publishLoad = async function (id) {
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
};"""
mock_api = mock_api.replace(old_publish_load, new_publish_load)

old_cancel_load = """Api.cancelLoad = function (id) {
  const db = readDB();
  const idx = findIndexById(db.loads, id);
  if (idx === -1) return { ok: false, error: 'Load not found.' };
  db.loads[idx].status = 'cancelled';
  writeDB(db);
  return { ok: true };
};"""

new_cancel_load = """Api.cancelLoad = async function (id) {
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
};"""
mock_api = mock_api.replace(old_cancel_load, new_cancel_load)

# Capacities
old_caps_by_driver = """Api.getCapacitiesByDriver = function (driverId) {
  const db = readDB();
  return db.capacities.filter(c => c.driverId === driverId).map(recomputeCapacity).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""

new_caps_by_driver = """Api.getCapacitiesByDriver = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/trips');
    if (res && res.ok && Array.isArray(res.data)) return res.data.map(recomputeCapacity);
  } catch (e) {}
  return readDB().capacities.filter(c => c.driverId === driverId).map(recomputeCapacity).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""
mock_api = mock_api.replace(old_caps_by_driver, new_caps_by_driver)

old_get_open_caps = """Api.getOpenCapacities = function () {
  const db = readDB();
  return db.capacities.filter(c => c.status === 'open' || c.remainingTons > 0).map(recomputeCapacity).filter(c => c.remainingTons > 0);
};"""

new_get_open_caps = """Api.getOpenCapacities = async function () {
  try {
    const res = await ApiClient.request('/road-trips/open');
    if (res && res.ok && Array.isArray(res.data)) return res.data.map(recomputeCapacity);
  } catch (e) {}
  return readDB().capacities.filter(c => c.status === 'open' || c.remainingTons > 0).map(recomputeCapacity).filter(c => c.remainingTons > 0);
};"""
mock_api = mock_api.replace(old_get_open_caps, new_get_open_caps)

old_get_cap = """Api.getCapacity = function (id) {
  const db = readDB();
  const c = db.capacities.find(x => x.id === id);
  return c ? recomputeCapacity(c) : null;
};"""

new_get_cap = """Api.getCapacity = async function (id) {
  try {
    const res = await ApiClient.request(`/road-trips/${id}`);
    if (res && res.ok && res.data) return recomputeCapacity(res.data);
  } catch (e) {}
  const db = readDB();
  const c = db.capacities.find(x => x.id === id);
  return c ? recomputeCapacity(c) : null;
};"""
mock_api = mock_api.replace(old_get_cap, new_get_cap)

old_create_cap = """Api.createCapacity = function (payload) {
  const db = readDB();
  const total = Number(payload.totalCapacityTons != null ? payload.totalCapacityTons : payload.capacityTons);
  const existing = Number(payload.existingLoadTons || 0);
  const cap = {
    id: uid('cp'),
    driverId: payload.driverId,
    origin: payload.origin,
    destination: payload.destination,
    vehicleType: payload.vehicleType,
    vehicleNumber: payload.vehicleNumber || '',
    unit: payload.unit || 'T',
    totalCapacityTons: total,
    existingLoadTons: existing,
    bookedTons: 0,
    availableDate: payload.availableDate,
    minPrice: Number(payload.minPrice),
    status: 'open',
    createdAt: nowISO()
  };
  recomputeCapacity(cap);
  db.capacities.push(cap);
  writeDB(db);
  return { ok: true, capacity: cap };
};"""

new_create_cap = """Api.createCapacity = async function (payload) {
  try {
    const total = Number(payload.totalCapacityTons != null ? payload.totalCapacityTons : payload.capacityTons);
    const existing = Number(payload.existingLoadTons || 0);
    const res = await ApiClient.request('/road-trips', {
      method: 'POST',
      body: JSON.stringify({
        origin: payload.origin,
        destination: payload.destination,
        vehicleType: payload.vehicleType,
        vehicleNumber: payload.vehicleNumber || 'AP16 GK 7788',
        unit: payload.unit || 'T',
        totalCapacityTons: total,
        existingLoadTons: existing,
        availableDate: payload.availableDate,
        minPrice: Number(payload.minPrice)
      })
    });
    if (res && res.ok && res.data) return { ok: true, capacity: recomputeCapacity(res.data) };
  } catch (e) {}
  const db = readDB();
  const total = Number(payload.totalCapacityTons != null ? payload.totalCapacityTons : payload.capacityTons);
  const existing = Number(payload.existingLoadTons || 0);
  const cap = {
    id: uid('cp'), driverId: payload.driverId, origin: payload.origin, destination: payload.destination,
    vehicleType: payload.vehicleType, vehicleNumber: payload.vehicleNumber || '', unit: payload.unit || 'T',
    totalCapacityTons: total, existingLoadTons: existing, bookedTons: 0,
    availableDate: payload.availableDate, minPrice: Number(payload.minPrice), status: 'open', createdAt: nowISO()
  };
  recomputeCapacity(cap);
  db.capacities.push(cap);
  writeDB(db);
  return { ok: true, capacity: cap };
};"""
mock_api = mock_api.replace(old_create_cap, new_create_cap)

# Matches
old_matches_cap = """Api.findMatchesForCapacity = function (capacityId) {
  const db = readDB();
  const cap = db.capacities.map(recomputeCapacity).find(c => c.id === capacityId);
  if (!cap) return [];
  const openLoads = db.loads.filter(l => l.status === 'open');
  return openLoads.map(l => {
    const scored = scoreMatch(l, cap, db);
    return {
      ...l,
      matchScore: scored.matchScore,
      matchBreakdown: scored.matchBreakdown,
      reasons: scored.reasons,
      detourKm: scored.detourKm
    };
  }).filter(l => l.matchScore >= 40).sort((a, b) => b.matchScore - a.matchScore);
};"""

new_matches_cap = """Api.findMatchesForCapacity = async function (capacityId) {
  try {
    const res = await ApiClient.request(`/road-trips/${capacityId}/matches`);
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const cap = db.capacities.map(recomputeCapacity).find(c => c.id === capacityId);
  if (!cap) return [];
  const openLoads = db.loads.filter(l => l.status === 'open');
  return openLoads.map(l => {
    const scored = scoreMatch(l, cap, db);
    return { ...l, matchScore: scored.matchScore, matchBreakdown: scored.matchBreakdown, reasons: scored.reasons, detourKm: scored.detourKm };
  }).filter(l => l.matchScore >= 40).sort((a, b) => b.matchScore - a.matchScore);
};"""
mock_api = mock_api.replace(old_matches_cap, new_matches_cap)

old_matches_load = """Api.findMatchesForLoad = function (loadId) {
  const db = readDB();
  const load = db.loads.find(l => l.id === loadId);
  if (!load) return [];
  const openCaps = db.capacities.map(recomputeCapacity).filter(c => c.remainingTons > 0);
  return openCaps.map(c => scoreMatch(load, c, db)).filter(m => m.matchScore >= 40).sort((a, b) => b.matchScore - a.matchScore);
};"""

new_matches_load = """Api.findMatchesForLoad = async function (loadId) {
  try {
    const res = await ApiClient.request(`/cargo-loads/${loadId}/matches`);
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const load = db.loads.find(l => l.id === loadId);
  if (!load) return [];
  const openCaps = db.capacities.map(recomputeCapacity).filter(c => c.remainingTons > 0);
  return openCaps.map(c => scoreMatch(load, c, db)).filter(m => m.matchScore >= 40).sort((a, b) => b.matchScore - a.matchScore);
};"""
mock_api = mock_api.replace(old_matches_load, new_matches_load)

# Bookings & Lifecycle
old_req_booking = """Api.requestBooking = function (loadId, capacityId, price) {
  const db = readDB();
  const load = db.loads.find(l => l.id === loadId);
  const cap = db.capacities.find(c => c.id === capacityId);
  if (!load || !cap) return { ok: false, error: 'Load or capacity not found.' };
  recomputeCapacity(cap);
  if (load.weightTons > cap.remainingTons) return { ok: false, error: 'This shipment no longer fits the remaining capacity.' };

  const scoring = computeMatchScore(load, cap, db);
  const match = {
    id: uid('mt'),
    loadId, capacityId,
    driverId: cap.driverId,
    customerId: load.customerId,
    weightTons: load.weightTons,
    unit: load.unit || cap.unit || 'T',
    price: Number(price) || cap.minPrice || load.budget,
    status: 'requested',
    matchScore: scoring.score,
    matchBreakdown: scoring.breakdown,
    detourKm: scoring.detourKm,
    reasons: scoring.reasons,
    events: [],
    digitalRecord: null,
    pod: null,
    createdAt: nowISO()
  };
  pushEvent(match, 'BOOKING_REQUESTED', 'customer', load.origin);
  db.matches.push(match);
  load.status = 'requested';
  load.matchId = match.id;
  writeDB(db);
  return { ok: true, match };
};"""

new_req_booking = """Api.requestBooking = async function (loadId, capacityId, price) {
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
};"""
mock_api = mock_api.replace(old_req_booking, new_req_booking)

old_decide_booking = """Api.decideBooking = function (matchId, decision, actorLocation) {
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

    // PRIORITY 5 — Digital Logistics Record, auto-generated on acceptance.
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
};"""

new_decide_booking = """Api.decideBooking = async function (matchId, decision, actorLocation) {
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
};"""
mock_api = mock_api.replace(old_decide_booking, new_decide_booking)

old_get_matches_user = """Api.getMatchesForUser = function (userId, role) {
  const db = readDB();
  const key = role === 'driver' ? 'driverId' : 'customerId';
  return db.matches.filter(m => m[key] === userId).map(m => enrichMatch(m, db)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""

new_get_matches_user = """Api.getMatchesForUser = async function (userId, role) {
  try {
    const endpoint = role === 'driver' ? '/driver/bookings' : '/customer/bookings';
    const res = await ApiClient.request(endpoint);
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const key = role === 'driver' ? 'driverId' : 'customerId';
  return db.matches.filter(m => m[key] === userId).map(m => enrichMatch(m, db)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};"""
mock_api = mock_api.replace(old_get_matches_user, new_get_matches_user)

old_get_match = """Api.getMatch = function (id) {
  const db = readDB();
  const m = db.matches.find(x => x.id === id);
  return m ? enrichMatch(m, db) : null;
};"""

new_get_match = """Api.getMatch = async function (id) {
  try {
    const res = await ApiClient.request(`/booking-requests/${id}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const m = db.matches.find(x => x.id === id);
  return m ? enrichMatch(m, db) : null;
};"""
mock_api = mock_api.replace(old_get_match, new_get_match)

old_confirm_pickup = """Api.confirmPickup = function (matchId, location) {
  return advanceTrip(matchId, 'pickup_confirmed', 'PICKUP_CONFIRMED', 'driver', location);
};"""

new_confirm_pickup = """Api.confirmPickup = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Pickup Hub' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'pickup_confirmed', 'PICKUP_CONFIRMED', 'driver', location);
};"""
mock_api = mock_api.replace(old_confirm_pickup, new_confirm_pickup)

old_start_transit = """Api.startTransit = function (matchId, location) {
  return advanceTrip(matchId, 'in_transit', 'IN_TRANSIT', 'driver', location);
};"""

new_start_transit = """Api.startTransit = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/in-transit`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Highway Transit' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'in_transit', 'IN_TRANSIT', 'driver', location);
};"""
mock_api = mock_api.replace(old_start_transit, new_start_transit)

old_mark_arrived = """Api.markArrived = function (matchId, location) {
  return advanceTrip(matchId, 'arrived', 'ARRIVED', 'driver', location);
};"""

new_mark_arrived = """Api.markArrived = async function (matchId, location) {
  try {
    const res = await ApiClient.request(`/consignments/${matchId}/arrived`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Destination City Depot' })
    });
    if (res && res.ok && res.data) return { ok: true, match: res.data };
  } catch (e) {}
  return advanceTrip(matchId, 'arrived', 'ARRIVED', 'driver', location);
};"""
mock_api = mock_api.replace(old_mark_arrived, new_mark_arrived)

old_initiate_delivery = """Api.initiateDelivery = function (matchId) {
  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);
  if (!match) return { ok: false, error: 'Booking not found.' };
  if (match.status !== 'arrived') return { ok: false, error: 'Mark the shipment arrived before generating a delivery OTP.' };
  const otp = String(1000 + (hashStr(matchId + Date.now()) % 9000));
  match.pod = { otp, otpVerified: false, podId: null, deliveryTime: null, deliveryLocation: null, receiverName: null };
  writeDB(db);
  return { ok: true, otp };
};"""

new_initiate_delivery = """Api.initiateDelivery = async function (matchId) {
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
};"""
mock_api = mock_api.replace(old_initiate_delivery, new_initiate_delivery)

old_verify_otp = """Api.verifyDeliveryOtp = function (matchId, otp, receiverName) {
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
  if (cap) { cap.status = cap.status; } // remaining capacity bookkeeping unaffected by delivery
  writeDB(db);
  return { ok: true, match: enrichMatch(match, db) };
};"""

new_verify_otp = """Api.verifyDeliveryOtp = async function (matchId, otp, receiverName) {
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
};"""
mock_api = mock_api.replace(old_verify_otp, new_verify_otp)

old_get_digital_record = """Api.getDigitalRecord = function (matchId) {
  const m = Api.getMatch(matchId);
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
};"""

new_get_digital_record = """Api.getDigitalRecord = async function (matchId) {
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
};"""
mock_api = mock_api.replace(old_get_digital_record, new_get_digital_record)

old_get_pod = """Api.getPOD = function (matchId) {
  const m = Api.getMatch(matchId);
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
};"""

new_get_pod = """Api.getPOD = async function (matchId) {
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
};"""
mock_api = mock_api.replace(old_get_pod, new_get_pod)

# Platform Stats
old_get_stats = """Api.getPlatformStats = function () {
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
};"""

new_get_stats = """Api.getPlatformStats = async function () {
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
};"""
mock_api = mock_api.replace(old_get_stats, new_get_stats)

# Corridors
old_get_all_corridors = """Api.getAllCorridors = function () {
  const db = readDB();
  const seen = new Map();
  db.capacities.map(recomputeCapacity).forEach(c => {
    const key = cityKey(c.origin) + '>' + cityKey(c.destination);
    if (!seen.has(key)) seen.set(key, { origin: c.origin, destination: c.destination });
  });
  return Array.from(seen.values()).map(({ origin, destination }) => Api.getCorridorSummary(origin, destination));
};"""

new_get_all_corridors = """Api.getAllCorridors = async function () {
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
};"""
mock_api = mock_api.replace(old_get_all_corridors, new_get_all_corridors)

# Tracking
old_track = """Api.trackConsignment = function (consignmentId) {"""
new_track = """Api.trackConsignment = async function (consignmentId) {
  try {
    const res = await ApiClient.request(`/consignments/track/${encodeURIComponent(consignmentId)}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}"""
mock_api = mock_api.replace(old_track, new_track)

# KYC, Bills, Disputes
old_get_kyc = """Api.getKycQueue = function () {
  return readDB().users.filter(u => u.role === 'driver' && u.kycStatus === 'pending');
};"""
new_get_kyc = """Api.getKycQueue = async function () {
  try {
    const res = await ApiClient.request('/admin/kyc-queue');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  return readDB().users.filter(u => u.role === 'driver' && u.kycStatus === 'pending');
};"""
mock_api = mock_api.replace(old_get_kyc, new_get_kyc)

old_decide_kyc = """Api.decideKyc = function (driverId, decision, note) {
  const db = readDB();
  const idx = findIndexById(db.users, driverId);
  if (idx === -1) return { ok: false };
  db.users[idx].kycStatus = decision;
  db.users[idx].kycNote = note || '';
  writeDB(db);
  return { ok: true };
};"""
new_decide_kyc = """Api.decideKyc = async function (driverId, decision, note) {
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
};"""
mock_api = mock_api.replace(old_decide_kyc, new_decide_kyc)

old_submit_kyc = """Api.submitKyc = function (driverId, docs) {
  const db = readDB();
  const idx = findIndexById(db.users, driverId);
  if (idx === -1) return { ok: false };
  db.users[idx].kycDocs = docs;
  db.users[idx].kycStatus = 'pending';
  writeDB(db);
  return { ok: true };
};"""
new_submit_kyc = """Api.submitKyc = async function (driverId, docs) {
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
};"""
mock_api = mock_api.replace(old_submit_kyc, new_submit_kyc)

old_submit_bill = """Api.submitBill = function (matchId, freightAmount, tollCharges, otherCharges, submittedBy) {
  const db = readDB();
  const bill = { id: uid('bl'), matchId, freightAmount: Number(freightAmount), tollCharges: Number(tollCharges) || 0, otherCharges: Number(otherCharges) || 0, status: 'pending', submittedBy, createdAt: nowISO() };
  db.bills.push(bill);
  writeDB(db);
  return { ok: true, bill };
};"""
new_submit_bill = """Api.submitBill = async function (matchId, freightAmount, tollCharges, otherCharges, submittedBy) {
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
};"""
mock_api = mock_api.replace(old_submit_bill, new_submit_bill)

old_get_bills_driver = """Api.getBillsForDriver = function (driverId) {
  const db = readDB();
  const myMatchIds = db.matches.filter(m => m.driverId === driverId).map(m => m.id);
  return db.bills.filter(b => myMatchIds.includes(b.matchId)).map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};"""
new_get_bills_driver = """Api.getBillsForDriver = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/bills');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  const myMatchIds = db.matches.filter(m => m.driverId === driverId).map(m => m.id);
  return db.bills.filter(b => myMatchIds.includes(b.matchId)).map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};"""
mock_api = mock_api.replace(old_get_bills_driver, new_get_bills_driver)

old_get_bill_queue = """Api.getBillQueue = function () {
  const db = readDB();
  return db.bills.filter(b => b.status === 'pending').map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};"""
new_get_bill_queue = """Api.getBillQueue = async function () {
  try {
    const res = await ApiClient.request('/admin/bills');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  return db.bills.filter(b => b.status === 'pending').map(b => ({ ...b, match: enrichMatch(db.matches.find(m => m.id === b.matchId), db) }));
};"""
mock_api = mock_api.replace(old_get_bill_queue, new_get_bill_queue)

old_decide_bill = """Api.decideBill = function (billId, decision) {
  const db = readDB();
  const idx = findIndexById(db.bills, billId);
  if (idx === -1) return { ok: false };
  db.bills[idx].status = decision;
  writeDB(db);
  return { ok: true };
};"""
new_decide_bill = """Api.decideBill = async function (billId, decision) {
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
};"""
mock_api = mock_api.replace(old_decide_bill, new_decide_bill)

# Disputes
old_raise_dispute = """Api.raiseDispute = function (matchId, raisedBy, reason) {
  const db = readDB();
  const d = { id: uid('ds'), matchId, raisedBy, reason, status: 'open', createdAt: nowISO() };
  db.disputes.push(d);
  const m = db.matches.find(x => x.id === matchId);
  if (m) m.status = 'disputed';
  writeDB(db);
  return { ok: true, dispute: d };
};"""
new_raise_dispute = """Api.raiseDispute = async function (matchId, raisedBy, reason) {
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
};"""
mock_api = mock_api.replace(old_raise_dispute, new_raise_dispute)

old_get_disputes = """Api.getDisputes = function () {
  const db = readDB();
  return db.disputes.map(d => ({ ...d, match: enrichMatch(db.matches.find(m => m.id === d.matchId) || {}, db) }));
};"""
new_get_disputes = """Api.getDisputes = async function () {
  try {
    const res = await ApiClient.request('/disputes');
    if (res && res.ok && Array.isArray(res.data)) return res.data;
  } catch (e) {}
  const db = readDB();
  return db.disputes.map(d => ({ ...d, match: enrichMatch(db.matches.find(m => m.id === d.matchId) || {}, db) }));
};"""
mock_api = mock_api.replace(old_get_disputes, new_get_disputes)

old_resolve_dispute = """Api.resolveDispute = function (id, resolutionNote) {
  const db = readDB();
  const idx = findIndexById(db.disputes, id);
  if (idx === -1) return { ok: false };
  db.disputes[idx].status = 'resolved';
  db.disputes[idx].resolutionNote = resolutionNote;
  writeDB(db);
  return { ok: true };
};"""
new_resolve_dispute = """Api.resolveDispute = async function (id, resolutionNote) {
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
};"""
mock_api = mock_api.replace(old_resolve_dispute, new_resolve_dispute)

# Driver Trust Profile
old_trust = """Api.getDriverTrustProfile = function (driverId) {
  const db = readDB();
  return calcDriverTrust(driverId, db);
};"""
new_trust = """Api.getDriverTrustProfile = async function (driverId) {
  try {
    const res = await ApiClient.request('/driver/trust-profile');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  return calcDriverTrust(driverId, db);
};"""
mock_api = mock_api.replace(old_trust, new_trust)

# Ratings
old_rate = """Api.rateTrip = function (matchId, raterRole, ratings, review) {"""
new_rate = """Api.rateTrip = async function (matchId, raterRole, ratings, review) {
  try {
    const score = typeof ratings === 'object' ? (ratings.overall || ratings.score || 5) : Number(ratings || 5);
    const res = await ApiClient.request('/ratings', {
      method: 'POST',
      body: JSON.stringify({
        consignmentId: matchId,
        score,
        comment: review || ''
      })
    });
    if (res && res.ok) return { ok: true };
  } catch (e) {}"""
mock_api = mock_api.replace(old_rate, new_rate)

old_get_ratings = """Api.getRatingsForMatch = function (matchId) {"""
new_get_ratings = """Api.getRatingsForMatch = async function (matchId) {
  try {
    const res = await ApiClient.request(`/ratings/${matchId}`);
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}"""
mock_api = mock_api.replace(old_get_ratings, new_get_ratings)

# Impact
old_cust_impact = """Api.getCustomerImpact = function (customerId) {
  const db = readDB();
  const delivered = db.matches.filter(m => m.customerId === customerId && m.status === 'delivered');
  const totalSaved = delivered.reduce((s, m) => s + Api.estimatePriceComparison(m.price).savings, 0);
  const goodsTons = delivered.reduce((s, m) => s + toTons(m.weightTons, m.unit), 0);
  return { totalSaved, completedConsignments: delivered.length, goodsTransportedTons: Number(goodsTons.toFixed(2)), estimated: true };
};"""
new_cust_impact = """Api.getCustomerImpact = async function (customerId) {
  try {
    const res = await ApiClient.request('/customer/impact');
    if (res && res.ok && res.data) return res.data;
  } catch (e) {}
  const db = readDB();
  const delivered = db.matches.filter(m => m.customerId === customerId && m.status === 'delivered');
  const totalSaved = delivered.reduce((s, m) => s + Api.estimatePriceComparison(m.price).savings, 0);
  const goodsTons = delivered.reduce((s, m) => s + toTons(m.weightTons, m.unit), 0);
  return { totalSaved, completedConsignments: delivered.length, goodsTransportedTons: Number(goodsTons.toFixed(2)), estimated: true };
};"""
mock_api = mock_api.replace(old_cust_impact, new_cust_impact)

old_drv_impact = """Api.getDriverImpact = function (driverId) {
  const db = readDB();
  const relevant = db.matches.filter(m => m.driverId === driverId && ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'].includes(m.status));
  const delivered = relevant.filter(m => m.status === 'delivered');
  const additionalIncome = delivered.reduce((s, m) => s + m.price, 0);
  const unusedCapacityUtilized = relevant.reduce((s, m) => s + toTons(m.weightTons, m.unit), 0);
  const tripsWithCargo = new Set(relevant.map(m => m.capacityId)).size;
  return { additionalIncome, unusedCapacityUtilizedTons: Number(unusedCapacityUtilized.toFixed(2)), roadTripsWithAdditionalCargo: tripsWithCargo, estimated: true };
};"""
new_drv_impact = """Api.getDriverImpact = async function (driverId) {
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
};"""
mock_api = mock_api.replace(old_drv_impact, new_drv_impact)

write_file(os.path.join(BASE_DIR, "js", "mockApi.js"), mock_api)
print("mockApi.js successfully updated with Spring Boot REST API integration!")
