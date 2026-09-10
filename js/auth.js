/* ==========================================================================
   ROUTEFILL — auth.js
   Session + role guard. `root` is the relative path back to the project
   root from wherever the calling page lives (e.g. '../../' from
   pages/driver/dashboard.html, '' from index.html).
   ========================================================================== */

const Auth = {};

Auth.DASH = {
  customer: 'pages/customer/dashboard.html',
  driver: 'pages/driver/dashboard.html',
  admin: 'pages/admin/dashboard.html'
};

Auth.requireRole = function (role, root) {
  let user = Api.refreshSessionUser();
  if (!user) {
    // If running from file:// or direct iframe preview without stored session,
    // gracefully auto-authenticate with the role's primary demo account
    const demoMap = {
      driver: 'usr_driver_1',
      customer: 'usr_cust_1',
      admin: 'usr_admin_1'
    };
    if (demoMap[role]) {
      const fallback = Api.getUser(demoMap[role]);
      if (fallback) {
        Api.setSession(fallback);
        user = fallback;
      }
    }
  }
  if (!user) {
    window.location.href = root + 'login.html';
    return null;
  }
  if (user.role !== role) {
    window.location.href = root + Auth.DASH[user.role];
    return null;
  }
  return user;
};

Auth.redirectIfLoggedIn = function (root) {
  try {
    const apiObj = window.Api || (typeof Api !== 'undefined' ? Api : null);
    if (apiObj && typeof apiObj.getSession === 'function') {
      const user = apiObj.getSession();
      if (user && user.role && Auth.DASH[user.role]) {
        window.location.href = (root || '') + Auth.DASH[user.role];
      }
    }
  } catch (e) {}
};

Auth.logout = function (root) {
  try {
    const apiObj = window.Api || (typeof Api !== 'undefined' ? Api : null);
    if (apiObj && typeof apiObj.logout === 'function') {
      apiObj.logout();
    } else {
      sessionStorage.clear();
    }
  } catch (e) {
    sessionStorage.clear();
  }
  window.location.href = (root || '') + 'login.html';
};
