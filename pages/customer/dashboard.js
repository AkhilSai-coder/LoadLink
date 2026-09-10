const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'dashboard.html', root: '../../', user });
    document.getElementById('greeting').textContent = 'Welcome back, ' + user.name.split(' ')[0];

    const loads = await Api.getLoadsByCustomer(user.id);
  document.getElementById('statOpen').textContent = loads.filter(l => l.status === 'open').length;
  document.getElementById('statMatched').textContent = loads.filter(l => l.status === 'matched').length;
  document.getElementById('statTransit').textContent = loads.filter(l => l.status === 'in_transit').length;
  document.getElementById('statDelivered').textContent = loads.filter(l => l.status === 'delivered').length;

  const wrap = document.getElementById('recentLoads');
  const recent = loads.slice(0, 5);
  if (!recent.length) {
    wrap.innerHTML = `<div class="empty-state panel"><h3>No loads yet</h3><p>Post your first load and get matched with a returning driver.</p><a class="btn btn-primary" href="post-load.html">Post a load</a></div>`;
  } else {
    wrap.innerHTML = recent.map(l => `
      <div class="waybill">
        <div class="waybill-top">
          <span class="waybill-id">WAYBILL · ${l.id.toUpperCase()}</span>
          <span class="stamp ${UI.stampClass(l.status)}">${UI.statusLabel[l.status]}</span>
        </div>
        <div class="route"><span class="pt">${UI.escapeHtml(l.origin)}</span><span class="line"></span><span class="pt">${UI.escapeHtml(l.destination)}</span></div>
        <div class="waybill-meta">
          <span><strong>${l.weightTons}${l.unit || 'T'}</strong> ${UI.escapeHtml(l.material)}</span>
          <span>Pickup <strong>${UI.date(l.pickupDate)}</strong></span>
          <span><strong>${UI.money(l.budget)}</strong></span>
        </div>
        <div class="waybill-actions">
          <a class="btn btn-outline btn-sm" href="load-detail.html?id=${l.id}">View details</a>
        </div>
      </div>
    `).join('');
  }
  }
  init();
}
