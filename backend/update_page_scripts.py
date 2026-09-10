import os

BASE_DIR = r"d:\SIH"

def update_file(rel_path, old_text, new_text):
    full_path = os.path.join(BASE_DIR, rel_path)
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    if old_text not in content:
        print(f"WARNING: old_text not found in {rel_path}")
        return False
    content = content.replace(old_text, new_text)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {rel_path}")
    return True

# 1. login.js
update_file(
    "login.js",
    "document.getElementById('loginForm').addEventListener('submit', function (e) {",
    "document.getElementById('loginForm').addEventListener('submit', async function (e) {"
)
update_file(
    "login.js",
    "const result = Api.login(emailEl.value.trim(), passEl.value);",
    "const result = await Api.login(emailEl.value.trim(), passEl.value);"
)

# 2. register.js
update_file(
    "register.js",
    "document.getElementById('registerForm').addEventListener('submit', function (e) {",
    "document.getElementById('registerForm').addEventListener('submit', async function (e) {"
)
update_file(
    "register.js",
    "const result = Api.register(payload);",
    "const result = await Api.register(payload);"
)

# 3. track.js
update_file(
    "track.js",
    "document.getElementById('trackForm').addEventListener('submit', function (e) {",
    "document.getElementById('trackForm').addEventListener('submit', async function (e) {"
)
update_file(
    "track.js",
    "render(id);",
    "await render(id);"
)
update_file(
    "track.js",
    "function render(id) {",
    "async function render(id) {"
)
update_file(
    "track.js",
    "const result = Api.trackConsignment(id);",
    "const result = await Api.trackConsignment(id);"
)

# 4. pages/customer/dashboard.js
update_file(
    "pages/customer/dashboard.js",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'dashboard.html', root: '../../', user });
  document.getElementById('greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0];

  const loads = Api.getLoadsByCustomer(user.id);""",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'dashboard.html', root: '../../', user });
    document.getElementById('greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0];

    const loads = await Api.getLoadsByCustomer(user.id);"""
)
update_file(
    "pages/customer/dashboard.js",
    """      </div>
    `).join('');
  }
}""",
    """      </div>
    `).join('');
  }
  }
  init();
}"""
)

# 5. pages/customer/my-loads.js
update_file(
    "pages/customer/my-loads.js",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'my-loads.html', root: '../../', user });

  const allLoads = Api.getLoadsByCustomer(user.id);""",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'my-loads.html', root: '../../', user });

    const allLoads = await Api.getLoadsByCustomer(user.id);"""
)
update_file(
    "pages/customer/my-loads.js",
    """  render();
}""",
    """  render();
  }
  init();
}"""
)

# 6. pages/customer/post-load.js
update_file(
    "pages/customer/post-load.js",
    "document.getElementById('loadForm').addEventListener('submit', function (e) {",
    "document.getElementById('loadForm').addEventListener('submit', async function (e) {"
)
update_file(
    "pages/customer/post-load.js",
    "const result = Api.createLoad({",
    "const result = await Api.createLoad({"
)

# 7. pages/customer/savings-impact.js
update_file(
    "pages/customer/savings-impact.js",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'savings-impact.html', root: '../../', user });

  const impact = Api.getCustomerImpact(user.id);""",
    """const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'savings-impact.html', root: '../../', user });

    const impact = await Api.getCustomerImpact(user.id);"""
)
update_file(
    "pages/customer/savings-impact.js",
    """  </div>
  `;
}""",
    """  </div>
  `;
  }
  init();
}"""
)

# 8. pages/driver/dashboard.js
update_file(
    "pages/driver/dashboard.js",
    """  const caps = Api.getCapacitiesByDriver(user.id);
  const matches = Api.getMatchesForUser(user.id, 'driver');""",
    """  async function initDashboard() {
    const caps = await Api.getCapacitiesByDriver(user.id);
    const matches = await Api.getMatchesForUser(user.id, 'driver');"""
)
update_file(
    "pages/driver/dashboard.js",
    """  }
}""",
    """  }
  }
  initDashboard();
}"""
)

# 9. pages/driver/post-capacity.js
update_file(
    "pages/driver/post-capacity.js",
    "document.getElementById('capForm').addEventListener('submit', function (e) {",
    "document.getElementById('capForm').addEventListener('submit', async function (e) {"
)
update_file(
    "pages/driver/post-capacity.js",
    "const result = Api.createCapacity({",
    "const result = await Api.createCapacity({"
)

# 10. pages/driver/earnings.js
update_file(
    "pages/driver/earnings.js",
    """const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'earnings.html', root: '../../', user });

  const bills = Api.getBillsForDriver(user.id);""",
    """const user = Auth.requireRole('driver', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'driver', active: 'earnings.html', root: '../../', user });

    const bills = await Api.getBillsForDriver(user.id);"""
)
update_file(
    "pages/driver/earnings.js",
    """  const impact = Api.getDriverImpact(user.id);""",
    """  const matches = await Api.getMatchesForUser(user.id, 'driver');
  const impact = await Api.getDriverImpact(user.id);"""
)
update_file(
    "pages/driver/earnings.js",
    """  document.getElementById('statTrips').textContent = Api.getMatchesForUser(user.id, 'driver').filter(m => m.status === 'delivered').length;""",
    """  document.getElementById('statTrips').textContent = matches.filter(m => m.status === 'delivered').length;"""
)
update_file(
    "pages/driver/earnings.js",
    """      </tr>
    `).join('');
  }
}""",
    """      </tr>
    `).join('');
  }
  }
  init();
}"""
)

# 11. pages/driver/trust-profile.js
update_file(
    "pages/driver/trust-profile.js",
    """const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'trust-profile.html', root: '../../', user });

  const profile = Api.getDriverTrustProfile(user.id);""",
    """const user = Auth.requireRole('driver', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'driver', active: 'trust-profile.html', root: '../../', user });

    const profile = await Api.getDriverTrustProfile(user.id);"""
)
update_file(
    "pages/driver/trust-profile.js",
    """  document.getElementById('profileRoot').innerHTML = UI.renderDriverTrustProfile(profile);
}""",
    """  document.getElementById('profileRoot').innerHTML = UI.renderDriverTrustProfile(profile);
  }
  init();
}"""
)

# 12. pages/driver/kyc-onboarding.js
update_file(
    "pages/driver/kyc-onboarding.js",
    "document.getElementById('kycForm').addEventListener('submit', function (e) {",
    "document.getElementById('kycForm').addEventListener('submit', async function (e) {"
)
update_file(
    "pages/driver/kyc-onboarding.js",
    "Api.submitKyc(user.id, docs);",
    "await Api.submitKyc(user.id, docs);"
)

# 13. pages/admin/dashboard.js
update_file(
    "pages/admin/dashboard.js",
    """const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'dashboard.html', root: '../../', user });

  const stats = Api.getPlatformStats();""",
    """const user = Auth.requireRole('admin', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'admin', active: 'dashboard.html', root: '../../', user });

    const stats = await Api.getPlatformStats();
    const kycQ = await Api.getKycQueue();
    const billQ = await Api.getBillQueue();"""
)
update_file(
    "pages/admin/dashboard.js",
    """  document.getElementById('kycCount').textContent = Api.getKycQueue().length + ' drivers waiting';
  document.getElementById('billCount').textContent = Api.getBillQueue().length + ' bills pending';""",
    """  document.getElementById('kycCount').textContent = kycQ.length + ' drivers waiting';
  document.getElementById('billCount').textContent = billQ.length + ' bills pending';"""
)
update_file(
    "pages/admin/dashboard.js",
    """    </div>`;
}""",
    """    </div>`;
  }
  init();
}"""
)

# 14. pages/admin/kyc-queue.js
update_file(
    "pages/admin/kyc-queue.js",
    "function render() {",
    "async function render() {"
)
update_file(
    "pages/admin/kyc-queue.js",
    "const queue = Api.getKycQueue();",
    "const queue = await Api.getKycQueue();"
)
update_file(
    "pages/admin/kyc-queue.js",
    "wrap.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/admin/kyc-queue.js",
    "Api.decideKyc(b.dataset.id, 'verified');",
    "await Api.decideKyc(b.dataset.id, 'verified');"
)
update_file(
    "pages/admin/kyc-queue.js",
    "wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/admin/kyc-queue.js",
    "Api.decideKyc(b.dataset.id, 'rejected', note);",
    "await Api.decideKyc(b.dataset.id, 'rejected', note);"
)

# 15. pages/admin/bill-queue.js
update_file(
    "pages/admin/bill-queue.js",
    "function render() {",
    "async function render() {"
)
update_file(
    "pages/admin/bill-queue.js",
    "const bills = Api.getBillQueue();",
    "const bills = await Api.getBillQueue();"
)
update_file(
    "pages/admin/bill-queue.js",
    "rows.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', () => {",
    "rows.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/admin/bill-queue.js",
    "Api.decideBill(b.dataset.id, 'approved');",
    "await Api.decideBill(b.dataset.id, 'approved');"
)
update_file(
    "pages/admin/bill-queue.js",
    "rows.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', () => {",
    "rows.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/admin/bill-queue.js",
    "Api.decideBill(b.dataset.id, 'rejected');",
    "await Api.decideBill(b.dataset.id, 'rejected');"
)

# 16. pages/admin/disputes.js
update_file(
    "pages/admin/disputes.js",
    "function render() {",
    "async function render() {"
)
update_file(
    "pages/admin/disputes.js",
    "const disputes = Api.getDisputes();",
    "const disputes = await Api.getDisputes();"
)
update_file(
    "pages/admin/disputes.js",
    "wrap.querySelectorAll('.resolve-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.resolve-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/admin/disputes.js",
    "Api.resolveDispute(b.dataset.id, note);",
    "await Api.resolveDispute(b.dataset.id, note);"
)

# 17. pages/admin/corridors.js
update_file(
    "pages/admin/corridors.js",
    """const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'corridors.html', root: '../../', user });

  const all = Api.getAllCorridors();""",
    """const user = Auth.requireRole('admin', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'admin', active: 'corridors.html', root: '../../', user });

    const all = await Api.getAllCorridors();"""
)
update_file(
    "pages/admin/corridors.js",
    """  render(all);
}""",
    """  render(all);
  }
  init();
}"""
)

# 18. pages/driver/matched-loads.js
update_file(
    "pages/driver/matched-loads.js",
    "function render() {",
    "async function render() {"
)
update_file(
    "pages/driver/matched-loads.js",
    "const matches = Api.getMatchesForUser(user.id, 'driver');",
    "const matches = await Api.getMatchesForUser(user.id, 'driver');"
)
update_file(
    "pages/driver/matched-loads.js",
    "wrap.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.accept-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/matched-loads.js",
    "const res = Api.decideBooking(b.dataset.id, 'accepted');",
    "const res = await Api.decideBooking(b.dataset.id, 'accepted');"
)
update_file(
    "pages/driver/matched-loads.js",
    "wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/matched-loads.js",
    "const res = Api.decideBooking(b.dataset.id, 'rejected');",
    "const res = await Api.decideBooking(b.dataset.id, 'rejected');"
)
update_file(
    "pages/driver/matched-loads.js",
    "wrap.querySelectorAll('.bill-btn').forEach(b => b.addEventListener('click', () => {",
    "wrap.querySelectorAll('.bill-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/matched-loads.js",
    "Api.submitBill(b.dataset.id, f, t, o, user.id);",
    "await Api.submitBill(b.dataset.id, f, t, o, user.id);"
)

# 19. pages/driver/active-trip.js
update_file(
    "pages/driver/active-trip.js",
    """  const initial = matchId ? Api.getMatch(matchId) : null;
  if (!initial || initial.driverId !== user.id) {
    document.getElementById('tripRoot').innerHTML = `<div class="empty-state panel"><h3>Road trip not found</h3><p>This booking doesn't exist or isn't yours.</p><a class="btn btn-primary" href="matched-loads.html">Back to road trips</a></div>`;
  } else {
    render();
  }

  function render() {
    const m = Api.getMatch(matchId);""",
    """  async function init() {
    const initial = matchId ? await Api.getMatch(matchId) : null;
    if (!initial || initial.driverId !== user.id) {
      document.getElementById('tripRoot').innerHTML = `<div class="empty-state panel"><h3>Road trip not found</h3><p>This booking doesn't exist or isn't yours.</p><a class="btn btn-primary" href="matched-loads.html">Back to road trips</a></div>`;
    } else {
      await render();
    }
  }

  async function render() {
    const m = await Api.getMatch(matchId);"""
)
update_file(
    "pages/driver/active-trip.js",
    "if (pickupBtn) pickupBtn.addEventListener('click', () => { Api.confirmPickup(m.id); UI.toast('Cargo pickup confirmed.'); render(); });",
    "if (pickupBtn) pickupBtn.addEventListener('click', async () => { await Api.confirmPickup(m.id); UI.toast('Cargo pickup confirmed.'); await render(); });"
)
update_file(
    "pages/driver/active-trip.js",
    "if (transitBtn) transitBtn.addEventListener('click', () => { Api.startTransit(m.id); UI.toast('Marked in transit — safe driving.'); render(); });",
    "if (transitBtn) transitBtn.addEventListener('click', async () => { await Api.startTransit(m.id); UI.toast('Marked in transit — safe driving.'); await render(); });"
)
update_file(
    "pages/driver/active-trip.js",
    "if (arriveBtn) arriveBtn.addEventListener('click', () => { Api.markArrived(m.id); UI.toast('Marked arrived at destination.'); render(); });",
    "if (arriveBtn) arriveBtn.addEventListener('click', async () => { await Api.markArrived(m.id); UI.toast('Marked arrived at destination.'); await render(); });"
)
update_file(
    "pages/driver/active-trip.js",
    "if (genOtpBtn) genOtpBtn.addEventListener('click', () => {",
    "if (genOtpBtn) genOtpBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/active-trip.js",
    "const res = Api.initiateDelivery(m.id);",
    "const res = await Api.initiateDelivery(m.id);"
)
update_file(
    "pages/driver/active-trip.js",
    "if (completeBtn) completeBtn.addEventListener('click', () => {",
    "if (completeBtn) completeBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/active-trip.js",
    "const res = Api.verifyDeliveryOtp(m.id, val, m.customer.name);",
    "const res = await Api.verifyDeliveryOtp(m.id, val, m.customer.name);"
)
update_file(
    "pages/driver/active-trip.js",
    "document.querySelectorAll('.photo-btn').forEach(b => b.addEventListener('click', () => {",
    "document.querySelectorAll('.photo-btn').forEach(b => b.addEventListener('click', async () => {"
)
update_file(
    "pages/driver/active-trip.js",
    "Api.addTripPhoto(m.id, b.dataset.type, label);",
    "await Api.addTripPhoto(m.id, b.dataset.type, label);"
)
update_file(
    "pages/driver/active-trip.js",
    """    document.getElementById('checklistDoneBtn')?.addEventListener('click', () => {
      sessionStorage.setItem(startedKey, '1');
      render();
    });
  }
}""",
    """    document.getElementById('checklistDoneBtn')?.addEventListener('click', () => {
      sessionStorage.setItem(startedKey, '1');
      render();
    });
  }
  init();
}"""
)

# 20. pages/customer/load-detail.js
update_file(
    "pages/customer/load-detail.js",
    """  const loadId = new URLSearchParams(window.location.search).get('id');
  let load = Api.getLoad(loadId);

  if (!load || load.customerId !== user.id) {
    document.querySelector('.main-content').innerHTML = '<div class="empty-state panel"><h3>Load not found</h3><p>This load doesn\\'t exist or isn\\'t yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>';
  } else {
    renderAll();
  }

  function renderAll() {
    load = Api.getLoad(loadId);
    renderHead();
    renderActions();
    renderMatchOrTrip();
  }""",
    """  const loadId = new URLSearchParams(window.location.search).get('id');
  let load = null;

  async function init() {
    load = await Api.getLoad(loadId);
    if (!load || load.customerId !== user.id) {
      document.querySelector('.main-content').innerHTML = '<div class="empty-state panel"><h3>Load not found</h3><p>This load doesn\\'t exist or isn\\'t yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>';
    } else {
      await renderAll();
    }
  }

  async function renderAll() {
    load = await Api.getLoad(loadId);
    renderHead();
    renderActions();
    await renderMatchOrTrip();
  }"""
)
update_file(
    "pages/customer/load-detail.js",
    "if (publishBtn) publishBtn.addEventListener('click', () => {",
    "if (publishBtn) publishBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "Api.publishLoad(load.id);",
    "await Api.publishLoad(load.id);"
)
update_file(
    "pages/customer/load-detail.js",
    "if (cancelBtn) cancelBtn.addEventListener('click', () => {",
    "if (cancelBtn) cancelBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "Api.cancelLoad(load.id);",
    "await Api.cancelLoad(load.id);"
)
update_file(
    "pages/customer/load-detail.js",
    "function renderMatchOrTrip() {",
    "async function renderMatchOrTrip() {"
)
update_file(
    "pages/customer/load-detail.js",
    "const candidates = Api.findMatchesForLoad(load.id);",
    "const candidates = await Api.findMatchesForLoad(load.id);"
)
update_file(
    "pages/customer/load-detail.js",
    "btn.addEventListener('click', () => {",
    "btn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "const res = Api.requestBooking(load.id, btn.dataset.cap, btn.dataset.price);",
    "const res = await Api.requestBooking(load.id, btn.dataset.cap, btn.dataset.price);"
)
update_file(
    "pages/customer/load-detail.js",
    "const match = Api.getMatch(load.matchId);",
    "const match = await Api.getMatch(load.matchId);"
)
update_file(
    "pages/customer/load-detail.js",
    "cancelReqBtn.addEventListener('click', () => {",
    "cancelReqBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "Api.cancelBooking(match.id, 'customer');",
    "await Api.cancelBooking(match.id, 'customer');"
)
update_file(
    "pages/customer/load-detail.js",
    "disputeBtn.addEventListener('click', () => {",
    "disputeBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "Api.raiseDispute(match.id, user.id, reason);",
    "await Api.raiseDispute(match.id, user.id, reason);"
)
update_file(
    "pages/customer/load-detail.js",
    "otpVerifyBtn.addEventListener('click', () => {",
    "otpVerifyBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/load-detail.js",
    "const res = Api.verifyDeliveryOtp(match.id, val, user.name);",
    "const res = await Api.verifyDeliveryOtp(match.id, val, user.name);"
)
update_file(
    "pages/customer/load-detail.js",
    "function renderDigitalRecord(match) {",
    "async function renderDigitalRecord(match) {"
)
update_file(
    "pages/customer/load-detail.js",
    "const rec = Api.getDigitalRecord(match.id);",
    "const rec = await Api.getDigitalRecord(match.id);"
)
update_file(
    "pages/customer/load-detail.js",
    "function renderPod(match) {",
    "async function renderPod(match) {"
)
update_file(
    "pages/customer/load-detail.js",
    "const pod = Api.getPOD(match.id);",
    "const pod = await Api.getPOD(match.id);"
)
update_file(
    "pages/customer/load-detail.js",
    "renderDigitalRecord(match);",
    "await renderDigitalRecord(match);"
)
update_file(
    "pages/customer/load-detail.js",
    "renderPod(match);",
    "await renderPod(match);"
)
update_file(
    "pages/customer/load-detail.js",
    """    return `POD-${match.id.toUpperCase()}`;
  }
}""",
    """    return `POD-${match.id.toUpperCase()}`;
  }
  init();
}"""
)

# 21. pages/customer/consignment-journey.js
update_file(
    "pages/customer/consignment-journey.js",
    """  const initial = matchId ? Api.getMatch(matchId) : null;
  if (!initial || initial.customerId !== user.id) {
    document.getElementById('journeyRoot').innerHTML = '<div class="empty-state panel"><h3>Consignment not found</h3><p>This consignment doesn\\'t exist or isn\\'t yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>';
  } else {
    render();
  }

  function render() {
    const m = Api.getMatch(matchId);""",
    """  async function init() {
    const initial = matchId ? await Api.getMatch(matchId) : null;
    if (!initial || initial.customerId !== user.id) {
      document.getElementById('journeyRoot').innerHTML = '<div class="empty-state panel"><h3>Consignment not found</h3><p>This consignment doesn\\'t exist or isn\\'t yours.</p><a class="btn btn-primary" href="my-loads.html">Back to my loads</a></div>';
    } else {
      await render();
    }
  }

  async function render() {
    const m = await Api.getMatch(matchId);"""
)
update_file(
    "pages/customer/consignment-journey.js",
    "const track = m.digitalRecord ? Api.trackConsignment(m.digitalRecord.consignmentId) : null;",
    "const track = m.digitalRecord ? await Api.trackConsignment(m.digitalRecord.consignmentId) : null;"
)
update_file(
    "pages/customer/consignment-journey.js",
    "rateBtn.addEventListener('click', () => {",
    "rateBtn.addEventListener('click', async () => {"
)
update_file(
    "pages/customer/consignment-journey.js",
    "const res = Api.rateTrip(m.id, 'customer', values, review);",
    "const res = await Api.rateTrip(m.id, 'customer', values, review);"
)
update_file(
    "pages/customer/consignment-journey.js",
    """    if (rateBtn) rateBtn.addEventListener('click', async () => {
      const modal = UI.renderRatingModal({
        match: m,
        role: 'customer',
        existing: ratings.customer,
        onSubmit(values, review) {
          const res = await Api.rateTrip(m.id, 'customer', values, review);
          if (res.ok) {
            UI.toast('Thank you for rating your driver.');
            render();
          } else {
            UI.toast(res.error, 'error');
          }
        }
      });
      document.body.appendChild(modal);
    });
  }
}""",
    """    if (rateBtn) rateBtn.addEventListener('click', () => {
      const modal = UI.renderRatingModal({
        match: m,
        role: 'customer',
        existing: ratings.customer,
        async onSubmit(values, review) {
          const res = await Api.rateTrip(m.id, 'customer', values, review);
          if (res.ok) {
            UI.toast('Thank you for rating your driver.');
            await render();
          } else {
            UI.toast(res.error, 'error');
          }
        }
      });
      document.body.appendChild(modal);
    });
  }
  init();
}"""
)

print("Page scripts update finished!")
