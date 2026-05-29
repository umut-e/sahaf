-- SQL schema for the second‑hand book store application (sahaf). This file
-- creates tables with relationships, indexes and constraints. Use a tool
-- like phpMyAdmin or the MySQL client to run it.

CREATE DATABASE IF NOT EXISTS sahaf_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sahaf_db;

-- Users table stores all registered users. Role can be 'admin' or 'user'.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE DEFAULT NULL,
    phone_number VARCHAR(20) UNIQUE DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_photo VARCHAR(255) DEFAULT NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    address TEXT DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    district VARCHAR(100) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Categories table for grouping books.
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Books table. Each book belongs to a category and optionally records who added it.
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    `condi























































-- Reviews table: users rate and comment on books.
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_book_review (user_id, book_id)
) ENGINE=InnoDB;

-- Favorites table: users mark books as favourites.
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_user_book_fav (user_id, book_id)
) ENGINE=InnoDB;

-- Notifications table: messages for users.
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Review likes table: tracks which users liked which reviews.
CREATE TABLE IF NOT EXISTS review_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_review_like (review_id, user_id)
) ENGINE=InnoDB;


