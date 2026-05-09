CREATE TABLE IF NOT EXISTS weekly_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  week_number INT NOT NULL,
  week_label VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  total_transactions INT DEFAULT 0,
  peak_day VARCHAR(20),
  peak_hour VARCHAR(10),
  sales_data TEXT, -- JSON string
  peak_days_data TEXT, -- JSON string
  peak_hours_data TEXT, -- JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_week (week_number)
);
