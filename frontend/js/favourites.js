import { api, busy, icons, toast } from './common.js';
let saved = new Set();
let enabled = false;
export async function loadFavourites(user) {
  enabled = user?.role === 'customer';
  if (!enabled) return [];
  const rows = await api('/favourites'); saved = new Set(rows.map(r => r.restaurant_id)); return rows;
}
export function favouriteButton(id) {
  if (!enabled) return '';
  const active = saved.has(Number(id));
  return `<button class="favourite-button${active ? ' selected' : ''}" data-favourite="${Number(id)}" aria-pressed="${active}" title="${active ? 'Remove from favourites' : 'Save to favourites'}"><i data-lucide="heart"></i><span>${active ? 'Saved' : 'Save'}</span></button>`;
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-favourite]'); if (!button) return;
  busy(button, async () => {
    const id = Number(button.dataset.favourite), active = saved.has(id);
    await api('/favourites/' + id, { method: active ? 'DELETE' : 'PUT', body: {} });
    if (active) saved.delete(id); else saved.add(id);
    document.querySelectorAll('[data-favourite="' + id + '"]').forEach(b => {
      b.classList.toggle('selected', !active); b.setAttribute('aria-pressed', String(!active)); b.title = active ? 'Save to favourites' : 'Remove from favourites'; b.querySelector('span').textContent = active ? 'Save' : 'Saved';
    });
    icons(); toast(active ? 'Removed from favourites.' : 'Saved to favourites.');
    document.dispatchEvent(new CustomEvent('favourites-changed', { detail: { id, saved: !active } }));
  });
});
