-- Simple Migration: Add context_summary column to ai_chat_sessions table
-- Run this if you get "Unknown column 'context_summary'" error
-- This will add the column. If it already exists, you'll get an error which is fine.

USE spa_management;

-- Add context_summary column
ALTER TABLE ai_chat_sessions 
ADD COLUMN context_summary TEXT NULL 
AFTER session_data;

