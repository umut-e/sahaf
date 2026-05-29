#!/bin/bash
cp scratch/recovered_files/frontend_assets_css_style.css frontend/assets/css/style.css
cp scratch/recovered_files/frontend_assets_js_main.js frontend/assets/js/main.js
cp scratch/recovered_files/frontend_index.html frontend/index.html
cp scratch/recovered_files/backend_models_Book.php backend/models/Book.php
cp scratch/recovered_files/backend_controllers_BookController.php backend/controllers/BookController.php
cp scratch/recovered_files/backend_index.php backend/index.php
cp scratch/recovered_files/backend_schema.sql backend/schema.sql
cp scratch/recovered_files/router.php router.php
cp scratch/recovered_files/backend_models_Order.php backend/models/Order.php
cp scratch/recovered_files/backend_controllers_UserController.php backend/controllers/UserController.php
cp scratch/recovered_files/backend_controllers_OrderController.php backend/controllers/OrderController.php
cp scratch/recovered_files/frontend_admin_orders.html frontend/admin/orders.html
cp scratch/recovered_files/frontend_admin_users.html frontend/admin/users.html

python3 restore_transcript.py
