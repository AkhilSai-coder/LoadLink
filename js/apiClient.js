/* ==========================================================================
   ROUTEFILL — apiClient.js
   Production-grade REST API client for ROUTEFILL backend (Spring Boot + PostgreSQL).
   Connects to http://localhost:8080/api with JWT authentication.
   ========================================================================== */

(function () {
  'use strict';

  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8080/api';
  window.API_BASE_URL = API_BASE_URL;

  const ApiClient = {
    baseUrl: API_BASE_URL,

  getToken() {
    return sessionStorage.getItem('loadlink_token') || sessionStorage.getItem('routefill_token');
  },

  setToken(token) {
    sessionStorage.setItem('loadlink_token', token);
    sessionStorage.setItem('routefill_token', token);
  },

  clearToken() {
    sessionStorage.removeItem('loadlink_token');
    sessionStorage.removeItem('routefill_token');
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        let errMsg = `Request failed with status ${res.status}`;
        if (json) {
          if (json.message) {
            errMsg = json.message;
          } else if (Array.isArray(json.errors) && json.errors.length) {
            errMsg = json.errors.map(e => e.defaultMessage || e.field || String(e)).join(', ');
          } else if (json.error && typeof json.error === 'string' && json.error !== 'BAD_REQUEST') {
            errMsg = json.error;
          }
        }
        return {
          ok: false,
          status: res.status,
          error: errMsg
        };
      }
      return json;
    } catch (err) {
      console.warn('API connection failed, using local fallback:', err);
      return { ok: false, networkError: true, error: err.message || 'Network error connecting to ROUTEFILL backend.' };
    }
  },

  // --- Auth Endpoints ---
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(payload) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // --- Customer & Cargo Load Endpoints ---
  async getLoadsByCustomer() {
    return this.request('/customer/loads');
  },

  async getOpenLoads() {
    return this.request('/cargo-loads/open');
  },

  async getLoad(id) {
    return this.request(`/cargo-loads/${id}`);
  },

  async createLoad(payload) {
    return this.request('/cargo-loads', {
      method: 'POST',
      body: JSON.stringify({
        material: payload.material,
        weightTons: payload.weightTons,
        unit: payload.unit || 'T',
        origin: payload.origin,
        destination: payload.destination,
        pickupDate: payload.pickupDate,
        budget: payload.budget,
        notes: payload.notes || ''
      })
    });
  },

  async publishLoad(id) {
    return this.request(`/cargo-loads/${id}/publish`, { method: 'POST' });
  },

  async cancelLoad(id) {
    return this.request(`/cargo-loads/${id}/cancel`, { method: 'POST' });
  },

  async findMatchesForLoad(loadId) {
    return this.request(`/cargo-loads/${loadId}/matches`);
  },

  // --- Driver & Road Trip Endpoints ---
  async getTripsByDriver() {
    return this.request('/driver/trips');
  },

  async getOpenTrips() {
    return this.request('/road-trips/open');
  },

  async getTrip(id) {
    return this.request(`/road-trips/${id}`);
  },

  async createTrip(payload) {
    return this.request('/road-trips', {
      method: 'POST',
      body: JSON.stringify({
        origin: payload.origin,
        destination: payload.destination,
        vehicleType: payload.vehicleType,
        vehicleNumber: payload.vehicleNumber,
        unit: payload.unit || 'T',
        totalCapacityTons: payload.totalCapacityTons,
        existingLoadTons: payload.existingLoadTons || 0,
        availableDate: payload.availableDate,
        minPrice: payload.minPrice,
        returnTripCorridor: payload.returnTripCorridor || true
      })
    });
  },

  async findMatchesForTrip(tripId) {
    return this.request(`/road-trips/${tripId}/matches`);
  },

  // --- Bookings / Matches Endpoints ---
  async requestBooking(payload) {
    return this.request('/booking-requests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async decideBooking(id, action, driverNote) {
    return this.request(`/booking-requests/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision: action, actorLocation: driverNote })
    });
  },

  async cancelBooking(id, reason) {
    return this.request(`/booking-requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Cancelled by user' })
    });
  },

  async getBooking(id) {
    return this.request(`/booking-requests/${id}`);
  },

  async getCustomerBookings() {
    return this.request('/customer/bookings');
  },

  async getDriverBookings() {
    return this.request('/driver/bookings');
  },

  // --- Consignment & Delivery Lifecycle ---
  async confirmPickup(matchId, location) {
    return this.request(`/consignments/${matchId}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Pickup Hub' })
    });
  },

  async startTransit(matchId, location) {
    return this.request(`/consignments/${matchId}/in-transit`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'On National Highway' })
    });
  },

  async markArrived(matchId, location) {
    return this.request(`/consignments/${matchId}/arrived`, {
      method: 'POST',
      body: JSON.stringify({ location: location || 'Destination City Depot' })
    });
  },

  async initiateDelivery(matchId) {
    return this.request(`/consignments/${matchId}/delivery/initiate`, {
      method: 'POST'
    });
  },

  async verifyDeliveryOtp(matchId, otp, receiverName, receiverPhone, podNotes) {
    return this.request(`/consignments/${matchId}/delivery/verify`, {
      method: 'POST',
      body: JSON.stringify({
        otp,
        receiverName: receiverName || 'Consignee',
        receiverPhone: receiverPhone || '+91 98765 43210',
        podNotes: podNotes || 'Delivered safely via ROUTEFILL road network'
      })
    });
  },

  async getDigitalRecord(matchId) {
    return this.request(`/consignments/${matchId}/digital-record`);
  },

  async getPOD(matchId) {
    return this.request(`/consignments/${matchId}/pod`);
  },

  async trackConsignment(consignmentId) {
    return this.request(`/consignments/track/${consignmentId}`);
  },

  // --- Ratings & Reviews ---
  async rateTrip(matchId, raterRole, ratings, review) {
    return this.request(`/booking-requests/${matchId}/rate`, {
      method: 'POST',
      body: JSON.stringify({
        raterRole: raterRole || 'customer',
        ratings: typeof ratings === 'object' ? ratings : { overall: Number(ratings) },
        review: review || ''
      })
    });
  },

  async getRatingsForMatch(matchId) {
    return this.request(`/booking-requests/${matchId}/ratings`);
  },

  // --- Driver KYC, Photos & Bills ---
  async submitKyc(docs) {
    return this.request('/driver/kyc', {
      method: 'POST',
      body: JSON.stringify(docs)
    });
  },

  async addTripPhoto(matchId, type, label) {
    return this.request('/driver/trip-photos', {
      method: 'POST',
      body: JSON.stringify({ matchId, type, label })
    });
  },

  async getTripPhotos(matchId) {
    return this.request(`/driver/trip-photos/${matchId}`);
  },

  async submitBill(matchId, freightAmount, tollCharges, otherCharges) {
    return this.request(`/driver/bills?matchId=${matchId}`, {
      method: 'POST',
      body: JSON.stringify({
        freightAmount: Number(freightAmount),
        tollCharges: Number(tollCharges || 0),
        otherCharges: Number(otherCharges || 0)
      })
    });
  },

  async getBillsForDriver() {
    return this.request('/driver/bills');
  },

  // --- Admin Endpoints ---
  async getKycQueue() {
    return this.request('/admin/kyc-queue');
  },

  async decideKyc(driverId, decision, note) {
    return this.request(`/admin/kyc/${driverId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, note: note || '' })
    });
  },

  async getBillQueue() {
    return this.request('/admin/bills');
  },

  async decideBill(billId, decision) {
    return this.request(`/admin/bills/${billId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision })
    });
  },

  async getDisputes() {
    return this.request('/disputes');
  },

  async raiseDispute(matchId, reason) {
    return this.request('/disputes', {
      method: 'POST',
      body: JSON.stringify({ matchId, reason })
    });
  },

  async resolveDispute(id, resolutionNote) {
    return this.request(`/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNote })
    });
  },

  // --- Analytics & Public ---
  async getPlatformStats() {
    return this.request('/analytics/platform-stats');
  },

  async getAllCorridors() {
    return this.request('/analytics/corridors');
  },

  async getDriverTrustProfile() {
    return this.request('/driver/trust-profile');
  },

  async getCustomerImpact() {
    return this.request('/customer/impact');
  },

  async getDriverImpact() {
    return this.request('/driver/impact');
  }
};

  window.ApiClient = ApiClient;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
  }
})();
