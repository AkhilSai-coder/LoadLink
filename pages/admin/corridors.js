const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'corridors.html', root: '../../', user });

  const searchInput = document.getElementById('corridorSearch');
  const sortSelect = document.getElementById('corridorSort');
  const listEl = document.getElementById('corridorList');
  const statsEl = document.getElementById('corridorStats');

  async function init() {
    const all = await Api.getAllCorridors();

  function pressure(c) {
    // Demand pressure: how much active demand is stacked against the
    // capacity currently sitting on this corridor. Purely a function of
    // real state on the corridor — not randomised.
    const denom = c.availableCapacity + c.activeRequests + 1;
    return Math.round((c.activeRequests / denom) * 100);
  }
  function pressureLevel(pct) {
    if (pct >= 60) return { label: 'HIGH DEMAND', cls: 'stamp-disputed' };
    if (pct >= 30) return { label: 'MEDIUM DEMAND', cls: 'stamp-pending' };
    return { label: 'LOW DEMAND', cls: 'stamp-matched' };
  }

  function renderStats(rows) {
    const totalVehicles = rows.reduce((s, c) => s + c.activeVehicles, 0);
    const totalCapacity = rows.reduce((s, c) => s + c.availableCapacity, 0);
    const totalRequests = rows.reduce((s, c) => s + c.activeRequests, 0);
    const avgSaving = rows.length ? Math.round(rows.reduce((s, c) => s + c.avgSaving, 0) / rows.length) : 0;
    statsEl.innerHTML = `
      <div class="stat"><div class="n">${rows.length}</div><div class="label">Live corridors</div></div>
      <div class="stat"><div class="n">${totalVehicles}</div><div class="label">Active vehicles on road</div></div>
      <div class="stat"><div class="n">${totalCapacity.toFixed(1)}T</div><div class="label">Unused capacity available</div></div>
      <div class="stat"><div class="n">${totalRequests}</div><div class="label">Active requests</div></div>
    `;
    statsEl.dataset.avgSaving = avgSaving;
  }

  function render() {
    const q = (searchInput.value || '').trim().toLowerCase();
    const sortBy = sortSelect.value;

    let rows = all.filter(c => !q || c.label.toLowerCase().includes(q));

    const sorters = {
      requests: (a, b) => b.activeRequests - a.activeRequests,
      vehicles: (a, b) => b.activeVehicles - a.activeVehicles,
      capacity: (a, b) => b.availableCapacity - a.availableCapacity,
      saving: (a, b) => b.avgSaving - a.avgSaving
    };
    rows = rows.slice().sort(sorters[sortBy] || sorters.requests);

    renderStats(all.filter(c => !q || c.label.toLowerCase().includes(q)));

    if (!rows.length) {
      listEl.innerHTML = `<div class="empty-state panel"><h3>No corridors match</h3><p>Try a different search term, or clear the search to see every live corridor.</p></div>`;
      return;
    }

    listEl.innerHTML = rows.map(c => {
      const pct = pressure(c);
      const lvl = pressureLevel(pct);
      return `
      <div class="rf-corridor-card">
        <div class="rf-corridor-head">
          <span>${UI.escapeHtml(c.label)}</span>
          <span class="stamp ${lvl.cls}">${lvl.label}</span>
        </div>
        <div class="rf-corridor-grid">
          <div><div class="n">${c.activeVehicles}</div><div class="l">Active vehicles</div></div>
          <div><div class="n">${c.availableCapacity}T</div><div class="l">Unused capacity</div></div>
          <div><div class="n">${c.activeRequests}</div><div class="l">Active requests</div></div>
          <div><div class="n">${c.avgSaving}%${c.estimated ? '<span class="rf-badge-estimated">Est.</span>' : ''}</div><div class="l">Avg. customer saving</div></div>
        </div>
        <div class="progress mt-2"><span style="width:${pct}%; background:${pct >= 60 ? 'var(--red-600)' : pct >= 30 ? 'var(--amber-600)' : 'var(--emerald-600)'};"></span></div>
        <p class="text-soft" style="font-size:.75rem; margin-top:.4em;">Demand pressure ${pct}% — active requests relative to unused capacity currently posted on this corridor.</p>
      </div>`;
    }).join('');
  }

  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);
  render();
  }
  init();
}
