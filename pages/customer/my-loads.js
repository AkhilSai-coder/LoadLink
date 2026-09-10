const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'my-loads.html', root: '../../', user });

    const allLoads = await Api.getLoadsByCustomer(user.id);
  let filter = 'all';

  function render() {
    const list = filter === 'all' ? allLoads : allLoads.filter(l => l.status === filter);
    const wrap = document.getElementById('loadsList');
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state panel"><h3>Nothing here</h3><p>No loads match this filter yet.</p></div>`;
      return;
    }
    wrap.innerHTML = list.map(l => `
      <div class="waybill">
        <div class="waybill-top">
          <span class="waybill-id">WAYBILL · ${l.id.toUpperCase()} · posted ${UI.date(l.createdAt)}</span>
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

  document.getElementById('tabs').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    filter = e.target.dataset.filter;
    render();
  });

  render();
  }
  init();
}
