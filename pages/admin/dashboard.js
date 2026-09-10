const user = Auth.requireRole('admin', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'admin', active: 'dashboard.html', root: '../../', user });

    const stats = await Api.getPlatformStats();
    const kycQ = await Api.getKycQueue();
    const billQ = await Api.getBillQueue();
    if (document.getElementById('greeting')) {
      document.getElementById('greeting').textContent = 'Welcome back, ' + (user.name ? user.name.split(' ')[0] : 'Admin');
    }
    document.getElementById('statGmv').textContent = UI.money(stats.gmv);
    document.getElementById('statDrivers').textContent = stats.verifiedDrivers + ' / ' + stats.totalDrivers;
    document.getElementById('statOpenLoads').textContent = stats.openLoads;
    document.getElementById('statActive').textContent = stats.activeTrips;

    document.getElementById('kycCount').textContent = kycQ.length + ' drivers waiting';
    document.getElementById('billCount').textContent = billQ.length + ' bills pending';
    document.getElementById('disputeCount').textContent = stats.disputesOpen + ' open';
    document.getElementById('completedCount').textContent = stats.completedTrips + ' delivered';

    // Render Highway Compliance Photos for Admin Audit
    const auditPhotos = Api.getAuditPhotos ? Api.getAuditPhotos() : [];
    const photoGrid = document.getElementById('auditPhotoGrid');
    if (photoGrid) {
      if (auditPhotos.length === 0) {
        photoGrid.innerHTML = '<p class="text-soft">No verification photos uploaded yet.</p>';
      } else {
        photoGrid.innerHTML = auditPhotos.map(p => `
          <div class="glass-queue-card" style="display:flex; flex-direction:column; padding:0; overflow:hidden; border:1px solid rgba(255,255,255,0.1); background:var(--asphalt-2);">
            <div style="position:relative; height:160px; overflow:hidden; cursor:pointer;" class="audit-img-click" data-url="${p.photoUrl}" data-title="${UI.escapeHtml(p.title)}" data-meta="${UI.escapeHtml(p.subtitle)}">
              <img src="${p.photoUrl}" style="width:100%; height:100%; object-fit:cover; transition:transform .3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
              <span class="badge ${p.category === 'empty_bed' ? 'badge--ok' : 'badge--primary'}" style="position:absolute; top:10px; right:10px; font-size:.75rem; box-shadow:0 2px 6px rgba(0,0,0,0.5);">
                ${p.badge}
              </span>
            </div>
            <div style="padding:1rem; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <strong style="color:#fff; font-family:var(--display); font-size:.95rem; display:block; margin-bottom:.2rem;">${p.title}</strong>
                <p style="color:#C9D3CD; font-size:.82rem; margin-bottom:.5rem;">${p.subtitle}</p>
                <div style="display:flex; gap:.4rem; font-size:.78rem; color:#8A93A0; flex-wrap:wrap;">
                  <span>👤 ${p.uploader} (${p.role === 'driver' ? 'Captain' : 'Shipper'})</span>
                  ${p.vehicleNumber ? `<span>· 🚛 ${p.vehicleNumber}</span>` : ''}
                </div>
              </div>
              <div style="margin-top:.8rem; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:.72rem; color:#8A93A0; font-family:var(--mono);">TIMESTAMP: ${new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button class="btn btn-sm btn-outline audit-inspect-btn" style="border-color:var(--highway); color:var(--highway); font-size:.78rem; padding:3px 8px;" data-url="${p.photoUrl}" data-title="${UI.escapeHtml(p.title)}" data-meta="${UI.escapeHtml(p.subtitle)}">
                  🔍 Inspect
                </button>
              </div>
            </div>
          </div>
        `).join('');

        const modal = document.getElementById('photoModal');
        const modalImg = document.getElementById('modalPhotoImg');
        const modalTitle = document.getElementById('modalPhotoTitle');
        const modalMeta = document.getElementById('modalPhotoMeta');
        const closeModal = document.getElementById('closePhotoModalBtn');

        document.querySelectorAll('.audit-img-click, .audit-inspect-btn').forEach(el => {
          el.addEventListener('click', () => {
            modalImg.src = el.dataset.url;
            modalTitle.textContent = el.dataset.title;
            modalMeta.textContent = el.dataset.meta;
            modal.style.display = 'flex';
          });
        });

        if (closeModal) closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
      }
    }

    const impact = Api.getPlatformImpact();
    document.getElementById('platformImpact').innerHTML = `
      <div class="glass-impact-card">
        <div class="flex-between">
          <div>
            <span class="dash-role-badge" style="background:rgba(0,229,153,.15); color:#00E599; border-color:rgba(0,229,153,.3);">ESG & Backhaul Efficiency Ledger</span>
            <h2 style="color:#fff; margin:0.4rem 0 0; font-size:1.4rem;">Platform Verified Impact</h2>
          </div>
          <a class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,.2); color:#fff;" href="corridors.html">Explore 42 Road Corridors →</a>
        </div>
        <div class="glass-impact-grid">
          <div class="glass-impact-tile">
            <div class="n">${impact.emptyCapacityUtilizedPct}%</div>
            <div class="lbl">Empty capacity re-utilized</div>
          </div>
          <div class="glass-impact-tile">
            <div class="n">${UI.money(impact.driverAdditionalIncome)}</div>
            <div class="lbl">Extra driver income unlocked</div>
          </div>
          <div class="glass-impact-tile">
            <div class="n">${UI.money(impact.customerSavings)}</div>
            <div class="lbl">Shipper savings vs. standard rate</div>
          </div>
          <div class="glass-impact-tile">
            <div class="n">${impact.estimatedEmptyDistanceAvoidedKm.toLocaleString('en-IN')} km</div>
            <div class="lbl">Empty highway runs eliminated</div>
          </div>
        </div>
        <p class="text-soft mt-3" style="font-size:.78rem; color:#8AA4BD; margin-bottom:0;">Figures verified against traditional return-leg empty freight baseline. <span class="rf-badge-estimated">Live Telemetry</span></p>
      </div>`;
  }
  init();
}
