// Ortak kitap ekleme/düzenleme modalı. Hem admin panelinde hem mağazadaki
// (admine özel) düzenleme butonlarında kullanılır.

import { api, imageUrl } from './api.js';
import { openModal, toast, confirmModal, esc, CONDITIONS } from './ui.js';

let _cats = [];
async function categories() {
  if (!_cats.length) {
    try { _cats = await api('/categories'); } catch { _cats = []; }
  }
  return _cats;
}

/**
 * Kitap ekleme/düzenleme modalını açar.
 * @param {object|null} book - düzenlenecek kitap (id yeterli) ya da yeni için null
 * @param {Function} onSaved - başarılı kayıttan sonra çağrılır (listeyi yenile)
 */
export async function openBookForm(book, onSaved) {
  const cats = await categories();
  // Liste uçları açıklamayı döndürmez; düzenlerken tam kaydı çek.
  let full = book;
  if (book && book.id) {
    try { full = await api('/books/' + book.id); } catch {}
  }

  const { el, close } = openModal(`
    <h2 style="margin-top:0">${book ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle'}</h2>
    <form id="bf">
      <div class="field"><label>Başlık</label><input name="title" value="${esc(full?.title || '')}" required></div>
      <div class="field"><label>Yazar</label><input name="author" value="${esc(full?.author || '')}" required></div>
      <div class="field" style="display:flex;gap:.75rem">
        <div style="flex:1"><label>Fiyat (₺)</label><input name="price" type="number" step="0.01" value="${esc(full?.price || '')}" required></div>
        <div style="flex:1"><label>Stok</label><input name="stock" type="number" value="${esc(full?.stock ?? 0)}" required></div>
      </div>
      <div class="field" style="display:flex;gap:.75rem">
        <div style="flex:1"><label>Durum</label><select name="condition">${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}" ${full?.condition === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div style="flex:1"><label>Kategori</label><select name="category_id"><option value="">—</option>${cats.map((c) => `<option value="${c.id}" ${full?.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Açıklama</label><textarea name="description">${esc(full?.description || '')}</textarea></div>
      <div class="field">
        <label>Kapak görselleri</label>
        ${book ? '<div class="img-manager" id="img-manager"></div>' : ''}
        <input type="file" name="images" accept="image/*" multiple>
        <span class="muted small">${book ? 'Yeni görsel eklenir; mevcutları yukarıdan kaldırabilirsiniz.' : 'Birden fazla görsel seçebilirsiniz.'}</span>
      </div>
      <div class="field-error" id="bf-err"></div>
      <button class="btn btn-primary btn-block" type="submit">${book ? 'Kaydet' : 'Ekle'}</button>
    </form>`, { wide: true });

  // Düzenlemede mevcut görselleri kaldırma butonlarıyla göster
  if (book) {
    const renderThumbs = () => {
      const box = el.querySelector('#img-manager');
      if (!box) return;
      const imgs = full.images || [];
      box.innerHTML = imgs.length
        ? imgs.map((im) => `
            <div class="img-thumb">
              <img src="${imageUrl(im.image_path)}" alt="">
              <button type="button" class="img-remove" data-img="${im.id}" aria-label="Görseli kaldır" title="Kaldır">&times;</button>
            </div>`).join('')
        : '<p class="muted small">Henüz görsel yok.</p>';
      box.querySelectorAll('.img-remove').forEach((b) => b.addEventListener('click', async () => {
        if (!(await confirmModal('Bu görseli kaldırmak istediğinize emin misiniz?', { danger: true, okText: 'Kaldır' }))) return;
        try {
          await api(`/books/${book.id}/images/${b.dataset.img}`, { method: 'DELETE' });
          full.images = (full.images || []).filter((x) => String(x.id) !== String(b.dataset.img));
          renderThumbs();
          toast('Görsel kaldırıldı.', 'success');
          if (onSaved) onSaved();
        } catch (e) { toast(e.message, 'error'); }
      }));
    };
    renderThumbs();
  }

  el.querySelector('#bf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const files = fd.getAll('images').filter((f) => f.size);
    fd.delete('images');
    files.forEach((f) => fd.append('images[]', f));
    try {
      if (book && book.id) {
        fd.append('_method', 'PUT');
        await api('/books/' + book.id, { method: 'POST', form: fd });
        toast('Kitap güncellendi.', 'success');
      } else {
        await api('/books', { method: 'POST', form: fd });
        toast('Kitap eklendi.', 'success');
      }
      close();
      if (onSaved) onSaved();
    } catch (err) { el.querySelector('#bf-err').textContent = err.message; }
  });
}

/** Silme onayı + işlemi. */
export async function confirmDeleteBook(book, onDone) {
  const label = book.title ? `"${book.title}"` : 'Bu kitap';
  if (!(await confirmModal(`${label} silinecek. Emin misiniz?`, { danger: true, okText: 'Sil' }))) return;
  try {
    await api('/books/' + book.id, { method: 'DELETE' });
    toast('Kitap silindi.');
    if (onDone) onDone();
  } catch (e) { toast(e.message, 'error'); }
}
