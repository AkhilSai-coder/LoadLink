const user = Auth.requireRole('admin', '../../');
if (user) {
  UI.renderNav({ role: 'admin', active: 'bill-queue.html', root: '../../', user });

  async function render() {
    const bills = await Api.getBillQueue();
    const rows = document.getElementById('billRows');
    if (!bills.length) {
      rows.innerHTML = `<tr><td colspan="8" class="text-soft">No bills waiting for approval.</td></tr>`;
      return;
    }
    rows.innerHTML = bills.map(b => `
      <tr>
        <td>${b.match.id.toUpperCase()}</td>
        <td>${UI.escapeHtml(b.match.driver.name || '')}</td>
        <td>${UI.escapeHtml(b.match.load ? b.match.load.origin + ' → ' + b.match.load.destination : '—')}</td>
        <td class="num">${UI.money(b.freightAmount)}</td>
        <td class="num">${UI.money(b.tollCharges)}</td>
        <td class="num">${UI.money(b.otherCharges)}</td>
        <td class="num"><strong>${UI.money(b.freightAmount + b.tollCharges + b.otherCharges)}</strong></td>
        <td>
          <button class="btn btn-primary btn-sm approve-btn" data-id="${b.id}">Approve</button>
          <button class="btn btn-danger btn-sm reject-btn" data-id="${b.id}">Reject</button>
        </td>
      </tr>
    `).join('');

    rows.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', async () => {
      await Api.decideBill(b.dataset.id, 'approved');
      UI.toast('Bill approved for payout.');
      render();
    }));
    rows.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', async () => {
      await Api.decideBill(b.dataset.id, 'rejected');
      UI.toast('Bill rejected.');
      render();
    }));
  }

  render();
}
