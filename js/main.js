/* ==========================================================================
   ROUTEFILL — main.js
   Shared UI: nav chrome per role, toasts, formatting helpers, small widgets.
   ========================================================================== */

const UI = {};

UI.NAV_LINKS = {
  customer: [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'post-load.html', label: 'Send Goods' },
    { href: 'my-loads.html', label: 'My Bookings' },
    { href: 'savings-impact.html', label: 'Money Saved' }
  ],
  driver: [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'post-capacity.html', label: 'Offer Empty Space' },
    { href: 'matched-loads.html', label: 'Find Goods to Carry' },
    { href: 'earnings.html', label: 'My Earnings' },
    { href: 'trust-profile.html', label: 'My Profile & Rating' }
  ],
  admin: [
    { href: 'dashboard.html', label: 'Overview' },
    { href: 'kyc-queue.html', label: 'Driver Verification' },
    { href: 'bill-queue.html', label: 'Bills to Pay' },
    { href: 'disputes.html', label: 'Help & Complaints' },
    { href: 'corridors.html', label: 'Active Routes' }
  ]
};

// --- Theme Management ---
UI.THEME_KEY = 'loadlink_theme';
UI.getTheme = function () {
  return localStorage.getItem(UI.THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};
UI.setTheme = function (theme) {
  localStorage.setItem(UI.THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  });
};
UI.toggleTheme = function () {
  const current = UI.getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  UI.setTheme(next);
  return next;
};
UI.initTheme = function () {
  const t = UI.getTheme();
  document.documentElement.setAttribute('data-theme', t);
};
// Run theme immediately on script load
UI.initTheme();

// Connection health checking
UI.checkBackendHealth = async function () {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch('http://localhost:8080/api/public/corridors', { signal: ctrl.signal }).catch(() => null);
    clearTimeout(timer);
    return Boolean(res && res.ok);
  } catch (e) {
    return false;
  }
};

// root: relative path back to project root. samePathRoot: relative path back
// to the role folder (e.g. '' if already inside pages/driver/).
UI.renderNav = function (opts) {
  const { role, active, root, user } = opts;
  const el = document.getElementById('topnav');
  if (!el) return;
  const links = UI.NAV_LINKS[role] || [];
  const linksHtml = links.map(l =>
    `<li><a href="${l.href}" class="${l.href === active ? 'active' : ''}">${l.label}</a></li>`
  ).join('');

  const notifs = (user && role !== 'admin' && window.Api) ? Api.getNotifications(user.id, role) : [];
  const curTheme = UI.getTheme();

  el.innerHTML = `
    <div class="wrap">
      <a class="brand" href="${root}pages/${role}/dashboard.html">
        <span class="mark"><span>LL</span></span> <span class="brand-text">Load<b>Link</b></span>
      </a>
      <ul class="navlinks" id="navlinks">
        ${linksHtml}
        <li><a href="${root}track.html" class="nav-radar" target="_blank" rel="noopener"><span>Live GPS Map</span> <span class="nav-dot"></span></a></li>
      </ul>
      <div class="nav-user">
        <span class="rf-conn-status local" id="navConnStatus" title="System Connection Status">
          <span class="rf-conn-dot"></span> <span id="navConnText">Local Mode</span>
        </span>
        <button class="theme-toggle-btn" id="navThemeToggle" type="button" aria-label="Toggle theme">
          ${curTheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        ${role !== 'admin' ? `
          <div class="rf-notif-wrap">
            <button class="rf-notif-bell" id="notifBell" aria-label="Notifications">🔔${notifs.length ? `<span class="rf-notif-badge">${notifs.length}</span>` : ''}</button>
            <div class="rf-notif-panel" id="notifPanel" hidden>
              <div class="rf-notif-panel-head">Trip &amp; Road Alerts</div>
              ${notifs.length ? notifs.map(n => `
                <div class="rf-notif-item">
                  <strong>${UI.escapeHtml(n.title)}</strong>
                  <p>${UI.escapeHtml(n.body)}</p>
                </div>`).join('') : `<div class="rf-notif-item text-soft">No alerts yet.</div>`}
            </div>
          </div>` : ''}
        <span class="nav-role-chip">${role === 'driver' ? '🚚 Driver' : (role === 'customer' ? '📦 Customer' : '🛡️ Manager')}</span>
        <span class="text-soft" style="color:#EFEBE2; font-weight:600; font-size:.88rem; font-family:var(--body);">${user ? user.name.split(' ')[0] : ''}</span>
        <button class="btn btn-outline btn-sm" id="logoutBtn" style="border-color:var(--steel-dim); color:#C7CCD4; font-weight:600;">Log out</button>
      </div>
      <button class="hamburger" id="hamburgerBtn" aria-label="Menu">&#9776;</button>
    </div>`;
  document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout(root));
  const burger = document.getElementById('hamburgerBtn');
  const navlinks = document.getElementById('navlinks');
  if (burger) burger.addEventListener('click', () => navlinks.classList.toggle('open'));

  const themeBtn = document.getElementById('navThemeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => UI.toggleTheme());

  const bell = document.getElementById('notifBell');
  const panel = document.getElementById('notifPanel');
  if (bell && panel) {
    bell.addEventListener('click', (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; });
    document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== bell) panel.hidden = true; });
  }

  // Update connection indicator asynchronously
  UI.checkBackendHealth().then(isLive => {
    const pill = document.getElementById('navConnStatus');
    const txt = document.getElementById('navConnText');
    if (pill && txt) {
      if (isLive) {
        pill.className = 'rf-conn-status';
        txt.textContent = 'Online API';
        pill.title = 'Connected to Server (Port 8080)';
      } else {
        pill.className = 'rf-conn-status local';
        txt.textContent = 'Local Mode';
        pill.title = 'Local demo data active';
      }
    }
  });
};

UI.toast = function (message, type) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = message;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3200);
};

UI.money = function (n) {
  return '\u20B9' + Number(n || 0).toLocaleString('en-IN');
};

UI.date = function (iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

UI.statusLabel = {
  draft: 'Saved Draft', open: 'Looking for Truck', matched: 'Truck Found', requested: 'Waiting for Driver', accepted: 'Driver Accepted',
  pickup_confirmed: 'Goods Picked Up', in_transit: 'On the Road (Moving)', arrived: 'Reached Drop Location',
  delivered: 'Delivered Safely', cancelled: 'Cancelled',
  disputed: 'Issue Reported', completed: 'Completed', full: 'Truck Full',
  none: 'Not Started', pending: 'Checking Documents', verified: 'Verified & Approved', rejected: 'Not Approved',
  paid: 'Paid', approved: 'Approved'
};

UI.stampClass = function (status) {
  const map = {
    draft: 'stamp-draft', none: 'stamp-draft',
    open: 'stamp-pending', pending: 'stamp-pending', requested: 'stamp-pending',
    matched: 'stamp-matched', accepted: 'stamp-matched', verified: 'stamp-matched', approved: 'stamp-matched', paid: 'stamp-matched',
    pickup_confirmed: 'stamp-transit', in_transit: 'stamp-transit', arrived: 'stamp-transit', full: 'stamp-transit',
    delivered: 'stamp-delivered', completed: 'stamp-delivered',
    disputed: 'stamp-disputed', rejected: 'stamp-disputed', cancelled: 'stamp-disputed'
  };
  return map[status] || 'stamp-draft';
};

// Event-timeline label + ordering for the ROUTEFILL tracking widget.
UI.EVENT_LABELS = {
  BOOKING_REQUESTED: 'Booking Requested',
  BOOKING_ACCEPTED: 'Driver Accepted',
  BOOKING_REJECTED: 'Driver Declined',
  BOOKING_CANCELLED: 'Booking Cancelled',
  DIGITAL_RECORD_GENERATED: 'Trip Pass & Receipt Ready',
  PICKUP_CONFIRMED: 'Goods Loaded & Picked Up',
  IN_TRANSIT: 'Truck on the Road',
  ARRIVED: 'Truck Arrived at Destination',
  DELIVERED: 'Delivered to Receiver',
  POD_GENERATED: 'Delivery Proof (Photo & OTP) Done'
};
UI.TIMELINE_STEPS = ['BOOKING_ACCEPTED', 'DIGITAL_RECORD_GENERATED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];

UI.renderTimeline = function (events) {
  const done = new Set((events || []).map(e => e.type));
  let firstPending = false;
  return `<div class="rf-timeline">` + UI.TIMELINE_STEPS.map(step => {
    const isDone = done.has(step);
    const marker = isDone ? '✓' : (!firstPending ? '●' : '○');
    if (!isDone && !firstPending) firstPending = true;
    return `<div class="rf-timeline-step ${isDone ? 'done' : (marker === '●' ? 'current' : '')}"><span class="rf-timeline-marker">${marker}</span><span>${UI.EVENT_LABELS[step]}</span></div>`;
  }).join('') + `</div>`;
};

UI.capacityBar = function (cap) {
  const total = Number(cap.totalCapacityTons || 0) || 1;
  const existingPct = clampPct(Number(cap.existingLoadTons || 0) / total * 100);
  const bookedPct = clampPct(Number(cap.bookedTons || 0) / total * 100);
  const unit = cap.unit || 'T';
  return `
    <div class="rf-capbar">
      <div class="rf-capbar-track">
        <span class="rf-capbar-existing" style="width:${existingPct}%"></span>
        <span class="rf-capbar-booked" style="width:${bookedPct}%; left:${existingPct}%"></span>
      </div>
      <div class="rf-capbar-legend">
        <span><i class="dot dot-existing"></i>Already loaded: ${cap.existingLoadTons}${unit}</span>
        <span><i class="dot dot-booked"></i>Return goods booked: ${cap.bookedTons}${unit}</span>
        <span><i class="dot dot-remaining"></i>Empty space left: ${cap.remainingTons}${unit}</span>
      </div>
    </div>`;
};
function clampPct(n) { return Math.max(0, Math.min(100, n)); }

/* ---------------- price comparison component (FEATURE 2) ---------------- */
UI.renderPriceComparison = function (pc) {
  return `
    <div class="rf-price-compare">
      <div class="rf-price-col"><div class="rf-price-label">Hiring a full truck</div><div class="rf-price-amt rf-price-old">${UI.money(pc.traditional)}</div></div>
      <div class="rf-price-col rf-price-arrow">→</div>
      <div class="rf-price-col"><div class="rf-price-label">Sharing return truck</div><div class="rf-price-amt rf-price-new">${UI.money(pc.routefill)}</div></div>
      <div class="rf-price-col rf-price-save"><div class="rf-price-label">You save</div><div class="rf-price-amt">${UI.money(pc.savings)}</div><div class="rf-price-pct">${pc.savingsPct}% cheaper</div></div>
    </div>
    <p class="text-soft" style="font-size:.75rem; margin-top:.4em;">Sample comparison based on highway rates.</p>`;
};

/* ---------------- Road Consignment Journey stages (FEATURE 1) ---------------- */
UI.JOURNEY_STAGES = [
  { key: 'created', label: 'Booking Created', statuses: ['requested'] },
  { key: 'finding', label: 'Finding Available Return Trucks', statuses: ['requested'] },
  { key: 'review', label: 'Waiting for Driver to Accept', statuses: ['requested'] },
  { key: 'accepted', label: 'Driver Accepted', statuses: ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'] },
  { key: 'record', label: 'Trip Pass & Receipt Ready', statuses: ['accepted', 'pickup_confirmed', 'in_transit', 'arrived', 'delivered'] },
  { key: 'pickup', label: 'Goods Loaded & Picked Up', statuses: ['pickup_confirmed', 'in_transit', 'arrived', 'delivered'] },
  { key: 'road', label: 'Truck on the Road', statuses: ['in_transit', 'arrived', 'delivered'] },
  { key: 'near', label: 'Near Drop Location', statuses: ['arrived', 'delivered'] },
  { key: 'verify', label: 'Checking Delivery Code (OTP)', statuses: ['arrived', 'delivered'] },
  { key: 'delivered', label: 'Delivered Safely', statuses: ['delivered'] },
  { key: 'pod', label: 'Delivery Proof Completed', statuses: ['delivered'] }
];
UI.journeyStageIndex = function (status) {
  let idx = 0;
  UI.JOURNEY_STAGES.forEach((s, i) => { if (s.statuses.includes(status)) idx = i; });
  if (status === 'rejected' || status === 'cancelled') return -1;
  return idx;
};
UI.STAGE_HEADLINES = {
  requested: 'WAITING FOR DRIVER TO ACCEPT',
  accepted: 'DRIVER ACCEPTED YOUR BOOKING',
  pickup_confirmed: 'GOODS PICKED UP AND LOADED',
  in_transit: 'TRUCK IS ON THE WAY 🚛',
  arrived: 'TRUCK REACHED DROP LOCATION',
  delivered: 'GOODS DELIVERED SAFELY ✅'
};
UI.renderJourney = function (match) {
  const idx = UI.journeyStageIndex(match.status);
  const rows = UI.JOURNEY_STAGES.map((s, i) => {
    const cls = i < idx ? 'done' : i === idx ? 'current' : '';
    const marker = i < idx ? '✓' : i === idx ? '●' : '○';
    return `<div class="rf-timeline-step ${cls}"><span class="rf-timeline-marker">${marker}</span><span>${s.label}</span></div>`;
  }).join('');
  return `<div class="rf-timeline">${rows}</div>`;
};

/* ---------------- star rating (FEATURE 9) ---------------- */
UI.stars = function (n) {
  const full = Math.round(Number(n) || 0);
  return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
};
UI.renderStarPicker = function (name) {
  return `<div class="rf-star-picker" data-name="${name}">${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rf-star-btn" data-value="${v}">☆</button>`).join('')}</div>`;
};
UI.readStarPickers = function (container) {
  const out = {};
  container.querySelectorAll('.rf-star-picker').forEach(p => {
    out[p.dataset.name] = Number(p.dataset.value || 0);
  });
  return out;
};
UI.wireStarPickers = function (container) {
  container.querySelectorAll('.rf-star-picker').forEach(picker => {
    const btns = picker.querySelectorAll('.rf-star-btn');
    function paint(v) { btns.forEach(b => { b.textContent = Number(b.dataset.value) <= v ? '★' : '☆'; b.classList.toggle('active', Number(b.dataset.value) <= v); }); }
    btns.forEach(b => b.addEventListener('click', () => { picker.dataset.value = b.dataset.value; paint(Number(b.dataset.value)); }));
  });
};

/* ---------------- readiness checklist (FEATURE 10) ---------------- */
UI.renderChecklist = function (readiness) {
  if (!readiness) return '';
  return `
    <div class="rf-checklist">
      <div class="flex-between">
        <strong>TRIP READINESS CHECK</strong>
        <span class="stamp ${readiness.ready ? 'stamp-matched' : 'stamp-pending'}">${readiness.ready ? 'READY TO START' : 'DOCUMENTS PENDING'}</span>
      </div>
      <ul>
        ${readiness.checklist.map(c => `<li class="${c.ok ? 'ok' : 'missing'}">${c.ok ? '✓' : '✗'} ${UI.escapeHtml(c.label)}</li>`).join('')}
      </ul>
    </div>`;
};

UI.escapeHtml = function (str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
};

UI.confirmAction = function (message) {
  return window.confirm(message);
};
