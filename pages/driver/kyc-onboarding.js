const user = Auth.requireRole('driver', '../../');
if (user) {
  UI.renderNav({ role: 'driver', active: 'dashboard.html', root: '../../', user });

  const content = document.getElementById('stepContent');
  const dots = document.querySelectorAll('#stepTrack .dot');
  const docs = { license: user.kycDocs && user.kycDocs.license, rc: user.kycDocs && user.kycDocs.rc, aadhaar: user.kycDocs && user.kycDocs.aadhaar };
  let step = 0;

  if (user.kycStatus === 'verified') {
    document.getElementById('kycPanel').innerHTML = `
      <div class="empty-state">
        <h3>You're verified</h3>
        <p>Your KYC is complete — you can post capacity and accept matches any time.</p>
        <a class="btn btn-primary" href="post-capacity.html">Post capacity</a>
      </div>`;
  } else if (user.kycStatus === 'pending') {
    document.getElementById('kycPanel').innerHTML = `
      <div class="empty-state">
        <h3>Under review</h3>
        <p>We've received your documents (licence, RC${docs.aadhaar ? ', Aadhaar' : ''}). Our team typically verifies within a day.</p>
        <a class="btn btn-outline" href="dashboard.html">Back to dashboard</a>
      </div>`;
  } else {
    renderStep();
  }

  function updateDots() {
    dots.forEach((d, i) => {
      d.classList.remove('done', 'current');
      if (i < step) d.classList.add('done');
      if (i === step) d.classList.add('current');
    });
  }

  function uploadBox(id, label, existing, sampleName) {
    return `
      <div class="field">
        <div class="flex-between" style="align-items:center; margin-bottom:.3rem;">
          <label style="margin-bottom:0;">${label}</label>
          <button type="button" id="demoDocBtn_${id}" style="background:none; border:none; color:var(--highway); font-size:.78rem; font-weight:600; cursor:pointer; text-decoration:underline;">
            ⚡ Use Sample Document
          </button>
        </div>
        <div class="upload-box ${existing ? 'filled' : ''}" id="${id}Box">
          <div id="${id}Text">${existing ? '✓ ' + existing : 'Tap to upload (PDF or photo)'}</div>
        </div>
        <input type="file" id="${id}Input" style="display:none;" accept="image/*,.pdf">
      </div>`;
  }

  function wireUpload(id, key, sampleName) {
    const box = document.getElementById(id + 'Box');
    const input = document.getElementById(id + 'Input');
    const demoBtn = document.getElementById('demoDocBtn_' + id);
    box.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      if (!input.files.length) return;
      docs[key] = input.files[0].name;
      box.classList.add('filled');
      document.getElementById(id + 'Text').textContent = '✓ ' + docs[key];
    });
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        docs[key] = sampleName;
        box.classList.add('filled');
        document.getElementById(id + 'Text').textContent = '✓ ' + sampleName;
        UI.toast('Attached verified demo ' + key.toUpperCase() + ' document.');
      });
    }
  }

  function renderStep() {
    updateDots();
    if (step === 0) {
      content.innerHTML = `
        <h3>Step 1 of 3 — Driving licence</h3>
        <p class="text-soft">Upload a clear photo or scan of your valid commercial driving licence.</p>
        ${uploadBox('license', 'Driving licence', docs.license, 'DL_' + (user.name ? user.name.split(' ')[0].toLowerCase() : 'driver') + '_verified.pdf')}
        <button class="btn btn-primary btn-block mt-2" id="nextBtn">Continue</button>`;
      wireUpload('license', 'license', 'DL_' + (user.name ? user.name.split(' ')[0].toLowerCase() : 'driver') + '_verified.pdf');
      document.getElementById('nextBtn').addEventListener('click', () => {
        if (!docs.license) { UI.toast('Upload your driving licence to continue.', 'error'); return; }
        step = 1; renderStep();
      });
    } else if (step === 1) {
      const vPlate = (user.vehicleNumber || 'MH12 AB 4521').replace(/\s+/g, '_');
      content.innerHTML = `
        <h3>Step 2 of 3 — Vehicle RC</h3>
        <p class="text-soft">Upload your Registration Certificate for ${UI.escapeHtml(user.vehicleNumber || 'your vehicle')}.</p>
        ${uploadBox('rc', 'Registration certificate (RC)', docs.rc, 'RC_' + vPlate + '.pdf')}
        <div class="flex-wrap mt-2">
          <button class="btn btn-outline" id="backBtn">Back</button>
          <button class="btn btn-primary" id="nextBtn">Continue</button>
        </div>`;
      wireUpload('rc', 'rc', 'RC_' + vPlate + '.pdf');
      document.getElementById('backBtn').addEventListener('click', () => { step = 0; renderStep(); });
      document.getElementById('nextBtn').addEventListener('click', () => {
        if (!docs.rc) { UI.toast('Upload your RC to continue.', 'error'); return; }
        step = 2; renderStep();
      });
    } else {
      content.innerHTML = `
        <h3>Step 3 of 3 — Identity proof</h3>
        <p class="text-soft">Upload Aadhaar or another government ID for identity verification.</p>
        ${uploadBox('aadhaar', 'Aadhaar / government ID', docs.aadhaar, 'AADHAAR_' + (user.name ? user.name.split(' ')[0].toUpperCase() : 'DRIVER') + '.pdf')}
        <div class="flex-wrap mt-2">
          <button class="btn btn-outline" id="backBtn">Back</button>
          <button class="btn btn-primary" id="submitBtn">Submit for verification</button>
        </div>`;
      wireUpload('aadhaar', 'aadhaar', 'AADHAAR_' + (user.name ? user.name.split(' ')[0].toUpperCase() : 'DRIVER') + '.pdf');
      document.getElementById('backBtn').addEventListener('click', () => { step = 1; renderStep(); });
      document.getElementById('submitBtn').addEventListener('click', async () => {
        if (!docs.aadhaar) { UI.toast('Upload an ID document to continue.', 'error'); return; }
        await Api.submitKyc(user.id, docs);
        UI.toast('KYC submitted — we\'ll notify you once it\'s verified.');
        window.location.href = 'dashboard.html';
      });
    }
  }
}
