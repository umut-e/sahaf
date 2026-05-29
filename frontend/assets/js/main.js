// Mağaza sayfaları — sayfa yönlendirici. body[data-page] değerine göre ilgili
// init fonksiyonu çalışır.

import { api, currentUser, isLoggedIn, saveSession, imageUrl } from './api.js';
import * as store from './store.js';
import {
  mountChrome, openModal, toast, confirmModal, esc, formatPrice, formatDate, qs,
  starsHtml, skeletonCards, emptyState, lightbox, CONDITIONS, STATUSES, refreshNotifBadge,
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  mountChrome();
  if (isLoggedIn()) refreshNotifBadge();
  const page = document.body.dataset.page;
  ({
    home: initHome, book: initBook, cart: initCart, favorites: initFavorites,
    orders: initOrders, order: initOrderDetail, profile: initProfile,
    login: initLogin, register: initRegister,
  }[page] || (() => {}))();
});

/* ===================== kitap kartı ===================== */
function bookCard(b) {
  const out = Number(b.stock) <= 0;
  const fav = store.isFav(b.id);
  return `
    <article class="book-card" data-id="${b.id}">
      <div class="book-cover">
        ${b.primary_image
          ? `<img src="${imageUrl(b.primary_image)}" alt="${esc(b.title)}" loading="lazy">`
          : '<span class="placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.5rem">📖</span>'}
        <button class="fav-toggle ${fav ? 'on' : ''}" data-act="fav" aria-label="Favorilere ekle" title="Favorilere ekle">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        ${out ? '<span class="cover-badge out">Tükendi</span>'
              : (b.condition === 'new' ? '<span class="cover-badge">Sıfır</span>' : '')}
      </div>
      <div class="book-body">
        <h3 class="book-title">${esc(b.title)}</h3>
        <p class="book-author">${esc(b.author)}</p>
        <div class="book-meta">
          ${b.category_name ? `<span class="tag">${esc(b.category_name)}</span>` : ''}
          ${Number(b.review_count) > 0 ? starsHtml(b.avg_rating, b.review_count) : '<span class="muted small">Yorum yok</span>'}
        </div>
        <div class="book-foot">
          <span class="price">${formatPrice(b.price)}</span>
          <button class="btn btn-primary btn-sm" data-act="add" ${out ? 'disabled' : ''}>${out ? 'Tükendi' : 'Sepete'}</button>
        </div>
      </div>
    </article>`;
}

/** Bir grid içindeki kartlara olay bağlar (delegasyon). */
function wireGrid(grid, getBooks, { onFavRemoved } = {}) {
  grid.addEventListener('click', async (e) => {
    const card = e.target.closest('.book-card');
    if (!card) return;
    const book = getBooks().find((b) => Number(b.id) === Number(card.dataset.id));
    if (!book) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'fav') {
      e.stopPropagation();
      const now = await store.toggleFavorite(book);
      card.querySelector('.fav-toggle').classList.toggle('on', now);
      toast(now ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'success');
      if (!now && onFavRemoved) onFavRemoved(card);
    } else if (act === 'add') {
      e.stopPropagation();
      await store.addToCart(book);
      toast('Sepete eklendi.', 'success');
    } else {
      location.href = `/book.html?id=${book.id}`;
    }
  });
}

/* ===================== ANASAYFA ===================== */
async function initHome() {
  const grid = document.getElementById('books-grid');
  const searchEl = document.getElementById('search');
  const sortEl = document.getElementById('sort');
  const condEl = document.getElementById('condition');
  const chipsEl = document.getElementById('category-chips');
  const pager = document.getElementById('pagination');

  const state = {
    page: Number(qs('page')) || 1,
    search: qs('search') || '',
    category_id: qs('category_id') || '',
    sort: qs('sort') || 'newest',
    condition: qs('condition') || '',
  };
  searchEl.value = state.search;
  sortEl.value = state.sort;
  if (condEl) condEl.value = state.condition;

  let books = [];
  wireGrid(grid, () => books);

  // kategoriler
  try {
    const cats = await api('/categories');
    chipsEl.innerHTML =
      `<button class="chip ${!state.category_id ? 'active' : ''}" data-cat="">Tümü</button>` +
      cats.map((c) => `<button class="chip ${String(c.id) === String(state.category_id) ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)} <span class="muted">${c.book_count}</span></button>`).join('');
  } catch { chipsEl.innerHTML = ''; }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.search) p.set('search', state.search);
    if (state.category_id) p.set('category_id', state.category_id);
    if (state.sort !== 'newest') p.set('sort', state.sort);
    if (state.condition) p.set('condition', state.condition);
    if (state.page > 1) p.set('page', state.page);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  async function load() {
    grid.innerHTML = skeletonCards(8);
    pager.innerHTML = '';
    syncUrl();
    let res;
    try {
      res = await api(`/books?page=${state.page}&limit=12&search=${encodeURIComponent(state.search)}&category_id=${state.category_id}&sort=${state.sort}&condition=${state.condition}`);
    } catch {
      grid.innerHTML = emptyState('Kitaplar yüklenemedi', 'Lütfen daha sonra tekrar deneyin.', '', '⚠️');
      return;
    }
    if (!res.data.length) {
      grid.innerHTML = emptyState('Kitap bulunamadı', 'Arama veya filtreleri değiştirmeyi deneyin.', '', '🔍');
      return;
    }
    books = res.data;
    grid.innerHTML = books.map(bookCard).join('');
    renderPager(pager, res.page, res.pages, (p) => { state.page = p; load(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  let t;
  searchEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.search = searchEl.value.trim(); state.page = 1; load(); }, 350); });
  sortEl.addEventListener('change', () => { state.sort = sortEl.value; state.page = 1; load(); });
  condEl?.addEventListener('change', () => { state.condition = condEl.value; state.page = 1; load(); });
  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.category_id = chip.dataset.cat; state.page = 1; load();
  });

  load();
}

function renderPager(el, page, pages, onGo) {
  if (pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button class="btn btn-ghost btn-sm" ${page <= 1 ? 'disabled' : ''} data-go="${page - 1}">← Önceki</button>
    <span>${page} / ${pages}</span>
    <button class="btn btn-ghost btn-sm" ${page >= pages ? 'disabled' : ''} data-go="${page + 1}">Sonraki →</button>`;
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) onGo(Number(b.dataset.go)); }));
}

/* ===================== KİTAP DETAY ===================== */
async function initBook() {
  const id = qs('id');
  const root = document.getElementById('book-detail');
  if (!id) { root.innerHTML = emptyState('Kitap bulunamadı'); return; }
  let book;
  try { book = await api('/books/' + id); }
  catch { root.innerHTML = emptyState('Kitap bulunamadı', '', '<a class="btn btn-primary" href="/index.html">Kitaplara dön</a>'); return; }

  const images = (book.images || []).map(imageUrl);
  const out = Number(book.stock) <= 0;
  root.innerHTML = `
    <div class="book-detail">
      <div class="gallery">
        <div class="gallery-main" id="gmain" data-i="0">
          ${images.length ? `<img src="${images[0]}" alt="${esc(book.title)}">` : '<div class="book-cover placeholder" style="height:100%">📖</div>'}
        </div>
        ${images.length > 1 ? `<div class="gallery-thumbs">${images.map((src, i) => `<img src="${src}" class="${i === 0 ? 'active' : ''}" data-i="${i}" alt="">`).join('')}</div>` : ''}
      </div>
      <div class="detail-info">
        <h1>${esc(book.title)}</h1>
        <p class="detail-author">${esc(book.author)}</p>
        <div class="book-meta">
          ${book.category_name ? `<span class="tag">${esc(book.category_name)}</span>` : ''}
          ${Number(book.review_count) > 0 ? starsHtml(book.avg_rating, book.review_count) : '<span class="muted small">Henüz puan yok</span>'}
        </div>
        <div class="spec-list">
          <div><span class="spec-label">Durum</span>${CONDITIONS[book.condition] || book.condition}</div>
          <div><span class="spec-label">Stok</span>${out ? '<span style="color:var(--danger)">Tükendi</span>' : esc(book.stock) + ' adet'}</div>
        </div>
        <div class="detail-price">${formatPrice(book.price)}</div>
        ${book.description ? `<p class="detail-desc">${esc(book.description)}</p>` : ''}
        <div class="detail-actions">
          <button class="btn btn-primary" id="add-cart" ${out ? 'disabled' : ''}>${out ? 'Tükendi' : 'Sepete Ekle'}</button>
          <button class="btn btn-ghost" id="fav-btn">${store.isFav(book.id) ? '♥ Favoride' : '♡ Favorile'}</button>
        </div>
      </div>
    </div>
    <section class="reviews-section">
      <h2>Değerlendirmeler</h2>
      <div id="review-form-host"></div>
      <div id="reviews-list"></div>
    </section>`;

  if (images.length) {
    const main = document.getElementById('gmain');
    main.addEventListener('click', () => lightbox(images, Number(main.dataset.i || 0)));
    root.querySelectorAll('.gallery-thumbs img').forEach((th) => th.addEventListener('click', () => {
      const i = Number(th.dataset.i);
      main.innerHTML = `<img src="${images[i]}" alt="">`; main.dataset.i = i;
      root.querySelectorAll('.gallery-thumbs img').forEach((x) => x.classList.toggle('active', x === th));
    }));
  }
  document.getElementById('add-cart')?.addEventListener('click', async () => { await store.addToCart(book); toast('Sepete eklendi.', 'success'); });
  document.getElementById('fav-btn')?.addEventListener('click', async (e) => {
    const now = await store.toggleFavorite(book);
    e.target.textContent = now ? '♥ Favoride' : '♡ Favorile';
    toast(now ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'success');
  });

  loadReviews(id, book);
}

async function loadReviews(bookId, book) {
  const list = document.getElementById('reviews-list');
  const formHost = document.getElementById('review-form-host');
  let reviews = [];
  try { reviews = await api(`/books/${bookId}/reviews`); } catch {}

  if (book.can_review) {
    formHost.innerHTML = `
      <form class="review-form" id="review-form">
        <h3 style="margin-top:0">Bu kitabı değerlendir</h3>
        <div class="star-input">
          ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="st${n}" value="${n}"><label for="st${n}" title="${n} yıldız">★</label>`).join('')}
        </div>
        <div class="field"><textarea name="comment" placeholder="Düşünceleriniz..."></textarea></div>
        <label style="display:flex;gap:.5rem;align-items:center;font-weight:400"><input type="checkbox" name="anon" style="width:auto"> Anonim olarak paylaş</label>
        <div class="field-error" id="rev-err"></div>
        <button class="btn btn-primary" type="submit" style="margin-top:.75rem">Gönder</button>
      </form>`;
    document.getElementById('review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const rating = Number(fd.get('rating'));
      if (!rating) { document.getElementById('rev-err').textContent = 'Lütfen puan seçin.'; return; }
      try {
        await api(`/books/${bookId}/reviews`, { method: 'POST', body: { rating, comment: fd.get('comment'), is_anonymous: fd.get('anon') ? 1 : 0 } });
        toast('Yorumunuz kaydedildi.', 'success');
        setTimeout(() => location.reload(), 600);
      } catch (err) { document.getElementById('rev-err').textContent = err.message; }
    });
  } else if (!isLoggedIn()) {
    formHost.innerHTML = '<p class="muted">Değerlendirme yapmak için <a href="/login.html">giriş yapın</a>. (Yalnızca satın aldığınız kitapları değerlendirebilirsiniz.)</p>';
  }

  if (!reviews.length) { list.innerHTML = '<p class="muted">Henüz değerlendirme yok. İlk yorumu siz yapın!</p>'; return; }
  list.innerHTML = reviews.map((r) => `
    <div class="review-item">
      <div class="review-head">
        <div><span class="review-author">${esc(r.user_name)}</span> ${starsHtml(r.rating)}</div>
        <span class="muted small">${formatDate(r.created_at)}</span>
      </div>
      ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}
      <button class="review-like ${r.liked_by_me ? 'on' : ''}" data-rid="${r.id}">♥ <span>${r.like_count}</span></button>
    </div>`).join('');

  list.querySelectorAll('.review-like').forEach((btn) => btn.addEventListener('click', async () => {
    if (!isLoggedIn()) return toast('Beğenmek için giriş yapın.', 'error');
    const on = btn.classList.contains('on');
    try {
      const res = await api(`/reviews/${btn.dataset.rid}/like`, { method: on ? 'DELETE' : 'POST' });
      btn.classList.toggle('on', !on);
      btn.querySelector('span').textContent = res.like_count;
    } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ===================== SEPET ===================== */
async function initCart() {
  const root = document.getElementById('cart-root');
  async function render() {
    let items;
    try { items = await store.getCart(); } catch { items = []; }
    if (!items.length) {
      root.innerHTML = emptyState('Sepetiniz boş', 'Beğendiğiniz kitapları sepete ekleyin.', '<a class="btn btn-primary" href="/index.html">Kitaplara göz at</a>', '🛒');
      return;
    }
    const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    root.innerHTML = `
      <div class="cart-layout">
        <div id="cart-items">
          ${items.map((i) => `
            <div class="line-item" data-book="${i.book_id}">
              ${i.primary_image ? `<img src="${imageUrl(i.primary_image)}" alt="">` : '<div class="line-thumb"></div>'}
              <div class="line-info">
                <h4>${esc(i.title)}</h4>
                <p class="muted small">${esc(i.author || '')}</p>
                <span class="price">${formatPrice(i.price)}</span>
              </div>
              <div class="qty-control">
                <button data-act="dec" aria-label="Azalt">−</button><span>${i.quantity}</span><button data-act="inc" aria-label="Artır">+</button>
              </div>
              <button class="icon-btn" data-act="del" title="Kaldır" aria-label="Kaldır">🗑️</button>
            </div>`).join('')}
        </div>
        <aside class="cart-summary">
          <h3 style="margin-top:0">Özet</h3>
          <div class="summary-row"><span>Ara toplam</span><span>${formatPrice(total)}</span></div>
          <div class="summary-row muted"><span>Kargo</span><span>Ücretsiz</span></div>
          <div class="summary-row summary-total"><span>Toplam</span><span>${formatPrice(total)}</span></div>
          <button class="btn btn-primary btn-block" id="checkout" style="margin-top:1rem">Siparişi Tamamla</button>
        </aside>
      </div>`;

    root.querySelectorAll('.line-item').forEach((row) => {
      const item = items.find((x) => String(x.book_id) === row.dataset.book);
      row.querySelector('[data-act="inc"]').addEventListener('click', async () => { await store.setCartQty(item, item.quantity + 1); render(); });
      row.querySelector('[data-act="dec"]').addEventListener('click', async () => { if (item.quantity > 1) { await store.setCartQty(item, item.quantity - 1); render(); } });
      row.querySelector('[data-act="del"]').addEventListener('click', async () => { await store.removeFromCart(item); toast('Üründen çıkarıldı.'); render(); });
    });
    document.getElementById('checkout').addEventListener('click', () => checkout(total));
  }
  render();
}

async function checkout(total) {
  if (!isLoggedIn()) {
    if (await confirmModal('Sipariş vermek için giriş yapmalısınız. Giriş sayfasına gidilsin mi?')) {
      location.href = '/login.html?next=/cart.html';
    }
    return;
  }
  let address = '';
  try { const me = await api('/users/' + currentUser().id); address = [me.address, me.district, me.province].filter(Boolean).join(', '); } catch {}
  const { el, close } = openModal(`
    <h2 style="margin-top:0">Teslimat Bilgisi</h2>
    <div class="field"><label>Teslimat adresi</label><textarea id="addr">${esc(address)}</textarea></div>
    <div class="summary-row summary-total"><span>Toplam</span><span>${formatPrice(total)}</span></div>
    <button class="btn btn-primary btn-block" id="place" style="margin-top:1rem">Siparişi Onayla</button>`);
  el.querySelector('#place').addEventListener('click', async () => {
    try {
      const res = await api('/orders', { method: 'POST', body: { address: el.querySelector('#addr').value.trim() } });
      store.clearLocalCart();
      await store.refreshCounts();
      close();
      toast('Siparişiniz alındı!', 'success');
      setTimeout(() => (location.href = '/order.html?id=' + res.order_id), 700);
    } catch (e) { toast(e.message, 'error'); }
  });
}

/* ===================== FAVORİLER ===================== */
async function initFavorites() {
  const grid = document.getElementById('fav-grid');
  if (!isLoggedIn()) {
    grid.innerHTML = emptyState('Favorileriniz', 'Favorilerinizi kaydetmek için giriş yapın.', '<a class="btn btn-primary" href="/login.html">Giriş yap</a>', '♥');
    return;
  }
  grid.innerHTML = skeletonCards(4);
  let favs;
  try { favs = await store.getFavorites(); } catch { favs = []; }
  if (!favs.length) { grid.innerHTML = emptyState('Henüz favoriniz yok', 'Beğendiğiniz kitapları favorilere ekleyin.', '<a class="btn btn-primary" href="/index.html">Kitaplara göz at</a>', '♥'); return; }
  let books = favs.map((f) => ({ id: f.book_id, ...f }));
  grid.innerHTML = books.map(bookCard).join('');
  wireGrid(grid, () => books, {
    onFavRemoved: (card) => { card.remove(); if (!grid.querySelector('.book-card')) initFavorites(); },
  });
}

/* ===================== SİPARİŞLER ===================== */
async function initOrders() {
  const root = document.getElementById('orders-root');
  if (!isLoggedIn()) { location.href = '/login.html?next=/orders.html'; return; }
  root.innerHTML = skeletonCards(3);
  let res;
  try { res = await api('/orders'); } catch { root.innerHTML = emptyState('Siparişler yüklenemedi'); return; }
  const orders = res.data || [];
  if (!orders.length) { root.innerHTML = emptyState('Henüz siparişiniz yok', 'İlk siparişinizi vermek için kitaplara göz atın.', '<a class="btn btn-primary" href="/index.html">Kitaplar</a>', '📦'); return; }
  root.innerHTML = orders.map((o) => `
    <a class="order-card" href="/order.html?id=${o.id}" style="display:block">
      <div class="order-card-head">
        <strong>Sipariş #${o.id}</strong>
        <span class="status-badge status-${o.status}">${STATUSES[o.status] || o.status}</span>
      </div>
      <div class="order-thumbs">
        ${(o.items || []).slice(0, 5).map((i) => (i.primary_image ? `<img class="line-thumb" src="${imageUrl(i.primary_image)}" alt="">` : '')).join('')}
      </div>
      <div class="order-card-head" style="margin-top:.75rem;margin-bottom:0">
        <span class="muted small">${formatDate(o.created_at)} · ${(o.items || []).length} ürün</span>
        <span class="price">${formatPrice(o.total_price)}</span>
      </div>
    </a>`).join('');
}

/* ===================== SİPARİŞ DETAY ===================== */
async function initOrderDetail() {
  const root = document.getElementById('order-root');
  const id = qs('id');
  if (!isLoggedIn()) { location.href = '/login.html'; return; }
  let o;
  try { o = await api('/orders/' + id); }
  catch { root.innerHTML = emptyState('Sipariş bulunamadı', '', '<a class="btn btn-primary" href="/orders.html">Siparişlerim</a>'); return; }
  root.innerHTML = `
    <div class="page-head">
      <h1>Sipariş #${o.id}</h1>
      <span class="status-badge status-${o.status}">${STATUSES[o.status] || o.status}</span>
    </div>
    <div class="panel" style="margin-bottom:1rem">
      <p class="muted small">${formatDate(o.created_at)}</p>
      ${o.address ? `<p><strong>Teslimat:</strong> ${esc(o.address)}</p>` : ''}
      ${o.cancellation_reason ? `<p class="muted"><strong>İptal nedeni:</strong> ${esc(o.cancellation_reason)}</p>` : ''}
    </div>
    <div id="order-items">
      ${(o.items || []).map((i) => `
        <div class="line-item">
          ${i.primary_image ? `<img src="${imageUrl(i.primary_image)}" alt="">` : '<div class="line-thumb"></div>'}
          <div class="line-info"><h4>${esc(i.title)}</h4><p class="muted small">${esc(i.author || '')}</p></div>
          <div>${i.quantity} × ${formatPrice(i.price)}</div>
        </div>`).join('')}
    </div>
    <div class="cart-summary" style="margin-top:1rem">
      <div class="summary-row summary-total"><span>Toplam</span><span>${formatPrice(o.total_price)}</span></div>
      ${o.status === 'pending' ? '<button class="btn btn-danger btn-block" id="cancel-order" style="margin-top:1rem">Siparişi İptal Et</button>' : ''}
    </div>`;
  document.getElementById('cancel-order')?.addEventListener('click', async () => {
    if (!(await confirmModal('Siparişi iptal etmek istediğinize emin misiniz?', { danger: true, okText: 'İptal et' }))) return;
    try {
      await api('/orders/' + id, { method: 'PUT', body: { status: 'cancelled', cancellation_reason: 'Kullanıcı tarafından iptal edildi' } });
      toast('Sipariş iptal edildi.');
      setTimeout(() => location.reload(), 600);
    } catch (e) { toast(e.message, 'error'); }
  });
}

/* ===================== PROFİL ===================== */
async function initProfile() {
  const root = document.getElementById('profile-root');
  if (!isLoggedIn()) { location.href = '/login.html?next=/profile.html'; return; }
  let me;
  try { me = await api('/users/' + currentUser().id); } catch { root.innerHTML = emptyState('Profil yüklenemedi'); return; }
  root.innerHTML = `
    <div class="profile-layout">
      <div class="panel" style="text-align:center">
        <div class="profile-avatar">${me.profile_photo ? `<img src="${imageUrl(me.profile_photo)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="">` : '👤'}</div>
        <h3 style="margin:.25rem 0">${esc(me.name)}</h3>
        <p class="muted small">${esc(me.email)}</p>
        ${me.role === 'admin' ? '<span class="tag">Yönetici</span>' : ''}
      </div>
      <form class="panel" id="profile-form">
        <h2 style="margin-top:0">Bilgilerim</h2>
        <div class="field"><label>Ad Soyad</label><input name="name" value="${esc(me.name)}" required></div>
        <div class="field"><label>Telefon</label><input name="phone_number" value="${esc(me.phone_number || '')}" placeholder="+90..."></div>
        <div class="field"><label>İl</label><input name="province" value="${esc(me.province || '')}"></div>
        <div class="field"><label>İlçe</label><input name="district" value="${esc(me.district || '')}"></div>
        <div class="field"><label>Adres</label><textarea name="address">${esc(me.address || '')}</textarea></div>
        <div class="field"><label>Profil fotoğrafı</label><input type="file" name="profile_photo" accept="image/*"></div>
        <button class="btn btn-primary" type="submit">Kaydet</button>
      </form>
    </div>`;
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('_method', 'PUT');
    const photo = fd.get('profile_photo');
    if (!photo || !photo.size) fd.delete('profile_photo');
    try {
      const res = await api('/users/' + me.id, { method: 'POST', form: fd });
      const u = currentUser();
      u.name = res.user.name;
      u.profile_photo = res.user.profile_photo;
      saveSession(localStorage.getItem('token'), u);
      toast('Profil güncellendi.', 'success');
      setTimeout(() => location.reload(), 700);
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ===================== GİRİŞ / KAYIT ===================== */
function initLogin() {
  const form = document.getElementById('login-form');
  const err = document.getElementById('form-error');
  if (isLoggedIn()) { location.href = '/index.html'; return; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    try {
      const res = await api('/login', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') } });
      saveSession(res.token, res.user);
      await store.migrateLocalToServer();
      toast('Hoş geldiniz, ' + res.user.name + '!', 'success');
      setTimeout(() => (location.href = qs('next') || '/index.html'), 500);
    } catch (e2) { err.textContent = e2.message; }
  });
}

function initRegister() {
  const form = document.getElementById('register-form');
  const err = document.getElementById('form-error');
  if (isLoggedIn()) { location.href = '/index.html'; return; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    if (String(fd.get('password')).length < 6) { err.textContent = 'Şifre en az 6 karakter olmalıdır.'; return; }
    try {
      await api('/register', { method: 'POST', body: { name: fd.get('name'), email: fd.get('email'), phone_number: fd.get('phone_number'), password: fd.get('password') } });
      toast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
      setTimeout(() => (location.href = '/login.html'), 800);
    } catch (e2) { err.textContent = e2.message; }
  });
}
