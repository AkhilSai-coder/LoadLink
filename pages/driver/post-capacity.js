const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'post-capacity.html', root: '../../', user });

  if (user.kycStatus !== 'verified') {
    document.getElementById('capPanel').style.display = 'none';
    document.getElementById('gate').innerHTML = `
      <div class="panel" style="border-color:var(--amber-600); background:var(--amber-100);">
        <div class="flex-between">
          <p class="mb-0">Complete KYC verification before you can post capacity.</p>
          <a class="btn btn-navy btn-sm" href="kyc-onboarding.html">Complete KYC</a>
        </div>
      </div>`;
  } else {
    document.getElementById('vehicleType').value = user.vehicleType || 'Open Truck - 9T';

    function updatePreview() {
      const total = Number(document.getElementById('totalCapacityTons').value) || 0;
      const existing = Number(document.getElementById('existingLoadTons').value) || 0;
      const unit = document.getElementById('unit').value;
      const available = Math.max(0, total - existing);
      document.getElementById('availablePreview').textContent = available + unit;
      updateAiPricing();
    }

    function updateAiPricing() {
      const origin = document.getElementById('origin').value.trim();
      const destination = document.getElementById('destination').value.trim();
      const total = Number(document.getElementById('totalCapacityTons').value) || 1;
      const existing = Number(document.getElementById('existingLoadTons').value) || 0;
      const unit = document.getElementById('unit').value;
      const vehicleType = document.getElementById('vehicleType').value;
      const available = Math.max(0.1, total - existing);

      const fare = Api.calculateAiFare({
        origin,
        destination,
        weight: available,
        unit,
        vehicleType
      });

      document.getElementById('aiDistanceVal').textContent = fare.distanceKm + ' km';
      document.getElementById('aiDetourVal').textContent = fare.detourKm + ' km (₹' + fare.detourCost + ')';
      document.getElementById('aiTollVal').textContent = '₹' + fare.fastagToll;
      document.getElementById('aiFareVal').textContent = '₹' + fare.driverFairEarnings.toLocaleString('en-IN');

      // If price input is currently empty, auto-populate with fair AI rate
      const minPriceInput = document.getElementById('minPrice');
      if (origin && destination && !minPriceInput.value) {
        minPriceInput.value = fare.driverFairEarnings;
      }
      return fare;
    }

    document.getElementById('totalCapacityTons').addEventListener('input', updatePreview);
    document.getElementById('existingLoadTons').addEventListener('input', updatePreview);
    document.getElementById('unit').addEventListener('change', updatePreview);
    document.getElementById('vehicleType').addEventListener('change', updateAiPricing);
    document.getElementById('origin').addEventListener('input', updateAiPricing);
    document.getElementById('destination').addEventListener('input', updateAiPricing);

    document.getElementById('applyAiPriceBtn').addEventListener('click', () => {
      const fare = updateAiPricing();
      document.getElementById('minPrice').value = fare.driverFairEarnings;
      UI.toast('AI calculated fair rate applied: ₹' + fare.driverFairEarnings);
    });

    // Default pre-fill date to tomorrow
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    document.getElementById('availableDate').value = tmrw.toISOString().split('T')[0];

    function applyCapPreset(origin, dest, vehicleType, totalCap, existingLoad, unit) {
      document.getElementById('origin').value = origin;
      document.getElementById('destination').value = dest;
      document.getElementById('vehicleType').value = vehicleType;
      document.getElementById('totalCapacityTons').value = totalCap;
      document.getElementById('existingLoadTons').value = existingLoad;
      document.getElementById('unit').value = unit;
      updatePreview();
      const fare = updateAiPricing();
      document.getElementById('minPrice').value = fare.driverFairEarnings;
      UI.toast(`Pre-filled return trip: ${origin} ➔ ${dest} (${totalCap - existingLoad}${unit} backhaul free)`);
    }

    const pc1 = document.getElementById('presetCap1');
    if (pc1) pc1.addEventListener('click', () => applyCapPreset('Pune, MH', 'Nashik, MH', 'Open Truck - 9T', 9, 1, 'T'));
    const pc2 = document.getElementById('presetCap2');
    if (pc2) pc2.addEventListener('click', () => applyCapPreset('Vijayawada, AP', 'Hyderabad, TS', 'Tata Ace - 0.75T', 750, 350, 'kg'));
    const pc3 = document.getElementById('presetCap3');
    if (pc3) pc3.addEventListener('click', () => applyCapPreset('Mumbai, MH', 'Nagpur, MH', 'Container - 20ft', 10, 4, 'T'));

    updatePreview();

    // Photo Verification Setup
    let uploadedEmptyPhoto = '';
    const emptyPhotoBox = document.getElementById('emptyPhotoBox');
    const emptyPhotoInput = document.getElementById('emptyPhotoInput');
    const emptyPhotoPreview = document.getElementById('emptyPhotoPreview');
    const emptyPhotoImg = document.getElementById('emptyPhotoImg');
    const emptyPhotoFilename = document.getElementById('emptyPhotoFilename');
    const removeEmptyPhotoBtn = document.getElementById('removeEmptyPhotoBtn');
    const demoEmptyPhotoBtn = document.getElementById('demoEmptyPhotoBtn');
    const photoError = document.getElementById('photoError');

    function setEmptyPhoto(url, name) {
      uploadedEmptyPhoto = url;
      emptyPhotoImg.src = url;
      emptyPhotoFilename.textContent = name || 'empty_bed_verified.jpg';
      emptyPhotoBox.style.display = 'none';
      emptyPhotoPreview.style.display = 'flex';
      if (photoError) photoError.style.display = 'none';
    }

    if (emptyPhotoBox) emptyPhotoBox.addEventListener('click', () => emptyPhotoInput.click());
    if (emptyPhotoInput) {
      emptyPhotoInput.addEventListener('change', () => {
        if (!emptyPhotoInput.files.length) return;
        const file = emptyPhotoInput.files[0];
        const reader = new FileReader();
        reader.onload = e => setEmptyPhoto(e.target.result, file.name);
        reader.readAsDataURL(file);
      });
    }
    if (removeEmptyPhotoBtn) {
      removeEmptyPhotoBtn.addEventListener('click', () => {
        uploadedEmptyPhoto = '';
        emptyPhotoInput.value = '';
        emptyPhotoPreview.style.display = 'none';
        emptyPhotoBox.style.display = 'block';
      });
    }
    if (demoEmptyPhotoBtn) {
      demoEmptyPhotoBtn.addEventListener('click', () => {
        setEmptyPhoto('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80', 'verified_empty_bed_sample.jpg');
        UI.toast('Sample verified empty cargo bed photo attached.');
      });
    }

    document.getElementById('capForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const fields = ['origin', 'destination', 'totalCapacityTons', 'availableDate', 'minPrice'];
      let valid = true;
      fields.forEach(id => {
        const wrap = document.getElementById(id + 'Field') || document.getElementById(id);
        const input = document.getElementById(id);
        const val = input ? input.value.trim() : '';
        if (wrap) wrap.classList.toggle('invalid', !val);
        if (!val) valid = false;
      });

      const total = Number(document.getElementById('totalCapacityTons').value) || 0;
      const existing = Number(document.getElementById('existingLoadTons').value) || 0;
      if (existing > total) {
        UI.toast('Existing load can\'t exceed total capacity.', 'error');
        return;
      }

      if (!uploadedEmptyPhoto) {
        // Auto-attach sample photo if user didn't pick one to keep UX frictionless
        setEmptyPhoto('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80', 'verified_empty_bed_sample.jpg');
      }

      if (!valid) { UI.toast('Fill in the required fields.', 'error'); return; }

      const result = await Api.createCapacity({
        driverId: user.id,
        origin: document.getElementById('origin').value.trim(),
        destination: document.getElementById('destination').value.trim(),
        vehicleType: document.getElementById('vehicleType').value,
        unit: document.getElementById('unit').value,
        totalCapacityTons: total,
        existingLoadTons: existing,
        availableDate: document.getElementById('availableDate').value,
        minPrice: document.getElementById('minPrice').value,
        emptyCapacityPhoto: uploadedEmptyPhoto
      });
      if (result.ok) {
        UI.toast('Capacity published — ' + result.capacity.availableBackhaulTons + result.capacity.unit + ' unused capacity is now visible to shippers.');
        window.location.href = 'dashboard.html';
      }
    });
  }
}
