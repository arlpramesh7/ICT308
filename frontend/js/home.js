import { $, api, header, icons } from './common.js';
import { restaurantCard } from './catalog.js';
let user;
try { user = await api('/auth/me', { redirectOn401: false }); } catch { /* Public browsing remains available without a session. */ }
header(user);
if ($('#venue-preview')) {
  try {
    const venues = await api('/restaurants');
    const render = () => {
      const query = $('#home-search').value.trim().toLowerCase();
      $('#venue-preview').innerHTML = venues.filter(v => (v.name + ' ' + v.cuisine_type).toLowerCase().includes(query)).map(v => restaurantCard(v)).join('') || '<p class="empty">No restaurants match your search.</p>'; icons();
    };
    $('#home-search').addEventListener('input', render); render();
  } catch (error) { $('#venue-preview').textContent = error.message; }
}
