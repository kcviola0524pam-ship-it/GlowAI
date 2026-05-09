# Chatbot Troubleshooting Guide

## Error: 500 Internal Server Error

If you're getting a 500 error when trying to use the chatbot, follow these steps:

### Step 1: Check Server Console

The server console will show detailed error messages. Look for:
- Database connection errors
- Table not found errors (ER_NO_SUCH_TABLE)
- SQL syntax errors

### Step 2: Verify Database Tables Exist

Run this SQL query to check if tables exist:

```sql
USE spa_management;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'spa_management' 
AND table_name IN ('ai_chat_sessions', 'ai_chat_messages', 'ai_customer_analysis');
```

Or use the provided check script:
```powershell
Get-Content check_chat_tables.sql | mysql -u root spa_management
```

### Step 3: Create Missing Tables

If tables don't exist, run the schema file:

**PowerShell:**
```powershell
Get-Content ai_chat_schema.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root spa_management
```

**Or use MySQL Workbench/phpMyAdmin:**
1. Open MySQL Workbench
2. Connect to your database
3. Select `spa_management` database
4. File → Open SQL Script → Select `ai_chat_schema.sql`
5. Execute the script

### Step 4: Check Database Connection

Verify your database connection in `config/db.js`:
- Host: localhost
- User: root
- Password: (empty or your password)
- Database: spa_management

### Step 5: Check Server Logs

Look at the server console output when you try to use the chatbot. The error message will tell you:
- What table is missing
- What SQL error occurred
- Connection issues

### Common Errors

#### Error: "ER_NO_SUCH_TABLE"
**Solution:** Run `ai_chat_schema.sql` to create the tables

#### Error: "ER_ACCESS_DENIED"
**Solution:** Check database credentials in `config/db.js`

#### Error: "ECONNREFUSED"
**Solution:** Make sure MySQL is running

#### Error: "Cannot find module 'axios'"
**Solution:** Run `npm install` in the server directory

### Step 6: Test the API Directly

Test the chat API endpoint directly:

```powershell
# Test creating a new session
$body = @{
    userId = 1
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/chat/new" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Replace `userId = 1` with an actual user ID from your database.

### Step 7: Verify Ollama is Running

The chatbot needs Ollama to be running:

```powershell
curl http://localhost:11434/api/tags
```

If this fails, start Ollama:
```powershell
ollama serve
```

## Still Having Issues?

1. Check the server console for the exact error message
2. Verify all database tables exist
3. Check that MySQL is running
4. Ensure Ollama is running (for AI responses)
5. Verify npm dependencies are installed (`npm install`)

## Getting Help

When reporting issues, include:
- The exact error message from the server console
- Whether database tables exist
- Whether Ollama is running
- The response from the API endpoint test

