const user = Auth.requireRole('customer', '../../');
if (user) {
  async function init() {
    UI.renderNav({ role: 'customer', active: 'savings-impact.html', root: '../../', user });

    const impact = await Api.getCustomerImpact(user.id);
  document.getElementById('impactRoot').innerHTML = `
    <div class="stat-grid">
      <div class="stat"><div class="n">${UI.money(impact.totalSaved)}</div><div class="label">Total money saved</div></div>
      <div class="stat"><div class="n">${impact.completedConsignments}</div><div class="label">Completed road consignments</div></div>
      <div class="stat"><div class="n">${impact.goodsTransportedTons}T</div><div class="label">Goods transported</div></div>
    </div>
    <p class="text-soft mt-2" style="font-size:.8rem;">Savings are estimated against a traditional road transport baseline — see the price comparison on each consignment for details.</p>
  `;
  }
  init();
}
