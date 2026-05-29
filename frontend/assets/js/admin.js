// Yönetim paneli sayfaları. Tümü admin yetkisi gerektirir.

import { api, isAdmin, isLoggedIn, imageUrl } from './api.js';
import {
  mountChrome, openModal, toast, confirmModal, esc, formatPrice, formatDate,
  skeletonCards, emptyState, STATUSES,
} from './ui.js';
import { fillProvinceSelect, fillDistrictSelect } from './tr-cities.js';
import { openBookForm, confirmDeleteBook } from './book-form.js';

document.addEventListener('DOMContentLoaded', () => {
  mountChrome();
  if (!isLoggedIn() || !isAdmin()) {
    document.querySelector('main').innerHTML = emptyState('Erişim reddedildi', 'Bu sayfa yalnızca yöneticiler içindir.', '<a class="btn btn-primary" href="/index.html">Anasayfa</a>', '🔒');
    return;
  }
  const page = document.body.dataset.page;
  ({
    'admin-dashboard': initDashboard,
    'admin-books': initBooks,
    'admin-categories': initCategories,
    'admin-orders': initOrders,
    'admin-users': initUsers,
  }[page] || (() => {}))();
});

/* ===================== DASHBOARD ===================== */
async function initDashboard() {
  const root = document.getElementById('dash-root');
  let s;
  try { s = await api('/stats'); } catch { root.innerHTML = emptyState('İstatistikler yüklenemedi'); return; }

  const cards = [
    ['Kitaplar', s.totals.books], ['Kullanıcılar', s.totals.users], ['Siparişler', s.totals.orders],
    ['Kategoriler', s.totals.categories], ['Yorumlar', s.totals.reviews],
  ];
  const maxStatus = Math.max(1, ...Object.values(s.by_status));
  root.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${formatPrice(s.revenue)}</div><div class="stat-label">Toplam Ciro</div></div>
      ${cards.map(([l, v]) => `<div class="stat-card"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>`).join('')}
    </div>
    <div class="dash-cols">
      <div class="panel">
        <h3 style="margin-top:0">Sipariş Durumları</h3>
        ${['pending', 'completed', 'cancelled'].map((k) => `
          <div class="bar-row">
            <span class="bar-label">${STATUSES[k]}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${((s.by_status[k] || 0) / maxStatus) * 100}%"></div></div>
            <span>${s.by_status[k] || 0}</span>
          </div>`).join('')}
      </div>
      <div class="panel">
        <h3 style="margin-top:0">En Çok Satanlar</h3>
        ${s.top_books.length ? s.top_books.map((b) => `<div class="bar-row"><span style="flex:1">${esc(b.title)}</span><span class="tag">${b.sold} satış</span></div>`).join('') : '<p class="muted">Veri yok.</p>'}
      </div>
    </div>
    <div class="dash-cols" style="margin-top:1.25rem">
      <div class="panel">
        <h3 style="margin-top:0">Düşük Stok</h3>
        ${s.low_stock.length ? s.low_stock.map((b) => `<div class="bar-row"><span style="flex:1">${esc(b.title)}</span><span class="tag" style="${b.stock == 0 ? 'background:var(--danger);color:#fff' : ''}">${b.stock} adet</span></div>`).join('') : '<p class="muted">Tüm kitaplar yeterli stokta.</p>'}
      </div>
      <div class="panel">
        <h3 style="margin-top:0">Son Siparişler</h3>
        ${s.recent.length ? s.recent.map((o) => `
          <div class="bar-row">
            <a href="/order.html?id=${o.id}" style="flex:1">#${o.id} · ${esc(o.user_name || '—')}</a>
            <span class="status-badge status-${o.status}">${STATUSES[o.status] || o.status}</span>
            <span class="price">${formatPrice(o.total_price)}</span>
          </div>`).join('') : '<p class="muted">Henüz sipariş yok.</p>'}
      </div>
    </div>`;
}

/* ===================== KİTAPLAR ===================== */
async function initBooks() {
  const root = document.getElementById('admin-books-root');
  const searchEl = document.getElementById('book-search');
  const catEl = document.getElementById('book-category');

  document.getElementById('add-book-btn')?.addEventListener('click', () => openBookForm(null, render));

  // Kategori filtresini doldur
  try {
    const cats = await api('/categories');
    if (catEl) {
      catEl.innerHTML = '<option value="">Tüm kategoriler</option>' +
        cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    }
  } catch {}

  async function render() {
    root.innerHTML = skeletonCards(4);
    const p = new URLSearchParams({ limit: 100 });
    if (searchEl?.value) p.set('search', searchEl.value.trim());
    if (catEl?.value) p.set('category_id', catEl.value);
    let res;
    try { res = await api('/books?' + p); } catch { root.innerHTML = emptyState('Kitaplar yüklenemedi'); return; }
    const books = res.data;
    if (!books.length) { root.innerHTML = emptyState('Kitap bulunamadı', 'Arama veya filtreyi değiştirmeyi deneyin.', '', '🔍'); return; }
    root.innerHTML = `
      <p class="muted small" style="margin:.25rem 0 .75rem">${res.total} kitap</p>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th></th><th>Başlık</th><th>Yazar</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>İşlem</th></tr></thead>
          <tbody>
            ${books.map((b) => `
              <tr>
                <td>${b.primary_image ? `<img class="line-thumb" style="width:36px;height:48px" src="${imageUrl(b.primary_image)}" alt="">` : '📖'}</td>
                <td>${esc(b.title)}</td>
                <td>${esc(b.author)}</td>
                <td>${esc(b.category_name || '—')}</td>
                <td>${formatPrice(b.price)}</td>
                <td>${b.stock}</td>
                <td><div class="row-actions">
                  <button class="btn btn-ghost btn-sm" data-edit="${b.id}">Düzenle</button>
                  <button class="btn btn-danger btn-sm" data-del="${b.id}">Sil</button>
                </div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    root.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openBookForm(books.find((x) => x.id == btn.dataset.edit), render)));
    root.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => confirmDeleteBook(books.find((x) => x.id == btn.dataset.del), render)));
  }

  let t;
  searchEl?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 350); });
  catEl?.addEventListener('change', render);
  render();
}

/* ===================== KATEGORİLER ===================== */
async function initCategories() {
  const root = document.getElementById('admin-cats-root');
  document.getElementById('add-cat-btn')?.addEventListener('click', () => catForm());

  async function render() {
    let cats;
    try { cats = await api('/categories'); } catch { root.innerHTML = emptyState('Yüklenemedi'); return; }
    root.innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Kategori</th><th>Kitap sayısı</th><th>İşlem</th></tr></thead>
        <tbody>${cats.map((c) => `
          <tr><td>${esc(c.name)}</td><td>${c.book_count}</td>
          <td><div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-edit="${c.id}" data-name="${esc(c.name)}">Düzenle</button>
            <button class="btn btn-danger btn-sm" data-del="${c.id}">Sil</button>
          </div></td></tr>`).join('')}</tbody>
      </table></div>`;
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => catForm({ id: b.dataset.edit, name: b.dataset.name })));
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmModal('Kategoriyi silmek istediğinize emin misiniz? Kitaplar kategorisiz kalır.', { danger: true, okText: 'Sil' }))) return;
      try { await api('/categories/' + b.dataset.del, { method: 'DELETE' }); toast('Kategori silindi.'); render(); }
      catch (e) { toast(e.message, 'error'); }
    }));
  }

  function catForm(cat = null) {
    const { el, close } = openModal(`
      <h2 style="margin-top:0">${cat ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h2>
      <form id="cf">
        <div class="field"><label>Ad</label><input name="name" value="${esc(cat?.name || '')}" required></div>
        <div class="field-error" id="cf-err"></div>
        <button class="btn btn-primary btn-block" type="submit">Kaydet</button>
      </form>`);
    el.querySelector('#cf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get('name').trim();
      try {
        if (cat) await api('/categories/' + cat.id, { method: 'PUT', body: { name } });
        else await api('/categories', { method: 'POST', body: { name } });
        toast('Kaydedildi.', 'success'); close(); render();
      } catch (err) { el.querySelector('#cf-err').textContent = err.message; }
    });
  }

  render();
}

/* ===================== SİPARİŞLER ===================== */
async function initOrders() {
  const root = document.getElementById('admin-orders-root');
  const searchEl = document.getElementById('order-search');
  const statusEl = document.getElementById('order-status');
  const sortEl = document.getElementById('order-sort');

  async function render() {
    root.innerHTML = skeletonCards(3);
    const p = new URLSearchParams({ limit: 50 });
    if (searchEl.value) p.set('search', searchEl.value.trim());
    if (statusEl.value) p.set('status', statusEl.value);
    if (sortEl.value) p.set('sort', sortEl.value);
    let res;
    try { res = await api('/orders?' + p); } catch { root.innerHTML = emptyState('Yüklenemedi'); return; }
    const orders = res.data || [];
    if (!orders.length) { root.innerHTML = emptyState('Sipariş bulunamadı'); return; }
    root.innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>#</th><th>Müşteri</th><th>Tarih</th><th>Tutar</th><th>Durum / İşlem</th></tr></thead>
        <tbody>${orders.map((o) => `
          <tr>
            <td><a href="/order.html?id=${o.id}">#${o.id}</a></td>
            <td>${esc(o.user_name || '—')}<br><span class="muted small">${esc(o.user_email || '')}</span></td>
            <td>${formatDate(o.created_at)}</td>
            <td class="price">${formatPrice(o.total_price)}</td>
            <td>
              <span class="status-badge status-${o.status}">${STATUSES[o.status] || o.status}</span>
              ${o.status === 'pending' ? `<div class="row-actions" style="margin-top:.5rem">
                <button class="btn btn-primary btn-sm" data-complete="${o.id}">Onayla ve Gönder</button>
                <button class="btn btn-danger btn-sm" data-cancel="${o.id}">İptal Et</button>
              </div>` : ''}
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`;

    root.querySelectorAll('[data-complete]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmModal(`#${b.dataset.complete} numaralı sipariş "Tamamlandı" olarak işaretlenip müşteriye gönderilecek. Onaylıyor musunuz?`, { okText: 'Onayla ve Gönder' }))) return;
      try { await api('/orders/' + b.dataset.complete, { method: 'PUT', body: { status: 'completed' } }); toast('Sipariş tamamlandı.', 'success'); render(); }
      catch (e) { toast(e.message, 'error'); }
    }));
    root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmModal(`#${b.dataset.cancel} numaralı sipariş iptal edilecek ve ürünler stoğa geri eklenecek. Emin misiniz?`, { okText: 'İptal Et', danger: true }))) return;
      try { await api('/orders/' + b.dataset.cancel, { method: 'PUT', body: { status: 'cancelled', cancellation_reason: 'Yönetici tarafından iptal edildi' } }); toast('Sipariş iptal edildi.'); render(); }
      catch (e) { toast(e.message, 'error'); }
    }));
  }

  let t;
  searchEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 350); });
  statusEl.addEventListener('change', render);
  sortEl.addEventListener('change', render);
  render();
}

/* ===================== KULLANICILAR ===================== */
async function initUsers() {
  const root = document.getElementById('admin-users-root');
  const searchEl = document.getElementById('user-search');
  const roleEl = document.getElementById('user-role');

  async function render() {
    root.innerHTML = skeletonCards(3);
    const p = new URLSearchParams();
    if (searchEl.value) p.set('search', searchEl.value.trim());
    if (roleEl.value) p.set('role', roleEl.value);
    let res;
    try { res = await api('/users?' + p); } catch { root.innerHTML = emptyState('Yüklenemedi'); return; }
    const users = res.data || [];
    if (!users.length) { root.innerHTML = emptyState('Kullanıcı bulunamadı'); return; }
    root.innerHTML = `
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Ad</th><th>E-posta</th><th>Telefon</th><th>Rol</th><th>Sipariş</th><th>Kayıt</th><th></th></tr></thead>
        <tbody>${users.map((u) => `
          <tr>
            <td>${esc(u.name)}</td>
            <td>${esc(u.email || '—')}</td>
            <td>${esc(u.phone_number || '—')}</td>
            <td><span class="tag">${u.role === 'admin' ? 'Yönetici' : 'Üye'}</span></td>
            <td>${u.order_count ?? 0}</td>
            <td>${formatDate(u.created_at)}</td>
            <td><div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-edit="${u.id}">Düzenle</button>
              <button class="btn btn-danger btn-sm" data-del="${u.id}">Sil</button>
            </div></td>
          </tr>`).join('')}</tbody>
      </table></div>`;
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => userForm(users.find((x) => x.id == b.dataset.edit))));
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmModal('Bu kullanıcıyı silmek istediğinize emin misiniz? Sipariş ve yorumları da silinir.', { danger: true, okText: 'Sil' }))) return;
      try { await api('/users/' + b.dataset.del, { method: 'DELETE' }); toast('Kullanıcı silindi.'); render(); }
      catch (e) { toast(e.message, 'error'); }
    }));
  }

  async function userForm(u) {
    // Tam bilgi (adres/il/ilçe) için tekil kullanıcıyı çek
    let full = u;
    try { full = await api('/users/' + u.id); } catch {}
    const { el, close } = openModal(`
      <h2 style="margin-top:0">Kullanıcıyı Düzenle</h2>
      <form id="uf">
        <div class="field"><label>Ad Soyad</label><input name="name" value="${esc(full.name || '')}" required></div>
        <div class="field" style="display:flex;gap:.75rem">
          <div style="flex:1"><label>Telefon</label><input name="phone_number" value="${esc(full.phone_number || '')}"></div>
          <div style="flex:1"><label>Rol</label><select name="role">
            <option value="user" ${full.role === 'user' ? 'selected' : ''}>Üye</option>
            <option value="admin" ${full.role === 'admin' ? 'selected' : ''}>Yönetici</option>
          </select></div>
        </div>
        <div class="field" style="display:flex;gap:.75rem">
          <div style="flex:1"><label>İl</label><select name="province" id="uf-prov"></select></div>
          <div style="flex:1"><label>İlçe</label><select name="district" id="uf-dist"></select></div>
        </div>
        <div class="field"><label>Açık Adres</label><textarea name="address">${esc(full.address || '')}</textarea></div>
        <div class="field"><label>Yeni şifre <span class="muted small">(boş bırakırsanız değişmez)</span></label><input type="password" name="password" autocomplete="new-password" placeholder="••••••"></div>
        <div class="field-error" id="uf-err"></div>
        <button class="btn btn-primary btn-block" type="submit">Kaydet</button>
      </form>`, { wide: true });
    const prov = el.querySelector('#uf-prov');
    const dist = el.querySelector('#uf-dist');
    fillProvinceSelect(prov, full.province || '');
    fillDistrictSelect(dist, full.province || '', full.district || '');
    prov.addEventListener('change', () => fillDistrictSelect(dist, prov.value));
    el.querySelector('#uf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (!data.password) delete data.password;

      // Yetki değiştiyse onay iste
      if (data.role !== full.role) {
        const yeni = data.role === 'admin' ? 'Yönetici' : 'Üye';
        const ok = await confirmModal(`"${full.name}" kullanıcısının yetkisi "${yeni}" olarak değiştirilecek. Onaylıyor musunuz?`, { okText: 'Onayla', danger: data.role === 'admin' });
        if (!ok) return;
      }
      try {
        await api('/users/' + u.id, { method: 'PUT', body: data });
        toast('Kullanıcı güncellendi.', 'success'); close(); render();
      } catch (err) { el.querySelector('#uf-err').textContent = err.message; }
    });
  }

  let t;
  searchEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 350); });
  roleEl.addEventListener('change', render);
  render();
}
