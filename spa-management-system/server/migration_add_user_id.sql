-- Migration: Add user_id column to customer table
-- This links customer records to user accounts
-- Run this SQL to add the user_id column to your customer table

ALTER TABLE customer 
ADD COLUMN user_id INT NULL,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- After running this migration, existing customers can be linked to users by updating:
-- UPDATE customer c 
-- INNER JOIN users u ON c.name = u.name 
-- SET c.user_id = u.id 
-- WHERE u.role = 'customer';

