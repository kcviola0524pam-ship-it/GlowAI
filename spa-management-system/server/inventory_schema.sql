-- Inventory and POS System Tables

-- Products/Inventory table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'General',
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0.00,
  stock_quantity INT DEFAULT 0,
  min_stock_level INT DEFAULT 10,
  sku VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sales/Transactions table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NULL,
  staff_id INT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('Cash', 'Card', 'Digital') DEFAULT 'Cash',
  status ENUM('Completed', 'Pending', 'Cancelled') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL
);

-- Sale Items table (products sold in each transaction)
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Sample products
INSERT INTO products (name, description, category, price, cost, stock_quantity, min_stock_level, sku) VALUES
('Nail Polish - Red', 'Premium red nail polish', 'Nail Care', 15.99, 8.00, 50, 10, 'NP-RED-001'),
('Hair Shampoo', 'Professional hair shampoo', 'Hair Care', 25.99, 12.00, 30, 5, 'HS-PRO-001'),
('Face Mask', 'Hydrating face mask', 'Skincare', 35.99, 18.00, 20, 5, 'FM-HYD-001'),
('Hair Conditioner', 'Deep conditioning treatment', 'Hair Care', 28.99, 14.00, 25, 5, 'HC-DEEP-001'),
('Nail File Set', 'Professional nail file set', 'Nail Care', 12.99, 6.00, 40, 10, 'NF-SET-001');

