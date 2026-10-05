import { $, api, header, homeFor } from './common.js';
header();
const registering = location.pathname.includes('register');
if (new URLSearchParams(location.search).get('reason') === 'expired') { $('#form-message').textContent = 'Please log in to continue. Your previous session may have expired.'; $('#form-message').hidden = false; }
$('#show-password').addEventListener('click', () => {
  const show = $('#password').type === 'password'; $('#password').type = show ? 'text' : 'password';
  $('#show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); $('#show-password').title = show ? 'Hide password' : 'Show password';
});
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true; button.setAttribute('aria-busy', 'true'); $('#form-message').hidden = true;
  try {
    const body = { email: $('#email').value.trim(), password: $('#password').value };
    if (registering) {
      if (body.password !== $('#confirm-password').value) throw new Error('Passwords do not match.');
      if (new TextEncoder().encode(body.password).length > 72) throw new Error('Password must be no more than 72 bytes.');
      body.username = $('#username').value.trim(); body.privacy_accepted = $('#privacy-accepted').checked;
    }
    const user = await api('/auth/' + (registering ? 'register' : 'login'), { method: 'POST', body, redirectOn401: false });
    location.assign(homeFor(user.role));
  } catch (error) { $('#form-message').textContent = error.message; $('#form-message').hidden = false; }
  finally { button.disabled = false; button.removeAttribute('aria-busy'); }
});

