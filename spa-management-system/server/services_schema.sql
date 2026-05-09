-- Services table for AI recommendations
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'General',
  price DECIMAL(10,2) DEFAULT 0.00,
  duration_minutes INT DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service recommendations mapping (for AI to learn patterns)
CREATE TABLE IF NOT EXISTS service_recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  service_id INT NOT NULL,
  recommendation_score DECIMAL(5,2) DEFAULT 0.00,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Sample services (only insert if they don't exist)
INSERT IGNORE INTO services (name, description, category, price, duration_minutes) VALUES
('Manicure', 'Professional nail care and polish', 'Nail Care', 25.00, 45),
('Pedicure', 'Foot care and nail treatment', 'Nail Care', 35.00, 60),
('Haircut', 'Professional haircut and styling', 'Hair Care', 30.00, 45),
('Hair Color', 'Full hair coloring service', 'Hair Care', 80.00, 120),
('Facial Treatment', 'Deep cleansing facial', 'Skincare', 60.00, 90),
('Massage Therapy', 'Relaxing full body massage', 'Wellness', 70.00, 60),
('Waxing', 'Hair removal service', 'Beauty', 40.00, 30),
('Eyebrow Threading', 'Precision eyebrow shaping', 'Beauty', 20.00, 15);

