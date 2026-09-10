const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'disputes.html', root: '../../', user });

  async function render() {
    const disputes = await Api.getDisputes();
    const wrap = document.getElementById('disputeList');
    if (!disputes.length) {
      wrap.innerHTML = `<div class="empty-state panel"><h3>No disputes</h3><p>Nothing has been flagged for review.</p></div>`;
      return;
    }
    wrap.innerHTML = disputes.map(d => `
      <div class="waybill">
        <div class="waybill-top">
          <span class="waybill-id">DISPUTE · ${d.id.toUpperCase()} · trip ${d.matchId.toUpperCase()}</span>
          <span class="stamp ${d.status === 'open' ? 'stamp-disputed' : 'stamp-delivered'}">${d.status === 'open' ? 'Open' : 'Resolved'}</span>
        </div>
        <div class="waybill-meta">
          <span>Route <strong>${UI.escapeHtml(d.match.load ? d.match.load.origin + ' → ' + d.match.load.destination : '—')}</strong></span>
          <span>Driver <strong>${UI.escapeHtml(d.match.driver ? d.match.driver.name : '')}</strong></span>
          <span>Shipper <strong>${UI.escapeHtml(d.match.customer ? d.match.customer.name : '')}</strong></span>
        </div>
        <p class="mt-1">"${UI.escapeHtml(d.reason)}"</p>
        ${d.status === 'resolved' ? `<p class="text-soft">Resolution: ${UI.escapeHtml(d.resolutionNote || '')}</p>` : `
          <div class="waybill-actions">
            <button class="btn btn-primary btn-sm resolve-btn" data-id="${d.id}">Mark resolved</button>
          </div>`}
      </div>
    `).join('');

    wrap.querySelectorAll('.resolve-btn').forEach(b => b.addEventListener('click', async () => {
      const note = window.prompt('Resolution note:', 'Reviewed with both parties, refund/adjustment applied.');
      if (note === null) return;
      await Api.resolveDispute(b.dataset.id, note);
      UI.toast('Dispute marked resolved.');
      render();
    }));
  }

  render();
}
