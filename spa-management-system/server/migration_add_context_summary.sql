-- Migration: Add context_summary column to ai_chat_sessions table
-- Run this if you get "Unknown column 'context_summary'" error

USE spa_management;

-- Check if column exists, if not add it
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'spa_management' 
    AND TABLE_NAME = 'ai_chat_sessions' 
    AND COLUMN_NAME = 'context_summary'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ai_chat_sessions ADD COLUMN context_summary TEXT NULL AFTER session_data',
    'SELECT "Column context_summary already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ context_summary column exists'
        ELSE '❌ context_summary column does NOT exist'
    END as status
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'spa_management' 
AND TABLE_NAME = 'ai_chat_sessions' 
AND COLUMN_NAME = 'context_summary';

