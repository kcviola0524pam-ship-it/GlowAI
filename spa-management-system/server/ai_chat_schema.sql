-- AI Chat Sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  user_id INT NOT NULL,
  session_data TEXT, -- JSON string storing conversation and preferences
  context_summary TEXT, -- Summary of conversation context for Ollama
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- AI Chat Messages table - stores individual messages for context retention
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_user (session_id, user_id),
  INDEX idx_user_created (user_id, created_at)
);

-- AI Customer Analysis table - stores learned patterns and preferences
CREATE TABLE IF NOT EXISTS ai_customer_analysis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  user_id INT NULL,
  preferred_categories JSON, 
  preferred_services JSON, 
  average_price_range DECIMAL(10,2), 
  average_duration INT, 
  gender_preference VARCHAR(20) NULL, 
  booking_frequency VARCHAR(20) NULL, 
  last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  analysis_metadata JSON, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_customer (customer_id)
);

