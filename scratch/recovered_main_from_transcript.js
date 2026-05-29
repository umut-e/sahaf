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
    const page = window.currentPage || 1;
    const search = document.getElementById('search-input') ? document.getElementById('search-input').value : '';
    const category = document.getElementById('category-filter') ? document.getElementById('category-filter').value : '';
    let url = `/api/books?page=${page}&limit=10`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category_id=${category}`;
    const res = await fetch(url, { headers: buildHeaders() });
    if (res.ok) {
        
        window.totalPages = Math.ceil(data.total / data.limit);
        document.getElementById('page-info').textContent = `${data.page} / ${window.totalPages}`;
        list.innerHTML = '';
        data.data.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-card';
            // Build image tag if available. Prepend '../backend/' to serve uploaded files from back‑end folder.
            const imgHtml = book.primary_image ?
            const imgHtml = primary_image ?
                `<img src="../backend/${primary_image}" alt="${book.title}" class="book-thumbnail">` :
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

        if (data.user && data.user.role === 'admin') {
            window.location.href = 'admin/users.html';
        } else {
            window.location.href = 'index.html';
        }
    } else {
        document.getElementById('login-error').textContent = data.error || 'Giriş başarısız';
    }
}

// Register
async function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const res = await fetch('/api/register', {
        method: 'POST',
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

// Register
async function register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const res = await fetch('/api/register', {
        method: 'POST',











































































































































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
        if (data.user && data.user.role === 'admin') {
            window.location.href = 'admin/users.html';
        } else {
            window.location.href = 'index.html';
        }
    } else {
        alert(data.error || 'Sipariş oluşturulamadı');
    }
}

// Load Favorites Page
function loadFavoritesPage() {
    const list = document.getElementById('favorites-list');
    if (!list) return;

    const favs = getLocalFavs();
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












let allUserOrders = [];
let allAdminOrders = [];

function filterAndSortOrders(orders, search, status, sortStr) {
    let result = [...orders];

    if (search) {
        search = search.toLowerCase();
        result = result.filter(o => 
            o.id.toString().includes(search) || 
            (o.user_name && o.user_name.toLowerCase().includes(search)) || 
            (o.items && o.items.some(i => i.title.toLowerCase().includes(search)))
        );
    }

    if (status && status !== 'all') {
        result = result.filter(o => o.status === status);
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
       
                showConfirmModal('Siparişinizi iptal etmek istediğinize emin misiniz?', async () => {
                    try {
                        const res = await fetch(`/api/orders/${orderId}`, {
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
        });
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                showConfirmModal('Kullanıcıyı silmek istediğinize emin misiniz?', async () => {
                    const r = await fetch(`/api/users/${id}`, {
                        method: 'DELETE',
                        headers: buildHeaders()
                    });
                    if (r.ok) loadAdminUsers();
                });
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
    if (!list) return;

    const res = await fetch('/api/orders', { headers: buildHeaders() });
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

