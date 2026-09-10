const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'trust-profile.html', root: '../../', user });

  async function init() {
    const t = await Api.getDriverTrustProfile(user.id);
    document.getElementById('trustRoot').innerHTML = `
    <div class="panel" style="display:flex; gap:var(--space-3); flex-wrap:wrap; align-items:center;">
      <div class="rf-trust-ring" style="--pct:${t.score}"><span>${t.score}<small>/ 100</small></span></div>
      <div>
        <h2 class="mb-0">LOADLINK TRUST SCORE</h2>
        <p class="text-soft">Combines verification status, delivery success and cancellation history.</p>
        <ul class="rf-verify-list">
          <li class="${t.verified.identity ? 'ok' : ''}">${t.verified.identity ? '✓' : '○'} Driver Identity Verified</li>
          <li class="${t.verified.license ? 'ok' : ''}">${t.verified.license ? '✓' : '○'} Driving License Verified</li>
          <li class="${t.verified.rc ? 'ok' : ''}">${t.verified.rc ? '✓' : '○'} Vehicle RC Verified</li>
        </ul>
      </div>
    </div>

    <h2 class="mt-4">Performance</h2>
    <div class="panel">
      <div class="rf-trust-grid">
        <div><div class="n">${t.completedRoadTrips}</div><div class="l">Completed road trips</div></div>
        <div><div class="n">${t.successfulDeliveries}</div><div class="l">Successful deliveries</div></div>
        <div><div class="n">${t.onTimeRate}%</div><div class="l">On-time delivery</div></div>
        <div><div class="n">${t.cancellationRate}%</div><div class="l">Cancellation rate</div></div>
        <div><div class="n">${t.customerRating}</div><div class="l">Customer rating (${UI.stars(t.customerRating)})</div></div>
      </div>
      <p class="text-soft mt-3" style="font-size:.8rem;">Figures are deterministic demo calculations from your account and local booking history — not a live external credit-style score.</p>
    </div>
  `;
  }
  init();
}
