Auth.redirectIfLoggedIn('');

const roleInput = document.getElementById('role');
const customerBtn = document.getElementById('roleCustomerBtn');
const driverBtn = document.getElementById('roleDriverBtn');
const companyField = document.getElementById('companyField');
const vehicleTypeField = document.getElementById('vehicleTypeField');
const vehicleNumberField = document.getElementById('vehicleNumberField');

function setRole(role) {
  roleInput.value = role;
  customerBtn.classList.toggle('active', role === 'customer');
  driverBtn.classList.toggle('active', role === 'driver');
  companyField.style.display = role === 'customer' ? 'block' : 'none';
  vehicleTypeField.style.display = role === 'driver' ? 'block' : 'none';
  vehicleNumberField.style.display = role === 'driver' ? 'block' : 'none';
}

customerBtn.addEventListener('click', () => setRole('customer'));
driverBtn.addEventListener('click', () => setRole('driver'));

const params = new URLSearchParams(window.location.search);
setRole(params.get('role') === 'driver' ? 'driver' : 'customer');

// --- Dynamic Demo Data Pools ---
const SAMPLE_SHIPPERS = [
  { name: 'Aarav Singhania', company: 'Singhania Agro Foods Pvt Ltd', prefix: 'singhania' },
  { name: 'Mehul Deshmukh', company: 'Deshmukh Cotton & Grains Hub', prefix: 'deshmukh' },
  { name: 'Kavita Nair', company: 'Kaveri Textile Logistics', prefix: 'kaveri' },
  { name: 'Rajesh Chawla', company: 'Chawla Steel & Spares Co', prefix: 'chawla' },
  { name: 'Vikramaditya Joshi', company: 'Deccan Organic Produce Traders', prefix: 'deccan' },
  { name: 'Ananya Iyer', company: 'Coromandel Spice Exporters', prefix: 'coromandel' }
];

const SAMPLE_DRIVERS = [
  { name: 'Balwinder Singh', vehicleType: 'Open Truck - 9T', platePrefix: 'PB10 BK', prefix: 'balwinder' },
  { name: 'Manoj Gurjar', vehicleType: 'Tata Ace - 0.75T', platePrefix: 'MH12 AB', prefix: 'gurjar' },
  { name: 'Rameshwar Yadav', vehicleType: 'Container - 20ft', platePrefix: 'HR55 CD', prefix: 'yadav' },
  { name: 'Santosh Patil', vehicleType: 'Container - 32ft', platePrefix: 'MH14 EF', prefix: 'patil' },
  { name: 'Deepak Verma', vehicleType: 'Mini Truck - 3T', platePrefix: 'DL01 XY', prefix: 'deepak' },
  { name: 'Ganesh Shinde', vehicleType: 'Open Truck - 9T', platePrefix: 'AP16 GH', prefix: 'shinde' }
];

function generateDynamicShipper() {
  const s = SAMPLE_SHIPPERS[Math.floor(Math.random() * SAMPLE_SHIPPERS.length)];
  const salt = Math.floor(1000 + Math.random() * 9000);
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  return {
    role: 'customer',
    name: s.name,
    company: s.company,
    email: `${s.prefix}.${salt}@routefill.in`,
    phone: `98${phoneSuffix}`,
    password: `Shipper@${salt}`
  };
}

function generateDynamicDriver() {
  const d = SAMPLE_DRIVERS[Math.floor(Math.random() * SAMPLE_DRIVERS.length)];
  const salt = Math.floor(1000 + Math.random() * 9000);
  const plateNum = Math.floor(1000 + Math.random() * 9000);
  const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
  return {
    role: 'driver',
    name: d.name,
    vehicleType: d.vehicleType,
    vehicleNumber: `${d.platePrefix} ${plateNum}`,
    email: `${d.prefix}.captain.${salt}@routefill.in`,
    phone: `97${phoneSuffix}`,
    password: `Driver@${salt}`
  };
}

function fillForm(data) {
  setRole(data.role);
  const nameEl = document.getElementById('name');
  const phoneEl = document.getElementById('phone');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const companyEl = document.getElementById('company');
  const vehicleTypeEl = document.getElementById('vehicleType');
  const vehicleNumberEl = document.getElementById('vehicleNumber');

  nameEl.value = data.name;
  phoneEl.value = data.phone;
  emailEl.value = data.email;
  passwordEl.value = data.password;

  if (data.role === 'customer') {
    companyEl.value = data.company;
  } else {
    vehicleTypeEl.value = data.vehicleType;
    vehicleNumberEl.value = data.vehicleNumber;
  }

  // Clear errors
  ['nameField', 'phoneField', 'emailField', 'passwordField'].forEach(id => {
    document.getElementById(id).classList.remove('invalid');
  });

  // Highlight pulse animation
  [nameEl, phoneEl, emailEl, passwordEl, companyEl, vehicleNumberEl].forEach(el => {
    el.classList.remove('highlight-field');
    void el.offsetWidth; // trigger reflow
    el.classList.add('highlight-field');
  });
}

// Wire quick fill buttons
const quickShipperBtn = document.getElementById('quickFillShipperBtn');
if (quickShipperBtn) {
  quickShipperBtn.addEventListener('click', () => {
    const data = generateDynamicShipper();
    fillForm(data);
    UI.toast(`Filled sample Customer: ${data.name}`);
  });
}

const quickDriverBtn = document.getElementById('quickFillDriverBtn');
if (quickDriverBtn) {
  quickDriverBtn.addEventListener('click', () => {
    const data = generateDynamicDriver();
    fillForm(data);
    UI.toast(`Filled sample Driver: ${data.name}`);
  });
}

const randomizeBtn = document.getElementById('randomizeDemoBtn');
if (randomizeBtn) {
  randomizeBtn.addEventListener('click', () => {
    const curRole = roleInput.value;
    const data = curRole === 'driver' ? generateDynamicDriver() : generateDynamicShipper();
    fillForm(data);
    UI.toast(`Generated fresh sample details: ${data.name}`);
  });
}

// --- Theme Toggle Wiring ---
const authThemeBtn = document.getElementById('authThemeToggle');
if (authThemeBtn) {
  function updateThemeBtnText() {
    const t = UI.getTheme();
    authThemeBtn.innerHTML = t === 'dark' ? '☀️ Light' : '🌙 Dark';
  }
  updateThemeBtnText();
  authThemeBtn.addEventListener('click', () => {
    UI.toggleTheme();
    updateThemeBtnText();
  });
}

// --- Connection Health Indicator ---
const authConnPill = document.getElementById('authConnStatus');
const authConnTxt = document.getElementById('authConnText');
if (authConnPill && authConnTxt) {
  UI.checkBackendHealth().then(isLive => {
    if (isLive) {
      authConnPill.className = 'rf-conn-status';
      authConnTxt.textContent = 'REST API';
      authConnPill.title = 'Connected to Spring Boot REST Backend';
    } else {
      authConnPill.className = 'rf-conn-status local';
      authConnTxt.textContent = 'Local Edge';
      authConnPill.title = 'Offline / Local Edge Storage mode active';
    }
  });
}

// --- Form Submission & API Connection ---
document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const name = document.getElementById('name');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const submitBtn = document.getElementById('submitRegisterBtn');

  ['nameField', 'phoneField', 'emailField', 'passwordField'].forEach(id => {
    document.getElementById(id).classList.remove('invalid');
  });

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  let valid = true;
  if (!name.value.trim()) {
    document.getElementById('nameField').classList.add('invalid');
    valid = false;
  }
  if (!phoneRegex.test(phone.value.trim())) {
    document.getElementById('phoneField').classList.add('invalid');
    valid = false;
  }
  if (!emailRegex.test(email.value.trim())) {
    document.getElementById('emailField').classList.add('invalid');
    valid = false;
  }
  if (password.value.length < 6) {
    document.getElementById('passwordField').classList.add('invalid');
    valid = false;
  }
  if (!valid) {
    UI.toast('Please correct the highlighted fields before submitting.', 'error');
    return;
  }

  const role = roleInput.value;
  const payload = {
    role: role,
    name: name.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim().toLowerCase(),
    password: password.value,
    company: role === 'customer' ? document.getElementById('company').value.trim() : '',
    vehicleType: role === 'driver' ? document.getElementById('vehicleType').value : '',
    vehicleNumber: role === 'driver' ? document.getElementById('vehicleNumber').value.trim() : ''
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const result = await Api.register(payload);
    if (!result.ok) {
      UI.toast(result.error || 'Failed to create account. Please check your data.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
      return;
    }

    UI.toast('Account created successfully. Welcome, ' + (result.user.name ? result.user.name.split(' ')[0] : 'Partner') + '!');
    setTimeout(() => {
      if (result.user.role === 'driver') {
        window.location.href = 'pages/driver/kyc-onboarding.html';
      } else {
        window.location.href = Auth.DASH[result.user.role];
      }
    }, 450);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
    UI.toast(err.message || 'Connection error creating account.', 'error');
  }
});
