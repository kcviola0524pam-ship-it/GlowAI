-- Staff Ratings and Reviews table
CREATE TABLE IF NOT EXISTS staff_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  customer_id INT NOT NULL,
  appointment_id INT NULL, -- Link to the appointment that was completed
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  UNIQUE KEY unique_staff_customer_appointment (staff_id, customer_id, appointment_id),
  INDEX idx_staff_id (staff_id),
  INDEX idx_customer_id (customer_id)
);
