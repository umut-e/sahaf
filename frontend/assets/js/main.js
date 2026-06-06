// Mağaza sayfaları — sayfa yönlendirici. body[data-page] değerine göre ilgili
// init fonksiyonu çalışır.

import { api, currentUser, isLoggedIn, isAdmin, saveSession, imageUrl } from './api.js';
import * as store from './store.js';
import { openBookForm, confirmDeleteBook } from './book-form.js';
import {
  mountChrome, toast, confirmModal, esc, formatPrice, formatDate, qs,
  starsHtml, skeletonCards, emptyState, lightbox, CONDITIONS, STATUSES, refreshNotifBadge,
} from './ui.js';
import { fillProvinceSelect, fillDistrictSelect } from './tr-cities.js';

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
        ${isAdmin() ? `<div class="admin-card-actions">
          <button class="btn btn-ghost btn-sm" data-act="edit">✏️ Düzenle</button>
          <button class="btn btn-danger btn-sm" data-act="del">Sil</button>
        </div>` : ''}
      </div>
    </article>`;
}

/** Bir grid içindeki kartlara olay bağlar (delegasyon). */
function wireGrid(grid, getBooks, { onFavRemoved, onAdminChange } = {}) {
  grid.addEventListener('click', async (e) => {
    const card = e.target.closest('.book-card');
    if (!card) return;
    const book = getBooks().find((b) => Number(b.id) === Number(card.dataset.id));
    if (!book) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'fav') {
      e.stopPropagation();
      if (!isLoggedIn()) { toast('Favorilere eklemek için giriş yapmalısınız.', 'error'); return; }
      const now = await store.toggleFavorite(book);
      card.querySelector('.fav-toggle').classList.toggle('on', now);
      toast(now ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'success');
      if (!now && onFavRemoved) onFavRemoved(card);
    } else if (act === 'add') {
      e.stopPropagation();
      if (Number(book.stock) <= 0) { toast('Bu kitap tükendi.', 'error'); return; }
      try { await store.addToCart(book); toast('Sepete eklendi.', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    } else if (act === 'edit') {
      e.stopPropagation();
      openBookForm(book, onAdminChange);
    } else if (act === 'del') {
      e.stopPropagation();
      confirmDeleteBook(book, onAdminChange);
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
  wireGrid(grid, () => books, { onAdminChange: () => load() });

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
  loadQuotes();
}

/* Statik JSON dosyasından edebî sözleri okuyup kart olarak listeler. */
async function loadQuotes() {
  const section = document.getElementById('quotes-section');
  const grid = document.getElementById('quotes-grid');
  if (!grid) return;
  let quotes;
  try {
    const res = await fetch('/data/sozler.json');
    quotes = await res.json();
  } catch { return; }
  if (!Array.isArray(quotes) || !quotes.length) return;
  grid.innerHTML = quotes.map((q) => `
    <figure class="quote-card">
      <blockquote>${esc(q.quote)}</blockquote>
      <figcaption>— ${esc(q.author)}${q.work ? `, <span class="quote-work">${esc(q.work)}</span>` : ''}</figcaption>
    </figure>`).join('');
  section.hidden = false;
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

  const images = (book.images || []).map((im) => imageUrl(im.image_path));
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
        <div class="detail-badges">
          ${book.category_name ? `<span class="tag">${esc(book.category_name)}</span>` : ''}
          <span class="pill">${CONDITIONS[book.condition] || book.condition}</span>
          <span class="pill ${out ? 'pill-out' : 'pill-stock'}">${out ? 'Tükendi' : esc(book.stock) + ' adet stokta'}</span>
        </div>
        <div class="rating-row">
          ${Number(book.review_count) > 0 ? starsHtml(book.avg_rating, book.review_count) : '<span class="muted small">Henüz değerlendirilmemiş</span>'}
        </div>
        <div class="detail-price">${formatPrice(book.price)}</div>
        ${book.description ? `<p class="detail-desc">${esc(book.description)}</p>` : ''}
        <div class="buy-row">
          ${out ? '' : `<div class="qty-control" id="qty"><button type="button" data-q="dec" aria-label="Azalt">−</button><span id="qty-val">1</span><button type="button" data-q="inc" aria-label="Artır">+</button></div>`}
          <button class="btn btn-primary btn-lg" id="add-cart" ${out ? 'disabled' : ''}>${out ? 'Stokta Yok' : 'Sepete Ekle'}</button>
          <button class="btn btn-ghost" id="fav-btn">${store.isFav(book.id) ? '♥ Favoride' : '♡ Favorile'}</button>
        </div>
        ${isAdmin() ? `<div class="admin-bar">
          <span class="admin-bar-label">Yönetici</span>
          <button class="btn btn-ghost btn-sm" id="admin-edit">✏️ Düzenle</button>
          <button class="btn btn-danger btn-sm" id="admin-del">Sil</button>
        </div>` : ''}
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
  let qty = 1;
  const qtyEl = document.getElementById('qty');
  qtyEl?.addEventListener('click', (e) => {
    const dir = e.target.closest('[data-q]')?.dataset.q;
    if (!dir) return;
    const max = Math.max(1, Number(book.stock) || 1);
    qty = Math.min(max, Math.max(1, qty + (dir === 'inc' ? 1 : -1)));
    document.getElementById('qty-val').textContent = qty;
  });
  document.getElementById('add-cart')?.addEventListener('click', async () => {
    try {
      await store.addToCart(book, qty);
      toast(qty > 1 ? `${qty} adet sepete eklendi.` : 'Sepete eklendi.', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  document.getElementById('fav-btn')?.addEventListener('click', async (e) => {
    if (!isLoggedIn()) { toast('Favorilere eklemek için giriş yapmalısınız.', 'error'); return; }
    const now = await store.toggleFavorite(book);
    e.target.textContent = now ? '♥ Favoride' : '♡ Favorile';
    toast(now ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.', 'success');
  });
  document.getElementById('admin-edit')?.addEventListener('click', () => openBookForm(book, () => location.reload()));
  document.getElementById('admin-del')?.addEventListener('click', () => confirmDeleteBook(book, () => { location.href = '/index.html'; }));

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
      <div class="review-main">
        <div class="review-head">
          <span class="review-author">${esc(r.user_name)}</span>
          ${starsHtml(r.rating)}
          <span class="muted small review-date">${formatDate(r.created_at)}</span>
        </div>
        ${r.comment ? `<p class="review-comment">${esc(r.comment)}</p>` : ''}
      </div>
      <button class="review-like ${r.liked_by_me ? 'on' : ''}" data-rid="${r.id}" aria-label="Beğen" title="Beğen">
        <span class="like-heart">♥</span>
        <span class="like-count">${r.like_count}</span>
      </button>
    </div>`).join('');

  list.querySelectorAll('.review-like').forEach((btn) => btn.addEventListener('click', async () => {
    if (!isLoggedIn()) return toast('Beğenmek için giriş yapın.', 'error');
    const on = btn.classList.contains('on');
    try {
      const res = await api(`/reviews/${btn.dataset.rid}/like`, { method: on ? 'DELETE' : 'POST' });
      btn.classList.toggle('on', !on);
      btn.querySelector('.like-count').textContent = res.like_count;
    } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ===================== SEPET ===================== */
async function initCart() {
  const root = document.getElementById('cart-root');
  let me = {};
  if (isLoggedIn()) { try { me = await api('/users/' + currentUser().id); } catch {} }

  let items = [];
  try { items = await store.getCart(); } catch {}
  if (!items.length) {
    root.innerHTML = emptyState('Sepetiniz boş', 'Beğendiğiniz kitapları sepete ekleyin.', '<a class="btn btn-primary" href="/index.html">Kitaplara göz at</a>', '🛒');
    return;
  }

  root.innerHTML = `
    <div class="cart-layout">
      <div>
        <div id="cart-items"></div>
        ${isLoggedIn() ? `
          <div class="panel" style="margin-top:1.25rem">
            <h3 style="margin-top:0">Teslimat Bilgileri</h3>
            <p class="muted small" style="margin-top:-.35rem">Profilinizdeki bilgiler otomatik dolduruldu; düzenleyebilirsiniz.</p>
            <div class="field"><label>Ad Soyad</label><input id="co-name" value="${esc(me.name || currentUser().name || '')}"></div>
            <div class="field"><label>Telefon</label><input id="co-phone" value="${esc(me.phone_number || '')}" placeholder="+90..."></div>
            <div class="field" style="display:flex;gap:.75rem">
              <div style="flex:1"><label>İl</label><select id="co-prov"></select></div>
              <div style="flex:1"><label>İlçe</label><select id="co-dist"></select></div>
            </div>
            <div class="field"><label>Açık Adres</label><textarea id="co-addr" placeholder="Mahalle, sokak, no...">${esc(me.address || '')}</textarea></div>
          </div>` : ''}
      </div>
      <aside class="cart-summary">
        <h3 style="margin-top:0">Özet</h3>
        <div class="summary-row"><span>Ara toplam</span><span id="sum-sub"></span></div>
        <div class="summary-row muted"><span>Kargo</span><span>Ücretsiz</span></div>
        <div class="summary-row summary-total"><span>Toplam</span><span id="sum-total"></span></div>
        <div class="field-error" id="co-err"></div>
        <button class="btn btn-primary btn-block" id="checkout" style="margin-top:1rem">${isLoggedIn() ? 'Siparişi Tamamla' : 'Giriş Yap ve Sipariş Ver'}</button>
      </aside>
    </div>`;

  // il/ilçe kademeli açılır menüler (girişliyse)
  if (isLoggedIn()) {
    const prov = document.getElementById('co-prov');
    const dist = document.getElementById('co-dist');
    fillProvinceSelect(prov, me.province || '');
    fillDistrictSelect(dist, me.province || '', me.district || '');
    prov.addEventListener('change', () => fillDistrictSelect(dist, prov.value));
  }

  // Ürün listesini formdan bağımsız render et (miktar değişince form sıfırlanmasın)
  function renderItems() {
    const box = document.getElementById('cart-items');
    const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    box.innerHTML = items.map((i) => `
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
      </div>`).join('');
    document.getElementById('sum-sub').textContent = formatPrice(total);
    document.getElementById('sum-total').textContent = formatPrice(total);

    box.querySelectorAll('.line-item').forEach((row) => {
      const item = items.find((x) => String(x.book_id) === row.dataset.book);
      row.querySelector('[data-act="inc"]').addEventListener('click', () => changeQty(item, item.quantity + 1));
      row.querySelector('[data-act="dec"]').addEventListener('click', () => { if (item.quantity > 1) changeQty(item, item.quantity - 1); });
      row.querySelector('[data-act="del"]').addEventListener('click', () => removeItem(item));
    });
  }

  async function refresh() {
    try { items = await store.getCart(); } catch { items = []; }
    if (!items.length) {
      root.innerHTML = emptyState('Sepetiniz boş', 'Beğendiğiniz kitapları sepete ekleyin.', '<a class="btn btn-primary" href="/index.html">Kitaplara göz at</a>', '🛒');
      return;
    }
    renderItems();
  }
  async function changeQty(item, q) { await store.setCartQty(item, q); await refresh(); }
  async function removeItem(item) { await store.removeFromCart(item); toast('Üründen çıkarıldı.'); await refresh(); }

  renderItems();

  document.getElementById('checkout').addEventListener('click', async () => {
    if (!isLoggedIn()) { location.href = '/login.html?next=/cart.html'; return; }
    const name = document.getElementById('co-name').value.trim();
    const phone = document.getElementById('co-phone').value.trim();
    const province = document.getElementById('co-prov').value;
    const district = document.getElementById('co-dist').value;
    const addr = document.getElementById('co-addr').value.trim();
    const err = document.getElementById('co-err');
    err.textContent = '';
    if (!name || !phone || !province || !district || !addr) {
      err.textContent = 'Lütfen tüm teslimat alanlarını doldurun.';
      return;
    }
    // Tek metin alanına derli toplu adres (mevcut sipariş biçimiyle uyumlu)
    const fullAddress = `${name} - Tel: ${phone} | ${province} / ${district} | ${addr}`;
    try {
      const res = await api('/orders', { method: 'POST', body: { address: fullAddress } });
      store.clearLocalCart();
      await store.refreshCounts();
      toast('Siparişiniz alındı!', 'success');
      setTimeout(() => (location.href = '/order.html?id=' + res.order_id), 700);
    } catch (e) { err.textContent = e.message; }
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
    onAdminChange: () => initFavorites(),
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
        <div class="field" style="display:flex;gap:.75rem">
          <div style="flex:1"><label>İl</label><select name="province" id="pf-prov"></select></div>
          <div style="flex:1"><label>İlçe</label><select name="district" id="pf-dist"></select></div>
        </div>
        <div class="field"><label>Açık Adres</label><textarea name="address" placeholder="Mahalle, sokak, no...">${esc(me.address || '')}</textarea></div>
        <div class="field"><label>Profil fotoğrafı</label><input type="file" name="profile_photo" accept="image/*"></div>
        <div class="field"><label>Yeni şifre <span class="muted small">(değiştirmek istemiyorsanız boş bırakın)</span></label><input type="password" name="password" autocomplete="new-password" placeholder="••••••" minlength="6"></div>
        <div class="field-error" id="pf-err"></div>
        <button class="btn btn-primary" type="submit">Kaydet</button>
      </form>
    </div>`;

  const provEl = document.getElementById('pf-prov');
  const distEl = document.getElementById('pf-dist');
  fillProvinceSelect(provEl, me.province || '');
  fillDistrictSelect(distEl, me.province || '', me.district || '');
  provEl.addEventListener('change', () => fillDistrictSelect(distEl, provEl.value));

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('_method', 'PUT');
    const photo = fd.get('profile_photo');
    if (!photo || !photo.size) fd.delete('profile_photo');
    const pw = fd.get('password');
    const errEl = document.getElementById('pf-err');
    if (errEl) errEl.textContent = '';
    if (pw && pw.length < 6) { if (errEl) errEl.textContent = 'Şifre en az 6 karakter olmalıdır.'; return; }
    if (!pw) fd.delete('password');
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
      const res = await api('/login', { method: 'POST', body: { identifier: fd.get('identifier'), password: fd.get('password') } });
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
      await api('/register', { method: 'POST', body: { name: fd.get('name'), identifier: fd.get('identifier'), password: fd.get('password') } });
      toast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
      setTimeout(() => (location.href = '/login.html'), 800);
    } catch (e2) { err.textContent = e2.message; }
  });
}
