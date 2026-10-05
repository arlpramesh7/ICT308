export const $ = selector => document.querySelector(selector);
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = value => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
export const time = value => value ? new Date(value.includes('T') ? value : value + 'Z').toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const homeFor = role => role === 'owner' ? '/owner.html' : role === 'staff' ? '/staff.html' : '/customer.html';
export function icons() { window.lucide?.createIcons(); }
let toastTimer;
export function toast(message, error = false) {
  const element = $('#toast'); element.textContent = message; element.className = 'show' + (error ? ' error' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.className = '', 6500);
}
export async function api(path, { method = 'GET', body, redirectOn401 = true } = {}) {
  let response;
  try { response = await fetch('/api' + path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error('SmartDine could not connect to the server.'); }
  const result = await response.json().catch(() => ({ error: 'The server returned an unexpected response.' }));
  if (!response.ok) {
    if (response.status === 401 && document.body.dataset.protected && redirectOn401) location.assign('/login.html?reason=expired');
    const details = result.errors?.map(e => e.message || e.msg).filter(m => m !== 'Invalid value').join(' ');
    const error = new Error(details || result.error || 'Please check the supplied values.'); error.status = response.status; error.code = result.code; error.fields = result.errors || []; throw error;
  }
  return result;
}
export function updateCartCount(cart) {
  const count = $('#cart-count');
  if (count) { count.textContent = cart.item_count; count.hidden = !cart.item_count; }
  $('#cart-link')?.setAttribute('aria-label', 'Cart, ' + cart.item_count + ' item' + (cart.item_count === 1 ? '' : 's'));
}
export function header(user = null) {
  const path = location.pathname;
  const links = user ? (user.role === 'customer' ? [['Discover', '/customer.html'], ['Orders', '/orders.html'], ['Account', '/account.html']] : user.role === 'owner' ? [['Analytics', '/owner.html'], ['Menu', '/staff.html'], ['Orders', '/staff-orders.html'], ['Account', '/account.html']] : [['Menu', '/staff.html'], ['Orders', '/staff-orders.html'], ['Account', '/account.html']]) : [['Home', '/'], ['Log in', '/login.html']];
  $('#site-header').innerHTML = '<nav class="topnav wrap" aria-label="Main"><a class="brand" href="' + (user ? homeFor(user.role) : '/') + '"><span class="brand-mark"><i data-lucide="utensils-crossed"></i></span>SmartDine</a><div class="nav-links">' + links.map(([label, href]) => '<a href="' + href + '"' + (path === href ? ' aria-current="page"' : '') + '>' + label + '</a>').join('') + (user ? '<button id="logout" class="icon-button" title="Log out" aria-label="Log out"><i data-lucide="log-out"></i></button>' : '<a class="button" href="/register.html">Register</a>') + '</div></nav>';
  $('#logout')?.addEventListener('click', async () => {
    try {
      if (user.role === 'customer' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager?.getSubscription();
          if (subscription) { await api('/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } }); await subscription.unsubscribe(); }
        } catch { /* Optional push cleanup must not block session revocation. */ }
      }
      await api('/auth/logout', { method: 'POST', body: {} }); location.assign('/login.html');
    } catch (error) { toast(error.message, true); }
  });
  if (user?.role === 'customer') {
    $('#logout').insertAdjacentHTML('beforebegin', '<a id="cart-link" class="cart-link icon-button" href="/cart.html" title="Cart" aria-label="Cart"><i data-lucide="shopping-bag"></i><span id="cart-count" hidden></span></a>');
    api('/cart').then(updateCartCount).catch(error => toast(error.message, true));
  }
  icons();
}
export async function guard(roles) {
  try {
    const user = await api('/auth/me', { redirectOn401: false }); header(user);
    if (roles && !roles.includes(user.role)) {
      $('#main').innerHTML = '<div class="access-denied"><i data-lucide="shield-x"></i><h1>Access denied</h1><p>You do not have permission to access this page.</p><a class="button" href="' + homeFor(user.role) + '">Return to your dashboard</a></div>';
      $('#main').hidden = false; icons(); return null;
    }
    document.body.dataset.protected = 'true'; $('#main').hidden = false; return user;
  } catch (error) {
    if (error.status === 401) location.assign('/login.html?reason=expired');
    else { header(); $('#main').hidden = false; $('#main').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; }
    return null;
  }
}
export async function busy(button, action) {
  if (button.disabled) return;
  button.disabled = true; button.setAttribute('aria-busy', 'true');
  try { return await action(); } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
