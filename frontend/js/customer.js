import { $, api, guard, escape, time, toast, busy, icons } from './common.js';
import { restaurantCard } from './catalog.js';
import { loadFavourites } from './favourites.js';
let favouriteRows = [];
let coordinates = null;
let results = [];
const presets = {
  townhall: { latitude: -33.8731, longitude: 151.2065, label: 'Town Hall' },
  venue: { latitude: -33.8673, longitude: 151.2086, label: 'Spring Street' },
  quay: { latitude: -33.8610, longitude: 151.2110, label: 'Circular Quay' },
  far: { latitude: -33.8150, longitude: 151.0010, label: 'Parramatta' },
};
async function notifications() {
  const rows = await api('/location/notifications');
  $('#notifications').innerHTML = rows.length ? rows.map(n => '<article class="notification ' + (n.is_read ? '' : 'unread') + '"><div><strong>' + escape(n.restaurant_name) + '</strong><p>' + escape(n.message) + '</p><small>' + time(n.sent_at) + ' &middot; ' + (n.is_read ? 'Read' : 'Unread') + '</small></div>' + (!n.is_read ? '<button class="icon-button" data-read="' + n.notif_id + '" title="Mark as read" aria-label="Mark offer as read"><i data-lucide="check"></i></button>' : '') + '</article>').join('') : '<p class="empty">No offers yet.</p>'; icons();
}
function render() {
  const query = $('#restaurant-search').value.trim().toLowerCase();
  const savedOnly = $('#saved-only').checked;
  const filtered = (savedOnly ? favouriteRows : results).filter(r => (r.name + ' ' + r.cuisine_type).toLowerCase().includes(query));
  $('#result-count').textContent = filtered.length + ' restaurants';
  $('#results').innerHTML = filtered.length ? filtered.map(r => restaurantCard(r, { recommendation: !savedOnly })).join('') : '<p class="empty">' + (savedOnly ? 'No saved restaurants match your search.' : 'No restaurants match your search and preferences. Try a wider radius or another area.') + '</p>';
  icons();
}
async function discover() {
  if (!coordinates) { toast('Choose an area or use your current location.'); return; }
  $('#results').innerHTML = '<p class="empty" role="status">Finding nearby restaurants...</p>';
  try {
    favouriteRows = await loadFavourites(user);
    const response = await api('/location/update', { method: 'POST', body: { latitude: coordinates.latitude, longitude: coordinates.longitude } });
    results = response.recommendations; render();
    const excluded = response.excluded_for_dietary_requirements;
    $('#exclusions').innerHTML = excluded.length ? '<p><strong>' + excluded.length + ' venues excluded by your dietary requirement</strong></p><p>' + excluded.map(r => escape(r.name)).join(', ') + '</p>' : '';
    await notifications();
  } catch (error) { $('#results').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; throw error; }
}
const user = await guard(['customer']);
if (user) {
  $('#greeting').textContent = 'Good food, ' + user.username.split(' ')[0] + '.';
  try {
    const pref = await api('/preferences');
    if (pref) { $('#cuisine').value = pref.cuisine_type || ''; $('#dietary').value = pref.dietary_req || ''; $('#price').value = pref.price_range || ''; $('#radius').value = pref.radius_km; $('#preference-status').textContent = 'Your saved preferences'; }
    $('#demo-location').value = 'townhall'; coordinates = presets.townhall;
    $('#location-status').textContent = 'Searching near Town Hall'; await discover();
  } catch (error) { toast(error.message, true); }
  $('#restaurant-search').addEventListener('input', render);
  $('#saved-only').addEventListener('change', render);
  document.addEventListener('favourites-changed', async () => { try { favouriteRows = await loadFavourites(user); if ($('#saved-only').checked) render(); } catch (error) { toast(error.message, true); } });
  $('#preferences-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      await api('/preferences', { method: 'PUT', body: { cuisine_type: $('#cuisine').value || null, dietary_req: $('#dietary').value || null, price_range: $('#price').value || null, radius_km: Number($('#radius').value) } });
      $('#preference-status').textContent = 'Preferences saved'; toast('Preferences saved.'); await discover();
    });
  });
  $('#demo-location').addEventListener('change', async () => {
    coordinates = presets[$('#demo-location').value] || null;
    $('#location-status').textContent = coordinates ? 'Searching near ' + coordinates.label : 'No area selected.';
    if (coordinates) try { await discover(); } catch (error) { toast(error.message, true); }
  });
  $('#gps').addEventListener('click', () => busy($('#gps'), async () => {
    if (!navigator.geolocation) throw new Error('Geolocation is unavailable. Please choose an area.');
    let position;
    try { position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })); }
    catch (error) { throw new Error(error.code === 1 ? 'Location permission was denied. You can choose an area instead.' : 'Your location could not be found. Please choose an area.'); }
    coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    $('#demo-location').value = ''; $('#location-status').textContent = 'Your location, accurate to approximately ' + Math.round(position.coords.accuracy) + ' m';
    await discover();
  }));
  $('#refresh').addEventListener('click', () => busy($('#refresh'), discover));
  $('#refresh-notifications').addEventListener('click', () => busy($('#refresh-notifications'), notifications));
  $('#notifications').addEventListener('click', event => {
    const button = event.target.closest('[data-read]'); if (!button) return;
    busy(button, async () => { await api('/location/notifications/' + button.dataset.read + '/read', { method: 'PATCH', body: {} }); await notifications(); });
  });
}
