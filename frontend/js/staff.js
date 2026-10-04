import { $, api, guard, escape, money, time, toast, busy, icons } from './common.js';
let venueId, state, deleteId;
function localDate(iso) { const date = new Date(iso); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
function edit(item = null) {
  $('#menu-form').reset(); $('#item-id').value = item?.item_id || '';
  $('#menu-dialog-title').textContent = item ? 'Edit menu item' : 'Add menu item';
  $('#item-name').value = item?.item_name || ''; $('#item-description').value = item?.description || '';
  $('#item-category').value = item?.category || 'Main'; $('#item-price').value = item?.price ?? '';
  $('#item-vegetarian').checked = Boolean(item?.vegetarian); $('#item-vegan').checked = Boolean(item?.vegan); $('#item-available').checked = item ? Boolean(item.is_available) : true;
  $('#menu-dialog').showModal();
}
async function load() {
  state = await api('/restaurants/' + venueId + '/manage');
  $('#venue-name').textContent = state.restaurant.name;
  $('#menu-summary').textContent = state.menu.length + ' items · ' + state.menu.filter(i => i.is_available).length + ' available';
  $('#menu-body').innerHTML = state.menu.length ? state.menu.map(i => '<tr><td><strong>' + escape(i.item_name) + '</strong><small>' + escape(i.description) + '</small></td><td>' + escape(i.category) + '</td><td>' + money(i.price) + '</td><td>' + (i.vegan ? 'Vegan' : i.vegetarian ? 'Vegetarian' : '—') + '</td><td><label class="availability"><input type="checkbox" data-available="' + i.item_id + '" aria-label="Availability for ' + escape(i.item_name) + '"' + (i.is_available ? ' checked' : '') + '><span>' + (i.is_available ? 'Available' : 'Disabled') + '</span></label></td><td><button class="icon-button" data-edit="' + i.item_id + '" title="Edit ' + escape(i.item_name) + '" aria-label="Edit ' + escape(i.item_name) + '"><i data-lucide="pencil"></i></button><button class="icon-button" data-delete="' + i.item_id + '" title="Delete ' + escape(i.item_name) + '" aria-label="Delete ' + escape(i.item_name) + '"><i data-lucide="trash-2"></i></button></td></tr>').join('') : '<tr><td colspan="6">No menu items yet.</td></tr>';
  const r = state.restaurant;
  $('#promotion-text').value = r.promotion_text || ''; $('#promotion-active').checked = Boolean(r.promotion_active);
  $('#promotion-start').value = localDate(r.promotion_start || new Date());
  $('#promotion-end').value = localDate(r.promotion_end || new Date(Date.now() + 86400000));
  $('#promotion-status').textContent = !r.promotion_active ? 'Disabled' : r.promotion_start && Date.parse(r.promotion_start) > Date.now() ? 'Scheduled' : r.promotion_end && Date.parse(r.promotion_end) <= Date.now() ? 'Expired' : 'Active';
  $('#audit-log').innerHTML = state.audit.length ? state.audit.map(a => '<p>' + escape(a.action.replace('.', ' ')) + (a.target_id ? ' · Item ' + a.target_id : '') + ' · ' + time(a.occurred_at) + '</p>').join('') : '<p>No recorded changes yet.</p>'; icons();
}
const user = await guard(['staff', 'owner']);
if (user) {
  try {
    const venues = await api('/restaurants/managed');
    $('#managed-venue').innerHTML = venues.map(v => '<option value="' + v.restaurant_id + '">' + escape(v.name) + '</option>').join('');
    if (!venues.length) throw new Error('No restaurant is assigned to your account. Contact the project administrator.');
    venueId = venues[0].restaurant_id; await load();
  } catch (error) { toast(error.message, true); $('#menu-summary').textContent = error.message; $('#add-item').disabled = true; }
  $('#managed-venue').addEventListener('change', async () => { venueId = Number($('#managed-venue').value); try { await load(); } catch (error) { toast(error.message, true); } });
  for (const name of ['menu', 'promotion']) {
    $('#' + name + '-tab').addEventListener('click', () => {
      for (const tab of ['menu', 'promotion']) { $('#' + tab + '-tab').setAttribute('aria-selected', String(tab === name)); $('#' + tab + '-panel').hidden = tab !== name; }
    });
    $('#' + name + '-tab').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const target = $('#' + (name === 'menu' ? 'promotion' : 'menu') + '-tab'); target.click(); target.focus(); } });
  }
  $('#add-item').addEventListener('click', () => edit());
  $('#item-vegan').addEventListener('change', () => { if ($('#item-vegan').checked) $('#item-vegetarian').checked = true; });
  $('#item-vegetarian').addEventListener('change', () => { if (!$('#item-vegetarian').checked) $('#item-vegan').checked = false; });
  $('#menu-body').addEventListener('click', event => {
    const editButton = event.target.closest('[data-edit]'), deleteButton = event.target.closest('[data-delete]');
    if (editButton) edit(state.menu.find(i => i.item_id === Number(editButton.dataset.edit)));
    if (deleteButton) { deleteId = Number(deleteButton.dataset.delete); $('#delete-name').textContent = state.menu.find(i => i.item_id === deleteId).item_name; $('#delete-dialog').showModal(); }
  });
  $('#menu-body').addEventListener('change', async event => {
    const input = event.target.closest('[data-available]'); if (!input) return; input.disabled = true;
    try { await api('/restaurants/' + venueId + '/menu/' + input.dataset.available, { method: 'PATCH', body: { is_available: input.checked } }); await load(); toast('Availability updated.'); }
    catch (error) { input.checked = !input.checked; input.disabled = false; toast(error.message, true); }
  });
  $('#menu-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      const id = $('#item-id').value;
      await api('/restaurants/' + venueId + '/menu' + (id ? '/' + id : ''), { method: id ? 'PATCH' : 'POST', body: { item_name: $('#item-name').value.trim(), description: $('#item-description').value.trim(), category: $('#item-category').value, price: Number($('#item-price').value), vegetarian: $('#item-vegetarian').checked, vegan: $('#item-vegan').checked, is_available: $('#item-available').checked } });
      $('#menu-dialog').close(); await load(); toast(id ? 'Menu item updated.' : 'Menu item added.');
    });
  });
  $('#confirm-delete').addEventListener('click', () => busy($('#confirm-delete'), async () => {
    await api('/restaurants/' + venueId + '/menu/' + deleteId, { method: 'DELETE', body: {} }); $('#delete-dialog').close(); await load(); toast('Menu item deleted.');
  }));
  $('#promotion-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      await api('/restaurants/' + venueId + '/promotion', { method: 'PATCH', body: { promotion_text: $('#promotion-text').value.trim(), promotion_active: $('#promotion-active').checked, promotion_start: $('#promotion-start').value ? new Date($('#promotion-start').value).toISOString() : null, promotion_end: $('#promotion-end').value ? new Date($('#promotion-end').value).toISOString() : null } });
      await load(); toast('Promotion saved.');
    });
  });
}

