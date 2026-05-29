// Ortak arayüz bileşenleri: header/footer, toast, modal, yıldız, lightbox,
// skeleton, boş durum ve yardımcı fonksiyonlar.

import { api, currentUser, isLoggedIn, isAdmin, clearSession } from './api.js';
import { cartCount, favCount, refreshCounts } from './store.js';

/* ---------------- yardımcılar ---------------- */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function formatPrice(v) {
  const n = Number(v || 0);
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}

export function formatDate(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const CONDITIONS = { new: 'Sıfır', good: 'İyi', fair: 'Orta', poor: 'Yıpranmış' };
export const STATUSES = {
  pending: 'Beklemede', processing: 'Hazırlanıyor', shipped: 'Kargolandı',
  completed: 'Tamamlandı', cancelled: 'İptal edildi',
};

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

/* ---------------- yıldızlar ---------------- */
export function starsHtml(rating, count) {
  const r = Math.round(Number(rating || 0));
  let s = '<span class="stars" aria-label="' + (rating || 0) + ' yıldız">';
  for (let i = 1; i <= 5; i++) {
    s += `<span class="star ${i <= r ? 'on' : ''}">★</span>`;
  }
  s += '</span>';
  if (count != null) s += `<span class="rating-count">(${count})</span>`;
  return s;
}

/* ---------------- toast ----------------
   Sağ üstte, belirgin. Sayfa geçişlerinde kaybolmaması için sessionStorage'da
   tutulur ve yeni sayfada kaldığı süreden devam ettirilir. */
const TOAST_KEY = 'sahaf_toasts';
const TOAST_DURATION = 4500;
const TOAST_ICON = { success: '✓', error: '✕', info: 'ℹ' };

function toastQueue() {
  try { return JSON.parse(sessionStorage.getItem(TOAST_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q) {
  try { sessionStorage.setItem(TOAST_KEY, JSON.stringify(q)); } catch {}
}
function toastWrap() {
  let w = document.querySelector('.toast-wrap');
  if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
  return w;
}

function showToastEl(id, message, type, remaining) {
  if (document.querySelector(`.toast[data-id="${id}"]`)) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.dataset.id = id;
  el.innerHTML = `<span class="toast-icon">${TOAST_ICON[type] || TOAST_ICON.info}</span>
    <span class="toast-msg">${esc(message)}</span>
    <button class="toast-close" aria-label="Kapat">&times;</button>`;
  toastWrap().appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const dismiss = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
    saveQueue(toastQueue().filter((t) => t.id !== id));
  };
  el.querySelector('.toast-close').addEventListener('click', dismiss);
  setTimeout(dismiss, Math.max(800, remaining));
}

export function toast(message, type = 'info') {
  const id = 't' + Date.now() + Math.round(Math.random() * 1000);
  const q = toastQueue();
  q.push({ id, message, type, expires: Date.now() + TOAST_DURATION });
  saveQueue(q);
  showToastEl(id, message, type, TOAST_DURATION);
}

/** Sayfa yüklenince, önceki sayfadan kalan (süresi dolmamış) toast'ları gösterir. */
export function replayToasts() {
  const now = Date.now();
  const q = toastQueue().filter((t) => t.expires > now);
  saveQueue(q);
  q.forEach((t) => showToastEl(t.id, t.message, t.type, t.expires - now));
}

/* ---------------- onay modalı ---------------- */
export function confirmModal(message, { okText = 'Evet', cancelText = 'Vazgeç', danger = false } = {}) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `
      <div class="modal modal-sm" role="dialog" aria-modal="true">
        <p class="modal-msg">${esc(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">${esc(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    const close = (val) => { back.remove(); resolve(val); };
    back.addEventListener('click', (e) => {
      if (e.target === back) close(false);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') close(true);
      if (act === 'cancel') close(false);
    });
  });
}

/* ---------------- genel modal ---------------- */
export function openModal(html, { wide = false } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Kapat">&times;</button>${html}</div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('.modal-close')) close();
  });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
  return { el: back.querySelector('.modal'), close };
}

/* ---------------- lightbox (görsel büyütme) ---------------- */
export function lightbox(images, start = 0) {
  if (!images || !images.length) return;
  let idx = start;
  const back = document.createElement('div');
  back.className = 'lightbox';
  const render = () => {
    back.innerHTML = `
      <button class="lb-close" aria-label="Kapat">&times;</button>
      ${images.length > 1 ? '<button class="lb-nav lb-prev" aria-label="Önceki">‹</button>' : ''}
      <img src="${images[idx]}" alt="Görsel ${idx + 1}">
      ${images.length > 1 ? '<button class="lb-nav lb-next" aria-label="Sonraki">›</button>' : ''}
      ${images.length > 1 ? `<div class="lb-count">${idx + 1} / ${images.length}</div>` : ''}`;
  };
  render();
  document.body.appendChild(back);
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') { idx = (idx + 1) % images.length; render(); }
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + images.length) % images.length; render(); }
  };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('.lb-close')) close();
    if (e.target.closest('.lb-next')) { idx = (idx + 1) % images.length; render(); }
    if (e.target.closest('.lb-prev')) { idx = (idx - 1 + images.length) % images.length; render(); }
  });
}

/* ---------------- skeleton & boş durum ---------------- */
export function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="book-card skeleton-card">
      <div class="sk sk-img"></div>
      <div class="sk sk-line"></div>
      <div class="sk sk-line short"></div>
      <div class="sk sk-line shorter"></div>
    </div>`).join('');
}

export function emptyState(title, desc = '', actionHtml = '', icon = '📚') {
  return `<div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${esc(title)}</h3>
      ${desc ? `<p>${esc(desc)}</p>` : ''}
      ${actionHtml}
    </div>`;
}

/* ---------------- tema ---------------- */
export function initTheme() {
  const saved = localStorage.getItem('theme');
  const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
}
export function toggleTheme() {
  const dark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  updateThemeIcon();
}
function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
}

/* ---------------- ikonlar ---------------- */
const ICON = {
  cart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
};

/* ---------------- header & footer ---------------- */
export function mountChrome() {
  initTheme();
  const user = currentUser();

  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="header-inner">
      <a href="/index.html" class="logo">
        <span class="logo-mark">📖</span><span class="logo-text">Sahaf</span>
      </a>
      <nav class="main-nav">
        <a href="/index.html">Kitaplar</a>
      </nav>
      <div class="header-actions">
        <button id="theme-toggle" class="icon-btn" aria-label="Tema değiştir" title="Tema"></button>
        ${user ? `
          <button id="nav-notif" class="icon-btn badge-host" aria-label="Bildirimler" title="Bildirimler">
            ${ICON.bell}<span class="badge" id="notif-badge" hidden>0</span>
          </button>` : ''}
        <a href="/favorites.html" class="icon-btn badge-host" aria-label="Favoriler" title="Favoriler">
          ${ICON.heart}<span class="badge" id="fav-badge" hidden>0</span>
        </a>
        <a href="/cart.html" class="icon-btn badge-host" aria-label="Sepet" title="Sepet">
          ${ICON.cart}<span class="badge" id="cart-badge" hidden>0</span>
        </a>
        ${user ? `
          <div class="user-menu">
            <button class="icon-btn" id="user-btn" aria-label="Hesabım">${ICON.user}</button>
            <div class="dropdown" id="user-dropdown" hidden>
              <div class="dropdown-head">${esc(user.name)}</div>
              <a href="/profile.html">Profilim</a>
              <a href="/orders.html">Siparişlerim</a>
              ${isAdmin() ? '<a href="/admin/index.html">Yönetim Paneli</a>' : ''}
              <button id="logout-btn" class="dropdown-danger">Çıkış Yap</button>
            </div>
          </div>` : `
          <a href="/login.html" class="btn btn-ghost btn-sm">Giriş</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Kayıt Ol</a>`}
      </div>
    </div>`;
  document.body.prepend(header);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <div class="logo"><span class="logo-mark">📖</span><span class="logo-text">Sahaf</span></div>
        <p class="muted">İkinci el ve nadir kitaplar için buluşma noktası.</p>
      </div>
      <nav class="footer-links">
        <a href="/index.html">Kitaplar</a>
        <a href="/favorites.html">Favoriler</a>
        <a href="/cart.html">Sepet</a>
      </nav>
      <p class="muted small">© ${new Date().getFullYear()} Sahaf — Öğrenci projesi.</p>
    </div>`;
  document.body.appendChild(footer);

  updateThemeIcon();
  wireChrome();
  updateBadges();
  refreshCounts();
  replayToasts();
  window.addEventListener('store:change', updateBadges);
}

function wireChrome() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearSession();
    toast('Çıkış yapıldı.');
    setTimeout(() => (location.href = '/index.html'), 500);
  });

  const userBtn = document.getElementById('user-btn');
  const dropdown = document.getElementById('user-dropdown');
  userBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });
  document.addEventListener('click', () => { if (dropdown) dropdown.hidden = true; });

  document.getElementById('nav-notif')?.addEventListener('click', openNotifications);
}

function updateBadges() {
  const set = (id, n) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.textContent = n;
    b.hidden = !n;
  };
  set('cart-badge', cartCount());
  set('fav-badge', favCount());
}

/* ---------------- bildirimler ---------------- */
async function openNotifications(e) {
  e.stopPropagation();
  let payload;
  try { payload = await api('/notifications'); } catch { return toast('Bildirimler alınamadı.', 'error'); }
  const items = payload.data || [];
  const html = `
    <div class="notif-panel">
      <div class="notif-head">
        <strong>Bildirimler</strong>
        ${items.length ? '<button class="link-btn" id="notif-readall">Tümünü okundu yap</button>' : ''}
      </div>
      <div class="notif-list">
        ${items.length ? items.map((n) => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}">
            <p>${esc(n.message)}</p>
            <span class="muted small">${formatDate(n.created_at)}</span>
          </div>`).join('') : '<p class="muted" style="padding:1rem">Bildiriminiz yok.</p>'}
      </div>
    </div>`;
  const { close } = openModal(html);
  document.getElementById('notif-readall')?.addEventListener('click', async () => {
    try { await api('/notifications/read-all', { method: 'PUT' }); } catch {}
    const badge = document.getElementById('notif-badge');
    if (badge) badge.hidden = true;
    close();
    toast('Tüm bildirimler okundu.');
  });
}

export async function refreshNotifBadge() {
  if (!isLoggedIn()) return;
  try {
    const payload = await api('/notifications');
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = payload.unread; badge.hidden = !payload.unread; }
  } catch {}
}
