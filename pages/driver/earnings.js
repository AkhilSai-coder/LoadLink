const user = Auth.requireRole('driver', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'driver', active: 'earnings.html', root: '../../', user });

    const bills = await Api.getBillsForDriver(user.id);
  const total = bills.reduce((s, b) => s + b.freightAmount + b.tollCharges + b.otherCharges, 0);
  const paid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.freightAmount + b.tollCharges + b.otherCharges, 0);
  const pending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.freightAmount + b.tollCharges + b.otherCharges, 0);

  document.getElementById('statTotal').textContent = UI.money(total);
  document.getElementById('statPaid').textContent = UI.money(paid);
  document.getElementById('statPending').textContent = UI.money(pending);
  document.getElementById('statTrips').textContent = matches.filter(m => m.status === 'delivered').length;

  const matches = await Api.getMatchesForUser(user.id, 'driver');
  const impact = await Api.getDriverImpact(user.id);
  document.getElementById('impactRoot').innerHTML = `
    <h2>Savings & Impact</h2>
    <div class="stat-grid">
      <div class="stat"><div class="n">${UI.money(impact.additionalIncome)}</div><div class="label">Additional income through LoadLink</div></div>
      <div class="stat"><div class="n">${impact.unusedCapacityUtilizedTons}T</div><div class="label">Unused capacity utilized</div></div>
      <div class="stat"><div class="n">${impact.roadTripsWithAdditionalCargo}</div><div class="label">Road trips with additional cargo</div></div>
    </div>
  `;

  const rows = document.getElementById('billRows');
  if (!bills.length) {
    rows.innerHTML = `<tr><td colspan="7" class="text-soft">No bills submitted yet — submit one after marking a trip delivered.</td></tr>`;
  } else {
    rows.innerHTML = bills.map(b => `
      <tr>
        <td>${b.match.id.toUpperCase()}</td>
        <td>${UI.escapeHtml(b.match.load ? b.match.load.origin + ' → ' + b.match.load.destination : '—')}</td>
        <td class="num">${UI.money(b.freightAmount)}</td>
        <td class="num">${UI.money(b.tollCharges)}</td>
        <td class="num">${UI.money(b.otherCharges)}</td>
        <td class="num"><strong>${UI.money(b.freightAmount + b.tollCharges + b.otherCharges)}</strong></td>
        <td><span class="stamp ${UI.stampClass(b.status)}">${UI.statusLabel[b.status] || b.status}</span></td>
      </tr>
    `).join('');
  }
  }
  init();
}
