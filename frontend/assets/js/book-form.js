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
      <div class="field">
        <label>Kapak görseli</label>
        <div class="cover-editor">
          <div class="cover-preview" id="cover-preview"></div>
          <div class="cover-controls">
            <input type="file" name="images" accept="image/*" id="cover-input">
            <span class="muted small" id="cover-hint"></span>
          </div>
        </div>
      </div>
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
      <div class="field-error" id="bf-err"></div>
      <button class="btn btn-primary btn-block" type="submit">${book ? 'Kaydet' : 'Ekle'}</button>
    </form>`, { wide: true });

  // Tek kapak görseli yönetimi: mevcut görsel önizlemesi + kaldır; yeni seçince güncelle
  const preview = el.querySelector('#cover-preview');
  const fileInput = el.querySelector('#cover-input');
  const hint = el.querySelector('#cover-hint');
  const cover = () => (full?.images && full.images[0]) || null;

  const renderCover = () => {
    const c = cover();
    if (c) {
      preview.innerHTML = `<div class="img-thumb">
          <img src="${imageUrl(c.image_path)}" alt="">
          <button type="button" class="img-remove" aria-label="Görseli kaldır" title="Kaldır">&times;</button>
        </div>`;
      hint.textContent = 'Yeni görsel seçerseniz mevcut kapak güncellenir.';
      preview.querySelector('.img-remove').addEventListener('click', async () => {
        if (!(await confirmModal('Kapak görselini kaldırmak istediğinize emin misiniz?', { danger: true, okText: 'Kaldır' }))) return;
        try {
          await api(`/books/${book.id}/images/${c.id}`, { method: 'DELETE' });
          full.images = [];
          renderCover();
          toast('Görsel kaldırıldı.', 'success');
          if (onSaved) onSaved();
        } catch (e) { toast(e.message, 'error'); }
      });
    } else {
      preview.innerHTML = '<div class="cover-empty">📖</div>';
      hint.textContent = book ? 'Bu kitabın görseli yok. Bir görsel seçip ekleyin.' : 'Bir kapak görseli seçin.';
    }
  };
  renderCover();
  // Yeni dosya seçilince anlık önizleme
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    preview.innerHTML = `<div class="img-thumb"><img src="${URL.createObjectURL(f)}" alt=""></div>`;
    hint.textContent = cover() ? 'Kaydedince mevcut kapak bununla değiştirilecek.' : 'Kaydedince eklenecek.';
  });

  el.querySelector('#bf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get('images');
    fd.delete('images');
    if (file && file.size) fd.append('images[]', file);
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
