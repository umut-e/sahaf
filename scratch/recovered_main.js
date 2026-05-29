Created At: 2026-05-29T08:49:57Z
Completed At: 2026-05-29T08:49:57Z
File Path: `file:///home/w4zel/sahaf_app/frontend/assets/js/main.js`
Total Lines: 1122
Total Bytes: 45549
Showing lines 1 to 800
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: // Utility functions and page controllers for the Sahaf front‑end.
2: 
3: // Get stored user session from localStorage
4: function getSession() {
5:     const token = localStorage.getItem('token');
6:     const user = localStorage.getItem('user');
7:     return token && user ? { token, user: JSON.parse(user) } : null;
8: }
9: 
10: // Save session information
11: function saveSession(token, user) {
12:     localStorage.setItem('token', token);
13:     localStorage.setItem('user', JSON.stringify(user));
14: }
15: 
16: // Clear session
17: function clearSession() {
18:     localStorage.removeItem('token');
19:     localStorage.removeItem('user');
20: }
21: 
22: // --- LocalStorage Logic for Cart & Favorites ---
23: function getLocalCart() {
24:     return JSON.parse(localStorage.getItem('cart')) || [];
25: }
26: 
27: function saveLocalCart(cart) {
28:     localStorage.setItem('cart', JSON.stringify(cart));
29: }
30: 
31: function getLocalFavs() {
32:     return JSON.parse(localStorage.getItem('favorites')) || [];
33: }
34: 
35: function saveLocalFavs(favs) {
36:     localStorage.setItem('favorites', JSON.stringify(favs));
37: }
38: 
39: // Build headers for API requests including authentication
40: function buildHeaders() {
41:     const session = getSession();
42:     const headers = { 'Content-Type': 'application/json' };
43:     if (session) {
44:         // Pass user id and role in custom headers. In production use Authorization
45:         headers['X-User-Id'] = session.user.id;
46:         headers['X-User-Role'] = session.user.role;
47:         headers['Authorization'] = 'Be
<truncated 31139 bytes>
.sort((a, b) => {
757:             let valA, valB;
758:             if (field === 'price') {
759:                 valA = parseFloat(a.total_price);
760:                 valB = parseFloat(b.total_price);
761:             } else {
762:                 valA = new Date(a.created_at).getTime();
763:                 valB = new Date(b.created_at).getTime();
764:             }
765:             if (dir === 'asc') return valA - valB;
766:             return valB - valA;
767:         });
768:     }
769: 
770:     return result;
771: }
772: 
773: function renderOrdersList(orders, listElement, isAdmin) {
774:     listElement.innerHTML = '';
775:     if (!orders || orders.length === 0) {
776:         listElement.innerHTML = '<p style="color:var(--text-muted); padding:1rem 0; font-size:1.1rem; text-align:center; background:rgba(255,255,255,0.05); border-radius:var(--radius-md);">Şu an hiç sipariş yok.</p>';
777:         return;
778:     }
779:     
780:     orders.forEach(order => {
781:         const div = document.createElement('div');
782:         div.className = 'order-card';
783:         
784:         const statusMap = {
785:             'pending': 'Onay Bekliyor',
786:             'completed': 'Tamamlandı',
787:             'cancelled': 'İptal Edildi',
788:             'user_cancelled': 'Kullanıcı Tarafından İptal Edildi'
789:         };
790:         const statusText = statusMap[order.status] || order.status;
791: 
792:         const orderDate = new Date(order.created_at).toLocaleString('tr-TR', {
793:             year: 'numeric', month: 'long', day: 'numeric',
794:             hour: '2-digit', minute: '2-digit'
795:         });
796: 
797:         let itemsList = '';
798:         if (order.items && order.items.length > 0) {
799:             itemsList = '<ul class="order-items-list">' + 
800:                 order.items.map(i => {
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
