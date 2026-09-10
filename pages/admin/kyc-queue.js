const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'kyc-queue.html', root: '../../', user });

  async function render() {
    const queue = await Api.getKycQueue();
    const wrap = document.getElementById('queueList');
    if (!queue.length) {
      wrap.innerHTML = `<div class="empty-state panel"><h3>Queue is clear</h3><p>No drivers currently waiting on verification.</p></div>`;
      return;
    }
    wrap.innerHTML = queue.map(d => `
      <div class="waybill">
        <div class="waybill-top">
          <span class="waybill-id">DRIVER · ${d.id.toUpperCase()}</span>
          <span class="stamp stamp-pending">Pending review</span>
        </div>
        <div class="waybill-meta">
          <span><strong>${UI.escapeHtml(d.name)}</strong></span>
          <span>${UI.escapeHtml(d.phone)}</span>
          <span>${UI.escapeHtml(d.vehicleType || '')} · ${UI.escapeHtml(d.vehicleNumber || '')}</span>
        </div>
        <div class="waybill-meta">
          <span>Licence: <strong>${d.kycDocs && d.kycDocs.license ? '✓ ' + UI.escapeHtml(d.kycDocs.license) : 'Missing'}</strong></span>
          <span>RC: <strong>${d.kycDocs && d.kycDocs.rc ? '✓ ' + UI.escapeHtml(d.kycDocs.rc) : 'Missing'}</strong></span>
          <span>ID: <strong>${d.kycDocs && d.kycDocs.aadhaar ? '✓ ' + UI.escapeHtml(d.kycDocs.aadhaar) : 'Missing'}</strong></span>
        </div>
        <div class="waybill-actions">
          <button class="btn btn-primary btn-sm approve-btn" data-id="${d.id}">Approve</button>
          <button class="btn btn-danger btn-sm reject-btn" data-id="${d.id}">Reject</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', async () => {
      await Api.decideKyc(b.dataset.id, 'verified');
      UI.toast('Driver verified.');
      render();
    }));
    wrap.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {
      const note = window.prompt('Reason for rejection (shown to the driver):', 'Document unclear, please re-upload.');
      if (note === null) return;
      await Api.decideKyc(b.dataset.id, 'rejected', note);
      UI.toast('KYC rejected.');
      render();
    }));
  }

  render();
}
