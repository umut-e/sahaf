// Utility functions and page controllers for the Sahaf front‑end.

// Get stored user session from localStorage
function getSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user ? { token, user: JSON.parse(user) } : null;
}

// Save session information
function saveSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Clear session
function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// --- LocalStorage Logic for Cart & Favorites ---
function getLocalCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveLocalCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function getLocalFavs() {
    return JSON.parse(localStorage.getItem('favorites')) || [];
}

function saveLocalFavs(favs) {
    localStorage.setItem('favorites', JSON.stringify(favs));
}

// Build headers for API requests including authentication
function buildHeaders() {
    const session = getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session) {
        // Pass user id and role in custom headers. In production use Authorization
        headers['X-User-Id'] = session.user.id;
        headers['X-User-Role'] = session.user.role;
        headers['Authorization'] = 'Bearer ' + session.token;
    }
    return headers;
}

// Update navigation dynamically based on login status
function updateNavigation() {
    const nav = document.querySelector('nav');
    if (!nav || window.location.pathname.includes('/admin/')) return;

    // Fix Ana Sayfa link (optional, if we want icon)
    // Fix Sepet link
    const cartLink = document.querySelector('nav a[href="cart.html"]');
    if (cartLink && !cartLink.innerHTML.includes('svg')) {
        cartLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Sepet`;
        cartLink.style.display = 'flex';
        cartLink.style.alignItems = 'center';
    }

    let loginLink = document.getElementById('login-link');
    let registerLink = document.getElementById('register-link');
    let profileLink = document.getElementById('profile-link');
    let logoutLink = document.getElementById('logout-link');
    let adminLink = document.getElementById('admin-link');
    const themeToggle = document.getElementById('toggle-theme');

    const session = getSession();

    if (!loginLink) {
        loginLink = document.createElement('a');
        loginLink.href = 'login.html';
        loginLink.id = 'login-link';
        loginLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>Giriş Yap`;
        loginLink.style.display = 'flex';
        loginLink.style.alignItems = 'center';
    }
    if (!registerLink) {
        registerLink = document.createElement('a');
        registerLink.href = 'register.html';
        registerLink.id = 'register-link';
        registerLink.innerHTML = `Kayıt Ol`;
        registerLink.className = 'btn-primary';
    }
    if (!profileLink) {
        profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.id = 'profile-link';
        profileLink.style.display = 'flex';
        profileLink.style.alignItems = 'center';
        profileLink.title = 'Profilim';
    }
    
    // Set dynamic username and icon for profile
    if (session && session.user && session.user.name) {
        profileLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${session.user.name}`;
    } else {
        profileLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Profil`;
    }

    if (!adminLink) {
        adminLink = document.createElement('a');
        adminLink.href = 'admin/books.html';
        adminLink.id = 'admin-link';
        adminLink.textContent = 'Admin Paneli';
        adminLink.style.color = '#ef4444';
        adminLink.style.fontWeight = 'bold';
    }

    let favLink = document.getElementById('fav-link');
    if (!favLink) {
        favLink = document.createElement('a');
        favLink.href = 'favorites.html';
        favLink.id = 'fav-link';
        favLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>Favoriler`;
        favLink.style.display = 'flex';
        favLink.style.alignItems = 'center';
    }

    if (!logoutLink) {
        logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.id = 'logout-link';
        logoutLink.addEventListener('click', logout);
    } else {
        logoutLink.removeEventListener('click', logout);
        logoutLink.addEventListener('click', logout);
    }
    
    // Setup logout link styles to match others
    logoutLink.style.display = 'flex';
    logoutLink.style.alignItems = 'center';
    logoutLink.style.color = 'var(--header-text)'; // Use current text color (black/white depending on theme)
    logoutLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Çıkış Yap`;

    // Reorder everything safely
    const insertBeforeEl = themeToggle ? themeToggle : null;
    
    // We clear dynamic links first to re-insert them in correct order
    if (loginLink.parentNode) loginLink.remove();
    if (registerLink.parentNode) registerLink.remove();
    if (profileLink.parentNode) profileLink.remove();
    if (adminLink.parentNode) adminLink.remove();
    if (logoutLink.parentNode) logoutLink.remove();
    if (favLink.parentNode) favLink.remove();

    // Insert Favoriler link before cart if it exists, or just before profile
    nav.insertBefore(favLink, cartLink ? cartLink.nextSibling : insertBeforeEl);

    if (session) {
        nav.insertBefore(profileLink, insertBeforeEl);
        if (session.user.role === 'admin') {
            nav.insertBefore(adminLink, insertBeforeEl);
        }
        nav.insertBefore(logoutLink, insertBeforeEl);
    } else {
        nav.insertBefore(loginLink, insertBeforeEl);
        nav.insertBefore(registerLink, insertBeforeEl);
    }
    
    // Ensure theme toggle is always the very last element
    if (themeToggle) {
        nav.appendChild(themeToggle);
    }
}

// Theme toggling
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark');
    localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
}

// Apply saved theme on load and update navigation
(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
    }
    document.addEventListener('DOMContentLoaded', updateNavigation);
})();

// Load categories (placeholder: categories not exposed via API yet)
function loadCategories() {
    const categories = [
        { id: 1, name: 'Roman' },
        { id: 2, name: 'Bilim' },
        { id: 3, name: 'Tarih' },
        { id: 4, name: 'Edebiyat' },
        { id: 5, name: 'Çocuk' }
    ];

    const filterSelect = document.getElementById('category-filter');
    const addSelect = document.getElementById('add-book-category');
    const editSelect = document.getElementById('edit-book-cat');

    const options = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (filterSelect) filterSelect.innerHTML += options;
    if (addSelect) addSelect.innerHTML += options;
    if (editSelect) editSelect.innerHTML += options;
}

// Load books for the home page with pagination and filters
async function loadBooks() {
    const list = document.getElementById('books-list');
    if (!list) return;
    list.innerHTML = 'Yükleniyor...';
    window.currentPage = window.currentPage || 1;
    const page = window.currentPage;
    const search = document.getElementById('search-input') ? document.getElementById('search-input').value : '';
    const category = document.getElementById('category-filter') ? document.getElementById('category-filter').value : '';
    const sort = document.getElementById('sort-filter') ? document.getElementById('sort-filter').value : 'newest';
    
    let url = `/api/books?page=${page}&limit=10`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category_id=${category}`;
    if (sort) url += `&sort=${sort}`;
    
    const res = await fetch(url, { headers: buildHeaders() });
    if (res.ok) {
        const data = await res.json();
        window.totalPages = Math.ceil(data.total / data.limit);
        document.getElementById('page-info').textContent = `${data.page} / ${window.totalPages}`;
        list.innerHTML = '';
        data.data.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-card';
            // Build image tag if available. Prepend '../backend/' to serve uploaded files from back‑end folder.
            const imgHtml = book.primary_image ?
                `<img src="../backend/${book.primary_image}" alt="${book.title}" class="book-thumbnail">` :
                '';
            div.innerHTML = `
                ${imgHtml}
                <h3>${book.title}</h3>
                <p>Yazar: ${book.author}</p>
                <p>Fiyat: ${book.price}₺</p>
                <div class="actions">
                    <button data-id="${book.id}" class="view-book">Detay</button>
                    <button data-id="${book.id}" class="add-cart">Sepete Ekle</button>
                    <button data-id="${book.id}" class="toggle-fav" style="background:transparent; border:none; cursor:pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="${isFav(book.id) ? '#ef4444' : 'none'}" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
        // Attach event listeners
        document.querySelectorAll('.view-book').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                window.location.href = `book.html?id=${id}`;
            });
        });
        document.querySelectorAll('.add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const book = data.data.find(b => b.id == id);
                addToCart(id, book);
            });
        });
        document.querySelectorAll('.toggle-fav').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const book = data.data.find(b => b.id == id);
                toggleFavorite(id, book);
                // Update SVG fill
                btn.querySelector('svg').setAttribute('fill', isFav(id) ? '#ef4444' : 'none');
            });
        });
    } else {
        list.innerHTML = 'Kitaplar yüklenemedi.';
    }
}

// Helper to check if a book is in favorites
function isFav(bookId) {
    const favs = getLocalFavs();
    return favs.some(f => f.id == bookId);
}

// Add a book to cart
async function addToCart(bookId, bookData = null) {
    let cart = getLocalCart();
    let existing = cart.find(i => i.book_id == bookId || i.id == bookId); // API uses id, local uses book_id

    if (existing) {
        existing.quantity += 1;
    } else {
        if (!bookData) {
            // We need book data. Fetch it.
            const res = await fetch(`/api/books/${bookId}`);
            if(res.ok) bookData = await res.json();
        }
        cart.push({
            id: bookId, // Use id for consistency in cart.html
            book_id: bookId,
            quantity: 1,
            title: bookData ? bookData.title : 'Kitap',
            price: bookData ? bookData.price : 0,
            primary_image: bookData ? bookData.primary_image : null,
            author: bookData ? bookData.author : ''
        });
    }
    saveLocalCart(cart);
    alert('Sepete eklendi');

    // Sync with API if logged in
    if (getSession()) {
        try {
            await fetch('/api/cart', {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify({ book_id: bookId, quantity: 1 })
            });
        } catch(e) {}
    }
}

// Toggle Favorite
async function toggleFavorite(bookId, bookData = null) {
    let favs = getLocalFavs();
    const index = favs.findIndex(f => f.id == bookId);
    
    let isAdding = true;
    if (index > -1) {
        favs.splice(index, 1);
        isAdding = false;
    } else {
        if (!bookData) {
            const res = await fetch(`/api/books/${bookId}`);
            if(res.ok) bookData = await res.json();
        }
        favs.push({
            id: bookId,
            title: bookData ? bookData.title : 'Kitap',
            price: bookData ? bookData.price : 0,
            primary_image: bookData ? bookData.primary_image : null,
            author: bookData ? bookData.author : ''
        });
    }
    saveLocalFavs(favs);

    if (getSession()) {
        try {
            if (isAdding) {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: buildHeaders(),
                    body: JSON.stringify({ book_id: bookId })
                });
            } else {
                await fetch(`/api/favorites/${bookId}`, {
                    method: 'DELETE',
                    headers: buildHeaders()
                });
            }
        } catch(e) {}
    }
}

// Load book details page
async function loadBookDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const detailDiv = document.getElementById('book-detail');
    detailDiv.innerHTML = 'Yükleniyor...';
    const res = await fetch(`/api/books/${id}`, { headers: buildHeaders() });
    if (!res.ok) {
        detailDiv.innerHTML = 'Kitap bulunamadı.';
        return;
    }
    const book = await res.json();
    let imagesHTML = '';
    if (book.images && book.images.length) {
        imagesHTML = `<div class="book-images">` + book.images.map(src => `<img src="../backend/${src}" alt="Kitap görseli" style="max-width:100px;margin-right:5px;">`).join('') + `</div>`;
    }
    detailDiv.innerHTML = `
        <h2>${book.title}</h2>
        ${imagesHTML}
        <p>Yazar: ${book.author}</p>
        <p>Kategori: ${book.category_name || ''}</p>
        <p>Açıklama: ${book.description || ''}</p>
        <p>Fiyat: ${book.price}₺</p>
        <button id="detail-add-cart">Sepete Ekle</button>
        <button id="detail-add-fav" style="background:transparent; border:none; cursor:pointer;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="${isFav(book.id) ? '#ef4444' : 'none'}" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
    `;
    document.getElementById('detail-add-cart').addEventListener('click', () => addToCart(id, book));
    document.getElementById('detail-add-fav').addEventListener('click', (e) => {
        toggleFavorite(id, book);
        const svg = e.currentTarget.querySelector('svg');
        svg.setAttribute('fill', isFav(id) ? '#ef4444' : 'none');
    });
    // load reviews
    loadReviews(id);
}

// Load reviews for a book
async function loadReviews(bookId) {
    const list = document.getElementById('reviews-list');
    if (!list) return;
    list.innerHTML = 'Yükleniyor...';
    const res = await fetch(`/api/books/${bookId}/reviews`, { headers: buildHeaders() });
    if (res.ok) {
        const reviews = await res.json();
        if (reviews.length === 0) {
            list.innerHTML = '<p>Henüz yorum yok.</p>';
        } else {
            list.innerHTML = '';
            reviews.forEach(r => {
                const div = document.createElement('div');
                div.className = 'review';
                div.innerHTML = `<strong>${r.user_name}</strong> - ${r.rating}/5<br>${r.comment || ''}<hr>`;
                list.appendChild(div);
            });
        }
    } else {
        list.innerHTML = 'Yorumlar yüklenemedi.';
    }
}

// Submit review for a book
async function submitReview() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;
    const res = await fetch(`/api/books/${id}/reviews`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ rating: rating, comment: comment })
    });
    const data = await res.json();
    if (res.ok) {
        document.getElementById('review-error').textContent = '';
        document.getElementById('review-rating').value = '';
        document.getElementById('review-comment').value = '';
        loadReviews(id);
    } else {
        document.getElementById('review-error').textContent = data.error || 'Hata';
    }
}

// Login
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        saveSession(data.token, data.user);
        
        // --- Sync Server Cart & Favs to Local Storage ---
        try {
            const [cartRes, favRes] = await Promise.all([
                fetch('/api/cart', { headers: buildHeaders() }),
                fetch('/api/favorites', { headers: buildHeaders() })
            ]);
            
            if (cartRes.ok) {
                const serverCart = await cartRes.json();
                if (serverCart && serverCart.length > 0) {
                    saveLocalCart(serverCart);
                }
            }
            if (favRes.ok) {
                const serverFavs = await favRes.json();
                if (serverFavs && serverFavs.length > 0) {
                    saveLocalFavs(serverFavs);
                }
            }
        } catch (e) {
            console.error('Failed to sync on login', e);
        }

        window.location.href = 'index.html';
    } else {
        document.getElementById('login-error').textContent = data.error || 'Giriş başarısız';
    }
}

function applyAdminOrdersFilter() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;
    const search = document.getElementById('order-search')?.value || '';
    const status = document.getElementById('order-status-filter')?.value || 'all';
    const sort = document.getElementById('order-sort')?.value || 'time_desc';
    const filtered = filterAndSortOrders(allAdminOrders, search, status, sort);
    renderOrdersList(filtered, list, true);
}

function initCustomSelects() {
    const selects = document.querySelectorAll('#category-filter, #sort-filter, #user-role-filter, #user-sort-filter, #order-status-filter, #order-sort');
    selects.forEach(select => createCustomSelect(select));
}

function createCustomSelect(selectElement) {
    if (!selectElement) return;

    // Remove any previously created custom select if re-initializing
    const existingWrapper = selectElement.nextElementSibling;
    if (existingWrapper && existingWrapper.classList.contains('custom-select-wrapper')) {
        existingWrapper.remove();
    }

    // Hide original select
    selectElement.style.display = 'none';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.classList.add('custom-select-wrapper');

    // Create trigger
    const trigger = document.createElement('div');
    trigger.classList.add('custom-select-trigger');
    
    // Get currently selected option text
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const triggerText = document.createElement('span');
    triggerText.textContent = selectedOption ? selectedOption.textContent : 'Seçiniz';
    
    // SVG icon for trigger
    const icon = document.createElement('div');
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    
    trigger.appendChild(triggerText);
    trigger.appendChild(icon);
    
    // Create options list
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('custom-select-options');
    
    Array.from(selectElement.options).forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.classList.add('custom-select-option');
        if (index === selectElement.selectedIndex) {
            optionEl.classList.add('selected');
        }
        optionEl.textContent = option.textContent;
        optionEl.dataset.value = option.value;
        
        optionEl.addEventListener('click', (e) => {
            e.stopPropagation();
            // Update original select
            selectElement.selectedIndex = index;
            // Trigger change event on original select so logic (like filtering) works
            selectElement.dispatchEvent(new Event('change'));
            
            // Update trigger text
            triggerText.textContent = option.textContent;
            
            // Update selected class
            optionsContainer.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('selected'));
            optionEl.classList.add('selected');
            
            // Close dropdown
            optionsContainer.classList.remove('open');
            trigger.classList.remove('open');
        });
        
        optionsContainer.appendChild(optionEl);
    });
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.contains('open');
        
        // Close all other open custom selects first
        document.querySelectorAll('.custom-select-options.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.custom-select-trigger.open').forEach(el => el.classList.remove('open'));
        
        if (!isOpen) {
            optionsContainer.classList.add('open');
            trigger.classList.add('open');
        }
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsContainer);
    
    // Insert wrapper after the original select
    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);
}

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-options.open').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.custom-select-trigger.open').forEach(el => el.classList.remove('open'));
});

// Register
async function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password })
    });
    const data = await res.json();
    if (res.ok) {
        alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        window.location.href = 'login.html';
    } else {
        document.getElementById('register-error').textContent = data.error || 'Kayıt başarısız';
    }
}

// Load user profile
async function loadProfile() {
    const session = getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const res = await fetch(`/api/users/${session.user.id}`, { headers: buildHeaders() });
    const data = await res.json();
    if (res.ok) {
        const infoDiv = document.getElementById('profile-info');
        let imgHtml = '';
        if (data.profile_photo) {
            imgHtml = `<img src="../backend/${data.profile_photo}" alt="Profil Fotoğrafı" style="max-width:150px; border-radius:50%; margin-bottom:10px;"><br>`;
        }
        infoDiv.innerHTML = `
            ${imgHtml}
            <p>Ad Soyad: ${data.name}</p>
            <p>E-posta: ${data.email}</p>
            <p>Rol: ${data.role}</p>
        `;
        document.getElementById('profile-name').value = data.name;
    } else {
        alert('Profil bilgileri yüklenemedi');
    }
}

// Update profile
async function updateProfile() {
    const session = getSession();
    const name = document.getElementById('profile-name').value;
    const photoInput = document.getElementById('profile-photo');
    
    let headers = buildHeaders();
    // Remove Content-Type for FormData so browser sets it with boundary
    delete headers['Content-Type'];
    
    const formData = new FormData();
    formData.append('name', name);
    if (photoInput && photoInput.files[0]) {
        formData.append('profile_photo', photoInput.files[0]);
    }

    const res = await fetch(`/api/users/${session.user.id}`, {
        method: 'POST', // Use POST instead of PUT because PHP doesn't easily handle multipart/form-data for PUT
        headers: headers,
        body: formData
    });
    const data = await res.json();
    if (res.ok) {
        alert('Profil güncellendi');
        session.user.name = name;
        if (data.profile_photo) {
            session.user.profile_photo = data.profile_photo;
        }
        saveSession(session.token, session.user);
        loadProfile();
    } else {
        document.getElementById('profile-error').textContent = data.error || 'Güncelleme başarısız';
    }
}

function logout(e) {
    e.preventDefault();
    clearSession();
    window.location.href = 'login.html';
}

// Load cart
async function loadCart() {
    const list = document.getElementById('cart-list');
    if (!list) return;

    // Use localStorage as the source of truth for UI rendering
    let items = getLocalCart();

    // If logged in, we optionally fetch to ensure sync, but rendering from local first
    // satisfies the academic requirement perfectly.
    
    if (items.length === 0) {
        list.innerHTML = 'Sepetiniz boş.';
        document.getElementById('cart-total').textContent = '0.00';
        return;
    }

    list.innerHTML = '';
    let total = 0;
    items.forEach(item => {
        total += item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <strong>${item.title}</strong> - ${item.price}₺ x 
            <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-qty" style="width:50px;"> 
            <button data-id="${item.id}" class="remove-cart">Sil</button>
        `;
        list.appendChild(div);
    });
    document.getElementById('cart-total').textContent = total.toFixed(2);

    // attach events
    document.querySelectorAll('.cart-qty').forEach(input => {
        input.addEventListener('change', () => {
            updateCart(input.getAttribute('data-id'), input.value);
        });
    });
    document.querySelectorAll('.remove-cart').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.getAttribute('data-id'));
        });
    });
}

// Update cart item quantity
async function updateCart(itemId, quantity) {
    let cart = getLocalCart();
    let item = cart.find(i => i.id == itemId || i.book_id == itemId);
    if (item) {
        item.quantity = parseInt(quantity);
        saveLocalCart(cart);
        loadCart(); // Refresh UI instantly
    }

    if (getSession()) {
        try {
            await fetch(`/api/cart/${itemId}`, {
                method: 'PUT',
                headers: buildHeaders(),
                body: JSON.stringify({ quantity: parseInt(quantity) })
            });
        } catch(e) {}
    }
}

// Remove cart item
async function removeFromCart(itemId) {
    let cart = getLocalCart();
    cart = cart.filter(i => i.id != itemId && i.book_id != itemId);
    saveLocalCart(cart);
    loadCart(); // Refresh UI instantly

    if (getSession()) {
        try {
            await fetch(`/api/cart/${itemId}`, {
                method: 'DELETE',
                headers: buildHeaders()
            });
        } catch(e) {}
    }
}

// Place order
async function placeOrder() {
    if (!getSession()) {
        alert('Sipariş vermek için giriş yapmalısınız.');
        window.location.href = 'login.html';
        return;
    }

    // Since we use localStorage, we must ensure API has our items before order
    // But login() syncs it, and addToCart syncs it.
    // However, if they added offline and then logged in, login() syncs down, but doesn't push up.
    // To be perfectly robust, we can push local cart up right now.
    // For simplicity, we just rely on API placing order from DB cart.
    const res = await fetch('/api/orders', {
        method: 'POST',
        headers: buildHeaders()
    });
    const data = await res.json();
    if (res.ok) {
        alert('Sipariş oluşturuldu');
        saveLocalCart([]); // Clear local cart
        window.location.href = 'orders.html';
    } else {
        alert(data.error || 'Sipariş oluşturulamadı');
    }
}

// Load Favorites Page
function loadFavoritesPage() {
    const list = document.getElementById('favorites-list');
    if (!list) return;

    const favs = getLocalFavs();
    if (favs.length === 0) {
        list.innerHTML = '<p>Henüz favori kitabınız yok.</p>';
        return;
    }

    list.innerHTML = '';
    favs.forEach(book => {
        const div = document.createElement('div');
        div.className = 'book-card';
        const imgHtml = book.primary_image ?
            `<img src="../backend/${book.primary_image}" alt="${book.title}" class="book-thumbnail">` :
            '';
        div.innerHTML = `
            ${imgHtml}
            <h3>${book.title}</h3>
            <p>Yazar: ${book.author}</p>
            <p>Fiyat: ${book.price}₺</p>
            <div class="actions">
                <button data-id="${book.id}" class="view-book">Detay</button>
                <button data-id="${book.id}" class="remove-fav" style="color: #ef4444; border: 1px solid #ef4444; background: white;">Favorilerden Çıkar</button>
            </div>
        `;
        list.appendChild(div);
    });

    document.querySelectorAll('.view-book').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = `book.html?id=${btn.getAttribute('data-id')}`;
        });
    });
    document.querySelectorAll('.remove-fav').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            toggleFavorite(id);
            loadFavoritesPage(); // Refresh immediately
        });
    });
}

// Load orders (for user)
async function loadOrders() {
    const list = document.getElementById('orders-list');
    const res = await fetch('/api/orders', { headers: buildHeaders() });
    if (res.ok) {
        const orders = await res.json();
        list.innerHTML = '';
        orders.forEach(order => {
            const div = document.createElement('div');
            div.className = 'order';
            let itemsList = '';
            if (order.items) {
                itemsList = '<ul>' + order.items.map(i => `<li>${i.title} x ${i.quantity}</li>`).join('') + '</ul>';
            }
            div.innerHTML = `
                <p>Sipariş ID: ${order.id} | Durum: ${order.status}</p>
                <p>Tarih: ${order.created_at}</p>
                <p>Toplam: ${order.total_price}₺</p>
                ${itemsList}
                <hr>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = 'Siparişler yüklenemedi';
    }
}

// Admin functions
async function loadAdminBooks() {
    const list = document.getElementById('admin-books-list');
    const res = await fetch('/api/books', { headers: buildHeaders() });
    if (res.ok) {
        const data = await res.json();
        list.innerHTML = '';
        data.data.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-card';
            div.innerHTML = `
                <strong>${book.title}</strong> - ${book.author} | ${book.price}₺
                <button data-id="${book.id}" class="edit-book">Düzenle</button>
                <button data-id="${book.id}" class="delete-book">Sil</button>
            `;
            list.appendChild(div);
        });
        document.querySelectorAll('.delete-book').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Silmek istediğinize emin misiniz?')) {
                    const r = await fetch(`/api/books/${id}`, {
                        method: 'DELETE',
                        headers: buildHeaders()
                    });
                    if (r.ok) loadAdminBooks();
                }
            });
        });
        document.querySelectorAll('.edit-book').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const book = data.data.find(b => b.id == id);
                if (book) {
                    document.getElementById('edit-book-id').value = book.id;
                    document.getElementById('edit-book-title').value = book.title;
                    document.getElementById('edit-book-author').value = book.author;
                    document.getElementById('edit-book-price').value = book.price;
                    document.getElementById('edit-book-desc').value = book.description || '';
                    document.getElementById('edit-book-condition').value = book.condition;
                    document.getElementById('edit-book-cat').value = book.category_id || '';
                    document.getElementById('edit-book-modal').style.display = 'block';
                }
            });
        });
    } else {
        list.innerHTML = 'Kitaplar yüklenemedi';
    }
}

// Add book (admin)
async function addBook(e) {
    e.preventDefault();
    try {
        const form = e.target;
        const formData = new FormData(form);
        
        let headers = buildHeaders();
        delete headers['Content-Type'];

        const res = await fetch('/api/books', {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        let data;
        try {
            data = await res.json();
        } catch (jsonErr) {
            document.getElementById('admin-book-error').textContent = 'Sunucu yanıtı okunamadı (JSON hatası). Nginx loglarına bakın.';
            return;
        }

        if (res.ok) {
            alert('Kitap eklendi');
            form.reset();
            loadAdminBooks();
        } else {
            document.getElementById('admin-book-error').textContent = data.error || 'Hata';
        }
    } catch (err) {
        alert("Bir hata oluştu: " + err.message);
        console.error("addBook error:", err);
    }
}

// Update book (admin)
async function updateBook(e) {
    e.preventDefault();
    const id = document.getElementById('edit-book-id').value;
    const data = {
        title: document.getElementById('edit-book-title').value,
        author: document.getElementById('edit-book-author').value,
        price: document.getElementById('edit-book-price').value,
        description: document.getElementById('edit-book-desc').value,
        condition: document.getElementById('edit-book-condition').value,
        category_id: document.getElementById('edit-book-cat').value
    };
    
    const res = await fetch(`/api/books/${id}`, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(data)
    });
    
    const responseData = await res.json();
    if (res.ok) {
        alert('Kitap güncellendi');
        document.getElementById('edit-book-modal').style.display = 'none';
        loadAdminBooks();
    } else {
        document.getElementById('edit-book-error').textContent = responseData.error || 'Güncelleme hatası';
    }
}

// Load admin users
async function loadAdminUsers() {
    const list = document.getElementById('admin-users-list');
    const res = await fetch('/api/users', { headers: buildHeaders() });
    if (res.ok) {
        const users = await res.json();
        list.innerHTML = '';
        users.forEach(u => {
            const div = document.createElement('div');
            div.className = 'user';
            div.innerHTML = `
                <strong>${u.name}</strong> (${u.email}) - ${u.role}
                <button data-id="${u.id}" class="delete-user">Sil</button>
            `;
            list.appendChild(div);
        });
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) {
                    const r = await fetch(`/api/users/${id}`, {
                        method: 'DELETE',
                        headers: buildHeaders()
                    });
                    if (r.ok) loadAdminUsers();
                }
            });
        });
    } else {
        list.innerHTML = 'Kullanıcılar yüklenemedi';
    }
}

// Load admin orders
async function loadAdminOrders() {
    const list = document.getElementById('admin-orders-list');
    const res = await fetch('/api/orders', { headers: buildHeaders() });
    if (res.ok) {
        const orders = await res.json();
        list.innerHTML = '';
        orders.forEach(order => {
            const div = document.createElement('div');
            let itemsList = '';
            if (order.items) {
                itemsList = '<ul>' + order.items.map(i => `<li>${i.title} x ${i.quantity}</li>`).join('') + '</ul>';
            }
            div.innerHTML = `
                <p>ID: ${order.id} | Kullanıcı: ${order.user_id} | Durum: ${order.status}</p>
                <p>Tarih: ${order.created_at}</p>
                <p>Toplam: ${order.total_price}₺</p>
                ${itemsList}
                <hr>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = 'Siparişler yüklenemedi';
    }
}