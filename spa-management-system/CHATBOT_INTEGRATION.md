# Chatbot Integration with Ollama - Implementation Summary

## Overview

Your chatbot has been successfully integrated with Ollama and connected to your backend system. The chatbot now:
- Fetches data from your system (services, appointments, customer data)
- Stores context per user in the database
- Retains context even after logout/login

## What Was Implemented

### 1. Database Schema Updates
- **Updated `ai_chat_sessions` table**: Added `context_summary` field
- **New `ai_chat_messages` table**: Stores individual messages for context retention
- Messages are linked to sessions and users for proper isolation

### 2. Ollama Service Integration
- **New file**: `server/services/ollama.js`
- Handles communication with Ollama API
- Builds system prompts with context from your database
- Includes user info, customer data, services, and appointment history

### 3. New Chat API Routes
- **New file**: `server/routes/chat.js`
- `GET /api/chat/session/:userId` - Get or create chat session
- `POST /api/chat/message` - Send message and get AI response
- `POST /api/chat/new` - Start new chat session

### 4. Frontend Updates
- **Updated**: `client/src/components/AIChat.jsx`
- Now uses the new `/api/chat` endpoints
- Automatically loads conversation history on login
- Context persists across sessions

## Setup Instructions

### Step 1: Install Ollama
1. Download from https://ollama.ai
2. Install and start Ollama service
3. Pull a model: `ollama pull llama3.2`

### Step 2: Update Database

**For PowerShell (Windows):**
```powershell
cd server
# Option 1: Use the provided script (update MySQL path in run_schema.ps1 first)
.\run_schema.ps1

# Option 2: Use full path to MySQL
Get-Content ai_chat_schema.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root spa_management
```

**For Bash/Linux/Mac:**
```bash
cd server
mysql -u root spa_management < ai_chat_schema.sql
```

**Alternative:** Use MySQL Workbench or phpMyAdmin to open and run `ai_chat_schema.sql` manually.

### Step 3: Install Dependencies
```bash
cd server
npm install
```

### Step 4: Configure (Optional)
Create `server/.env`:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Step 5: Start Services
1. Start Ollama: `ollama serve`
2. Start backend: `npm start` (in server directory)

## How It Works

1. **User Login**: When a user logs in, the frontend loads their chat session
2. **Message Flow**:
   - User sends message → Saved to database
   - Backend fetches:
     - User information
     - Customer data (if linked)
     - Customer preferences/analysis
     - Available services
     - Recent appointments
   - Context is built and sent to Ollama
   - Response is saved to database
   - Response is returned to frontend

3. **Context Retention**:
   - All messages are stored in `ai_chat_messages` table
   - Last 20 messages are used for context
   - Context is automatically loaded on session retrieval

## Features

✅ **Per-User Context**: Each user has isolated chat history  
✅ **Database Persistence**: Context survives logout/login  
✅ **System Data Integration**: Chatbot knows about services, appointments, customers  
✅ **Smart Context**: Uses customer preferences and history for better responses  
✅ **Error Handling**: Graceful fallbacks if Ollama is unavailable  

## API Endpoints

### Get/Create Session
```
GET /api/chat/session/:userId
Response: { id, messages[], contextSummary }
```

### Send Message
```
POST /api/chat/message
Body: { sessionId, userId, message }
Response: { message, sessionId, timestamp }
```

### New Session
```
POST /api/chat/new
Body: { userId }
Response: { id, message, messages[] }
```

## Testing

1. Start Ollama and backend server
2. Login to the application
3. Open the chatbot (floating button)
4. Send a message - it should respond using Ollama
5. Logout and login again - context should be retained

## Troubleshooting

See `server/OLLAMA_SETUP.md` for detailed troubleshooting guide.

## Notes

- The chatbot uses the last 20 messages for context to avoid token limits
- Customer data is only included if the user is linked to a customer record
- System data (services, etc.) is always available to the chatbot
- Context is user-specific and secure

