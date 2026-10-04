import { $, api, header, escape, icons } from './common.js';
header();
if ($('#venue-preview')) {
  try {
    const venues = await api('/restaurants');
    $('#venue-preview').innerHTML = venues.map(v => '<article class="preview-item"><i data-lucide="utensils"></i><h3>' + escape(v.name) + '</h3><p class="muted">' + escape(v.cuisine_type) + ' · ' + escape(v.price_range) + '</p><p class="small">' + escape(v.address) + '</p><a href="/login.html">Find your match</a></article>').join(''); icons();
  } catch (error) { $('#venue-preview').textContent = error.message; }
}

