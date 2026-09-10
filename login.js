Auth.redirectIfLoggedIn('');

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const emailField = document.getElementById('emailField');
  const passField = document.getElementById('passwordField');
  emailField.classList.remove('invalid');
  passField.classList.remove('invalid');

  let valid = true;
  if (!emailEl.value.includes('@')) { emailField.classList.add('invalid'); valid = false; }
  if (!passEl.value) { passField.classList.add('invalid'); valid = false; }
  if (!valid) return;

  const result = await Api.login(emailEl.value.trim(), passEl.value);
  if (!result.ok) {
    UI.toast(result.error, 'error');
    passField.classList.add('invalid');
    passField.querySelector('.field-error').textContent = result.error;
    return;
  }
  UI.toast('Welcome back, ' + result.user.name.split(' ')[0] + '.');
  window.location.href = Auth.DASH[result.user.role];
});

window.quickLogin = async function (email, pass) {
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  emailEl.value = email;
  passEl.value = pass;
  UI.toast('Logging in as ' + email.split('@')[0] + '...');
  const result = await Api.login(email, pass);
  if (!result.ok) {
    UI.toast(result.error || 'Login failed', 'error');
    return;
  }
  UI.toast('Welcome, ' + result.user.name.split(' ')[0] + '!');
  window.location.href = Auth.DASH[result.user.role];
};

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
