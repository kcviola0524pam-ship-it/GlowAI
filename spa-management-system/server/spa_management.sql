CREATE DATABASE IF NOT EXISTS spa_management;
USE spa_management;

CREATE TABLE IF NOT EXISTS customer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  service VARCHAR(50) DEFAULT 'Nail Care',
  walked_in DATE DEFAULT CURRENT_DATE,
  visits INT DEFAULT 0,
  status ENUM('Active','Inactive') DEFAULT 'Active'
);


-- Checkins table 
CREATE TABLE IF NOT EXISTS checkins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);

INSERT INTO customer (name, service, walked_in, visits, status) VALUES
('Bill Torres','Nail Care','2025-08-12',18,'Active'),
('Jonas Sabile','Hair Care','2024-12-05',89,'Active'),
('Watsi Lee','Massage','2025-09-01',5,'Inactive');

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','staff','customer') DEFAULT 'customer'
);


CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
