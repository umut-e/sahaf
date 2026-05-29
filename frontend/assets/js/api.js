// API istemcisi: oturum yönetimi + fetch sarmalayıcı.
// Backend aynı kaynakta /api altında yayında.

const BASE = '/api';

export function getSession() {
  try {
    return {
      token: localStorage.getItem('token'),
      user: JSON.parse(localStorage.getItem('user') || 'null'),
    };
  } catch {
    return { token: null, user: null };
  }
}

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function currentUser() {
  return getSession().user;
}

export function isLoggedIn() {
  return !!getSession().user;
}

export function isAdmin() {
  const u = currentUser();
  return !!u && u.role === 'admin';
}

function authHeaders(extra = {}) {
  const { token, user } = getSession();
  const h = { ...extra };
  if (user) {
    h['X-User-Id'] = user.id;
    h['X-User-Role'] = user.role;
  }
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

/**
 * API isteği. JSON gövde için `body`, dosya yüklemek için `form` (FormData) ver.
 * Hata durumunda mesajı olan bir Error fırlatır.
 */
export async function api(path, { method = 'GET', body = null, form = null } = {}) {
  const opts = { method, headers: authHeaders() };
  if (form) {
    opts.body = form; // tarayıcı Content-Type'ı kendi ayarlar (multipart boundary)
  } else if (body != null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch {
    throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Hata (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** DB'deki göreli görsel yolunu ("uploads/x.jpg") tam URL'ye çevirir. */
export function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return '/backend/' + String(path).replace(/^\/+/, '');
}
