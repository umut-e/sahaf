// Sepet & favori durumu.
// Misafir kullanıcı: localStorage. Giriş yapan kullanıcı: sunucu otoritedir,
// localStorage yalnızca header rozetleri için önbellek olarak kullanılır.

import { api, isLoggedIn } from './api.js';

const CART_KEY = 'sahaf_cart';
const FAV_KEY = 'sahaf_fav_ids';
const CART_COUNT_KEY = 'sahaf_cart_count';

/* ---------- yerel (misafir) sepet ---------- */
function localCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}
function setLocalCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  localStorage.setItem(CART_COUNT_KEY, String(items.reduce((s, i) => s + (i.quantity || 1), 0)));
  emitChange();
}

/* ---------- favoriler (id önbelleği, senkron okuma için) ---------- */
function favIds() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]').map(Number); } catch { return []; }
}
function setFavIds(ids) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids.map(Number)));
  emitChange();
}

export function isFav(bookId) {
  return favIds().includes(Number(bookId));
}

/* ---------- rozet sayıları (senkron) ---------- */
export function cartCount() {
  return Number(localStorage.getItem(CART_COUNT_KEY) || 0);
}
export function favCount() {
  return favIds().length;
}

function emitChange() {
  window.dispatchEvent(new CustomEvent('store:change'));
}

/* ---------- sepet işlemleri ---------- */
export async function getCart() {
  if (isLoggedIn()) {
    const items = await api('/cart');
    localStorage.setItem(CART_COUNT_KEY, String(items.reduce((s, i) => s + (i.quantity || 1), 0)));
    emitChange();
    return items;
  }
  return localCart();
}

export async function addToCart(book, qty = 1) {
  if (isLoggedIn()) {
    await api('/cart', { method: 'POST', body: { book_id: book.id, quantity: qty } });
    await refreshCounts();
  } else {
    const cart = localCart();
    const found = cart.find((i) => Number(i.book_id) === Number(book.id));
    if (found) {
      found.quantity += qty;
    } else {
      cart.push({
        book_id: Number(book.id), quantity: qty, title: book.title, author: book.author,
        price: book.price, stock: book.stock, primary_image: book.primary_image,
      });
    }
    setLocalCart(cart);
  }
}

export async function setCartQty(item, qty) {
  qty = Math.max(1, qty);
  if (isLoggedIn()) {
    await api('/cart/' + item.id, { method: 'PUT', body: { quantity: qty } });
    await refreshCounts();
  } else {
    const cart = localCart();
    const found = cart.find((i) => Number(i.book_id) === Number(item.book_id));
    if (found) found.quantity = qty;
    setLocalCart(cart);
  }
}

export async function removeFromCart(item) {
  if (isLoggedIn()) {
    await api('/cart/' + item.id, { method: 'DELETE' });
    await refreshCounts();
  } else {
    setLocalCart(localCart().filter((i) => Number(i.book_id) !== Number(item.book_id)));
  }
}

export function clearLocalCart() {
  setLocalCart([]);
}

/* ---------- favori işlemleri ---------- */
export async function getFavorites() {
  if (isLoggedIn()) {
    const items = await api('/favorites');
    setFavIds(items.map((i) => i.book_id));
    return items;
  }
  return [];
}

export async function toggleFavorite(book) {
  const ids = favIds();
  const on = ids.includes(Number(book.id));
  if (isLoggedIn()) {
    if (on) await api('/favorites/' + book.id, { method: 'DELETE' });
    else await api('/favorites', { method: 'POST', body: { book_id: book.id } });
  }
  if (on) setFavIds(ids.filter((x) => x !== Number(book.id)));
  else setFavIds([...ids, Number(book.id)]);
  return !on;
}

/* ---------- senkronizasyon ---------- */
export async function refreshCounts() {
  if (!isLoggedIn()) {
    localStorage.setItem(CART_COUNT_KEY, String(localCart().reduce((s, i) => s + (i.quantity || 1), 0)));
    emitChange();
    return;
  }
  try {
    const [cart, favIdsArr] = await Promise.all([api('/cart'), api('/favorites?ids=1')]);
    localStorage.setItem(CART_COUNT_KEY, String(cart.reduce((s, i) => s + (i.quantity || 1), 0)));
    setFavIds(favIdsArr);
  } catch { /* sessiz geç */ }
}

/** Giriş sonrası yerel sepet/favorileri sunucuya taşır. */
export async function migrateLocalToServer() {
  const cart = localCart();
  for (const item of cart) {
    try { await api('/cart', { method: 'POST', body: { book_id: item.book_id, quantity: item.quantity } }); } catch {}
  }
  localStorage.removeItem(CART_KEY);
  await refreshCounts();
}
