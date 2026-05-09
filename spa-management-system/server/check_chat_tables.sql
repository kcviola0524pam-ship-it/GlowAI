-- Check if chat tables exist
-- Run this to verify your database has the required tables

USE spa_management;

-- Check ai_chat_sessions table
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ai_chat_sessions table exists'
        ELSE '❌ ai_chat_sessions table does NOT exist'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'spa_management' 
AND table_name = 'ai_chat_sessions';

-- Check ai_chat_messages table
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ai_chat_messages table exists'
        ELSE '❌ ai_chat_messages table does NOT exist'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'spa_management' 
AND table_name = 'ai_chat_messages';

-- Check ai_customer_analysis table
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ai_customer_analysis table exists'
        ELSE '❌ ai_customer_analysis table does NOT exist'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'spa_management' 
AND table_name = 'ai_customer_analysis';

-- Show all chat-related tables
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'spa_management' 
AND table_name LIKE 'ai_%'
ORDER BY table_name;

