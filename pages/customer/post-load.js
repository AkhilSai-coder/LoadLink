const user = Auth.requireRole('customer', '../../');
if (user) {
  UI.renderNav({ role: 'customer', active: 'post-load.html', root: '../../', user });

  let submitMode = 'publish';
  document.querySelectorAll('#loadForm button[type="submit"]').forEach(btn => {
    btn.addEventListener('click', () => { submitMode = btn.dataset.mode; });
  });

  // AI Route & Fare Budget Assistant
  function updateAiBudget() {
    const origin = document.getElementById('origin').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const weight = Number(document.getElementById('weightTons').value) || 1;
    const unit = document.getElementById('unit').value;

    const fare = Api.calculateAiFare({
      origin,
      destination,
      weight,
      unit,
      vehicleType: 'Open Truck - 9T'
    });

    document.getElementById('aiCustDistanceVal').textContent = fare.distanceKm + ' km';
    document.getElementById('aiCustStandardVal').textContent = '₹' + fare.standardFreight.toLocaleString('en-IN');
    document.getElementById('aiCustSavingsVal').textContent = 'Save ₹' + fare.backhaulSavings.toLocaleString('en-IN');
    document.getElementById('aiCustBudgetVal').textContent = '₹' + fare.customerFairBudget.toLocaleString('en-IN');

    const budgetInput = document.getElementById('budget');
    if (origin && destination && !budgetInput.value) {
      budgetInput.value = fare.customerFairBudget;
    }
    return fare;
  }

  document.getElementById('origin').addEventListener('input', updateAiBudget);
  document.getElementById('destination').addEventListener('input', updateAiBudget);
  document.getElementById('weightTons').addEventListener('input', updateAiBudget);
  document.getElementById('unit').addEventListener('change', updateAiBudget);

  document.getElementById('applyAiBudgetBtn').addEventListener('click', () => {
    const fare = updateAiBudget();
    document.getElementById('budget').value = fare.customerFairBudget;
    UI.toast('AI fair budget applied: ₹' + fare.customerFairBudget);
  });

  // Default pre-fill date to tomorrow
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  document.getElementById('pickupDate').value = tmrw.toISOString().split('T')[0];

  function applyLoadPreset(origin, dest, material, weight, unit) {
    document.getElementById('origin').value = origin;
    document.getElementById('destination').value = dest;
    document.getElementById('material').value = material;
    document.getElementById('weightTons').value = weight;
    document.getElementById('unit').value = unit;
    const fare = updateAiBudget();
    document.getElementById('budget').value = fare.customerFairBudget;
    UI.toast(`Pre-filled corridor: ${origin} ➔ ${dest} (${weight}${unit})`);
  }

  const p1 = document.getElementById('presetLoad1');
  if (p1) p1.addEventListener('click', () => applyLoadPreset('Nashik, MH', 'Pune, MH', 'Onion sacks (50kg)', 8, 'T'));
  const p2 = document.getElementById('presetLoad2');
  if (p2) p2.addEventListener('click', () => applyLoadPreset('Vijayawada, AP', 'Hyderabad, TS', 'Handicraft & Pottery Cartons', 250, 'kg'));
  const p3 = document.getElementById('presetLoad3');
  if (p3) p3.addEventListener('click', () => applyLoadPreset('Surat, GJ', 'Mumbai, MH', 'Textile bales & Cotton rolls', 4, 'T'));

  updateAiBudget();

  // Photo uploads: Goods Photo & Bill/e-Waybill Photo
  let uploadedGoodsPhoto = '';
  let uploadedBillPhoto = '';

  const goodsPhotoBox = document.getElementById('goodsPhotoBox');
  const goodsPhotoInput = document.getElementById('goodsPhotoInput');
  const goodsPhotoPreview = document.getElementById('goodsPhotoPreview');
  const goodsPhotoImg = document.getElementById('goodsPhotoImg');
  const removeGoodsPhotoBtn = document.getElementById('removeGoodsPhotoBtn');
  const demoGoodsPhotoBtn = document.getElementById('demoGoodsPhotoBtn');

  function setGoodsPhoto(url) {
    uploadedGoodsPhoto = url;
    goodsPhotoImg.src = url;
    goodsPhotoBox.style.display = 'none';
    goodsPhotoPreview.style.display = 'flex';
  }

  if (goodsPhotoBox) goodsPhotoBox.addEventListener('click', () => goodsPhotoInput.click());
  if (goodsPhotoInput) {
    goodsPhotoInput.addEventListener('change', () => {
      if (!goodsPhotoInput.files.length) return;
      const reader = new FileReader();
      reader.onload = e => setGoodsPhoto(e.target.result);
      reader.readAsDataURL(goodsPhotoInput.files[0]);
    });
  }
  if (removeGoodsPhotoBtn) {
    removeGoodsPhotoBtn.addEventListener('click', () => {
      uploadedGoodsPhoto = '';
      goodsPhotoInput.value = '';
      goodsPhotoPreview.style.display = 'none';
      goodsPhotoBox.style.display = 'block';
    });
  }
  if (demoGoodsPhotoBtn) {
    demoGoodsPhotoBtn.addEventListener('click', () => {
      setGoodsPhoto('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80');
      UI.toast('Sample packaged goods photo attached.');
    });
  }

  const billPhotoBox = document.getElementById('billPhotoBox');
  const billPhotoInput = document.getElementById('billPhotoInput');
  const billPhotoPreview = document.getElementById('billPhotoPreview');
  const billPhotoImg = document.getElementById('billPhotoImg');
  const removeBillPhotoBtn = document.getElementById('removeBillPhotoBtn');
  const demoBillPhotoBtn = document.getElementById('demoBillPhotoBtn');

  function setBillPhoto(url) {
    uploadedBillPhoto = url;
    billPhotoImg.src = url;
    billPhotoBox.style.display = 'none';
    billPhotoPreview.style.display = 'flex';
  }

  if (billPhotoBox) billPhotoBox.addEventListener('click', () => billPhotoInput.click());
  if (billPhotoInput) {
    billPhotoInput.addEventListener('change', () => {
      if (!billPhotoInput.files.length) return;
      const reader = new FileReader();
      reader.onload = e => setBillPhoto(e.target.result);
      reader.readAsDataURL(billPhotoInput.files[0]);
    });
  }
  if (removeBillPhotoBtn) {
    removeBillPhotoBtn.addEventListener('click', () => {
      uploadedBillPhoto = '';
      billPhotoInput.value = '';
      billPhotoPreview.style.display = 'none';
      billPhotoBox.style.display = 'block';
    });
  }
  if (demoBillPhotoBtn) {
    demoBillPhotoBtn.addEventListener('click', () => {
      setBillPhoto('https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80');
      UI.toast('Sample toll gate & e-Waybill document attached.');
    });
  }

  document.getElementById('loadForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const fields = ['origin', 'destination', 'material', 'weightTons', 'pickupDate', 'budget'];
    let valid = true;
    fields.forEach(id => {
      const wrap = document.getElementById(id + 'Field') || document.getElementById(id);
      const input = document.getElementById(id);
      const val = input ? input.value.trim() : '';
      if (wrap) wrap.classList.toggle('invalid', !val);
      if (!val) valid = false;
    });

    // Auto-attach sample verification photos if user didn't upload any
    if (!uploadedGoodsPhoto) {
      setGoodsPhoto('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80');
    }
    if (!uploadedBillPhoto) {
      setBillPhoto('https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=600&q=80');
    }

    if (!valid) { UI.toast('Fill in the required fields.', 'error'); return; }

    const result = await Api.createLoad({
      customerId: user.id,
      origin: document.getElementById('origin').value.trim(),
      destination: document.getElementById('destination').value.trim(),
      material: document.getElementById('material').value.trim(),
      weightTons: document.getElementById('weightTons').value,
      unit: document.getElementById('unit').value,
      pickupDate: document.getElementById('pickupDate').value,
      budget: document.getElementById('budget').value,
      notes: document.getElementById('notes').value.trim(),
      goodsPhoto: uploadedGoodsPhoto,
      billPhoto: uploadedBillPhoto,
      saveAsDraft: submitMode === 'draft'
    });

    if (result.ok) {
      UI.toast(submitMode === 'draft' ? 'Load saved as draft.' : 'Load posted — we\'ll start matching now.');
      window.location.href = 'load-detail.html?id=' + result.load.id;
    }
  });
}
