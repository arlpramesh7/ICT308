import { $, api, guard, escape, money, time, toast, busy, icons } from './common.js';
let coordinates = null;
let results = [];
const presets = {
  townhall: { latitude: -33.8731, longitude: 151.2065, label: 'Demo · Town Hall (simulated)' },
  venue: { latitude: -33.8673, longitude: 151.2086, label: 'Demo · The Spice Tailor (simulated)' },
  quay: { latitude: -33.8610, longitude: 151.2110, label: 'Demo · Circular Quay (simulated)' },
  far: { latitude: -33.8150, longitude: 151.0010, label: 'Demo · Parramatta (simulated)' },
};
const weights = { proximity: 35, cuisine: 20, dietary: 15, price: 10, rating: 15, promotion: 5 };
const labels = { proximity: 'Proximity', cuisine: 'Cuisine', dietary: 'Dietary fit', price: 'Budget', rating: 'Rating', promotion: 'Promotion' };
async function notifications() {
  const rows = await api('/location/notifications');
  $('#notifications').innerHTML = rows.length ? rows.map(n => '<article class="notification ' + (n.is_read ? '' : 'unread') + '"><div><strong>' + escape(n.restaurant_name) + '</strong><p>' + escape(n.message) + '</p><small>' + time(n.sent_at) + ' · ' + (n.is_read ? 'Read' : 'Unread') + '</small></div>' + (!n.is_read ? '<button class="icon-button" data-read="' + n.notif_id + '" title="Mark as read" aria-label="Mark offer as read"><i data-lucide="check"></i></button>' : '') + '</article>').join('') : '<p class="empty">No offers yet.</p>'; icons();
}
async function discover() {
  if (!coordinates) { toast('Select a demo location or use your current location.'); return; }
  $('#results').innerHTML = '<p class="empty" role="status">Finding nearby restaurants...</p>';
  $('#exclusions').replaceChildren(); $('#result-count').textContent = '';
  try {
    const response = await api('/location/update', { method: 'POST', body: { latitude: coordinates.latitude, longitude: coordinates.longitude } });
    results = response.recommendations;
    $('#result-count').textContent = results.length + ' matches';
    $('#results').innerHTML = results.length ? results.map(r => '<article class="restaurant"><div class="restaurant-content"><div class="restaurant-head"><h3>' + escape(r.name) + '</h3><div class="score">' + r.recommendation_score + '<small>match / 100</small></div></div><p class="meta">' + escape(r.cuisine_type) + ' · ' + escape(r.price_range) + ' · ' + r.distance_metres + ' m · ~' + r.walk_minutes + ' min walk</p><div class="badges"><span class="badge ' + (r.within_geofence ? '' : 'neutral') + '">' + (r.within_geofence ? 'Inside geofence' : 'Outside geofence') + '</span>' + (r.vegan_friendly ? '<span class="badge">Vegan options</span>' : r.vegetarian_friendly ? '<span class="badge">Vegetarian options</span>' : '') + '</div><p class="small"><i data-lucide="star"></i> ' + (r.average_rating ?? 'No ratings yet') + '</p>' + (r.promotion ? '<p class="offer"><i data-lucide="tag"></i> ' + escape(r.promotion) + '</p>' : '') + '<details><summary>Why this recommendation?</summary>' + Object.entries(r.score_breakdown).map(([key, value]) => '<div class="score-row"><span>' + labels[key] + '</span><meter min="0" max="' + weights[key] + '" value="' + value + '">' + value + '</meter><span>' + value + ' / ' + weights[key] + '</span></div>').join('') + '<p class="small muted">Rounded contributions; total is rounded separately. Offers add up to 5 points.</p></details><div class="restaurant-actions"><button class="button secondary" data-menu="' + r.restaurant_id + '">View menu</button><a class="button secondary" href="' + escape(r.directions.maps_url) + '" target="_blank" rel="noopener noreferrer" data-directions="' + r.restaurant_id + '"><i data-lucide="navigation"></i> Directions</a><button class="text-link icon-button-rate" data-rate="' + r.restaurant_id + '"><i data-lucide="star"></i> Rate visit</button><button class="text-link icon-button-rate" data-interest="' + r.restaurant_id + '"><i data-lucide="heart"></i> Interested</button></div></div></article>').join('') : '<p class="empty">No matching restaurants were found within your selected radius.</p>';
    const exclusions = response.excluded_for_dietary_requirements;
    $('#exclusions').innerHTML = exclusions.length ? '<p><strong>' + exclusions.length + ' venues excluded by your dietary requirement</strong></p><p>' + exclusions.map(r => escape(r.name)).join(', ') + '</p>' : '';
    icons(); await notifications();
  } catch (error) { $('#results').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; throw error; }
}
async function markViewed(id) { await api('/location/recommendations/' + id + '/viewed', { method: 'POST', body: {} }); }
const user = await guard(['customer']);
if (user) {
  $('#greeting').textContent = 'Hello, ' + user.username;
  try {
    const pref = await api('/preferences');
    if (pref) { $('#cuisine').value = pref.cuisine_type || ''; $('#dietary').value = pref.dietary_req || ''; $('#price').value = pref.price_range || ''; $('#radius').value = pref.radius_km; $('#preference-status').textContent = 'Your saved preferences'; }
    await notifications();
  } catch (error) { toast(error.message, true); }
  $('#preferences-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      await api('/preferences', { method: 'PUT', body: { cuisine_type: $('#cuisine').value || null, dietary_req: $('#dietary').value || null, price_range: $('#price').value || null, radius_km: Number($('#radius').value) } });
      $('#preference-status').textContent = 'Preferences saved'; toast('Preferences saved.'); if (coordinates) await discover();
    });
  });
  $('#demo-location').addEventListener('change', async () => {
    coordinates = presets[$('#demo-location').value] || null;
    $('#location-status').textContent = coordinates ? coordinates.label : 'No location selected.';
    if (coordinates) try { await discover(); } catch (error) { toast(error.message, true); }
  });
  $('#gps').addEventListener('click', () => busy($('#gps'), async () => {
    if (!navigator.geolocation) throw new Error('Geolocation is unavailable. Please use a demo location.');
    let position;
    try { position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })); }
    catch (error) { throw new Error(error.code === 1 ? 'Location permission was denied. You can use a demo location instead.' : 'Your location could not be found. Please use a demo location.'); }
    coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    $('#demo-location').value = ''; $('#location-status').textContent = 'Browser location · accuracy approximately ' + Math.round(position.coords.accuracy) + ' m';
    await discover();
  }));
  $('#refresh').addEventListener('click', () => busy($('#refresh'), discover));
  $('#refresh-notifications').addEventListener('click', () => busy($('#refresh-notifications'), notifications));
  $('#notifications').addEventListener('click', event => {
    const button = event.target.closest('[data-read]'); if (!button) return;
    busy(button, async () => { await api('/location/notifications/' + button.dataset.read + '/read', { method: 'PATCH', body: {} }); await notifications(); });
  });
  $('#results').addEventListener('click', event => {
    const button = event.target.closest('[data-menu],[data-rate],[data-interest],[data-directions]'); if (!button) return;
    if (button.dataset.directions) { markViewed(button.dataset.directions).catch(error => toast(error.message, true)); return; }
    busy(button, async () => {
      const id = Number(button.dataset.menu || button.dataset.rate || button.dataset.interest);
      const restaurant = results.find(r => r.restaurant_id === id);
      if (button.dataset.rate) {
        $('#rating-restaurant').value = id; $('#rating-title').textContent = 'Rate ' + restaurant.name; $('#rating-form').reset(); $('#rating-restaurant').value = id; $('#rating-dialog').showModal(); return;
      }
      await markViewed(id);
      if (button.dataset.interest) { toast('Interest recorded for ' + restaurant.name + '.'); return; }
      const [menu, feedback] = await Promise.all([api('/restaurants/' + id + '/menu'), api('/feedback/' + id)]);
      $('#restaurant-title').textContent = restaurant.name;
      $('#restaurant-content').innerHTML = (id === 1 ? '<img class="restaurant-photo" src="/assets/indian-meal.png" alt="Illustrative vegetarian Indian meal"><p class="small muted">Illustrative demonstration meal</p>' : '') + '<p>' + escape(restaurant.directions.address) + '</p><h3>Menu</h3>' + (menu.length ? menu.map(item => '<div class="menu-line"><div><strong>' + escape(item.item_name) + '</strong><p class="small muted">' + escape(item.description || item.category) + (item.vegan ? ' · Vegan' : item.vegetarian ? ' · Vegetarian' : '') + '</p></div><span>' + money(item.price) + '</span></div>').join('') : '<p>No menu items are currently available.</p>') + '<h3 class="review-title">Recent ratings</h3>' + (feedback.reviews.length ? feedback.reviews.map(r => '<div class="feedback-row"><strong>' + r.rating + ' / 5</strong><p>' + escape(r.comment || 'No comment') + '</p><small class="muted">' + time(r.submitted_at) + '</small></div>').join('') : '<p class="muted">No ratings yet.</p>');
      $('#restaurant-dialog').showModal();
    });
  });
  $('#rating-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      await api('/feedback/' + $('#rating-restaurant').value, { method: 'POST', body: { rating: Number($('#rating').value), comment: $('#comment').value.trim() } });
      $('#rating-dialog').close(); toast('Your rating has been saved.'); await discover();
    });
  });
}

