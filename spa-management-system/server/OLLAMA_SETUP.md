# Ollama Integration Setup Guide

This guide will help you set up Ollama integration with your spa management system chatbot.

## Prerequisites

1. **Install Ollama**
   - Download and install Ollama from: https://ollama.ai
   - Follow the installation instructions for your operating system

2. **Install a Model**
   - After installing Ollama, download a model. Recommended models:
     ```bash
     ollama pull llama3.2
     # or
     ollama pull mistral
     # or
     ollama pull phi3
     ```

## Configuration

1. **Environment Variables** (Optional)
   - Create or update `.env` file in the `server` directory:
     ```
     OLLAMA_BASE_URL=http://localhost:11434
     OLLAMA_MODEL=llama3.2
     ```
   - Default values are used if not specified:
     - `OLLAMA_BASE_URL`: `http://localhost:11434`
     - `OLLAMA_MODEL`: `llama3.2`

2. **Database Setup**
   - Run the updated `ai_chat_schema.sql` to create the necessary tables:
   
   **For PowerShell (Windows):**
   ```powershell
   # Option 1: Use the provided script (update MySQL path first)
   .\run_schema.ps1
   
   # Option 2: Use full path to MySQL
   Get-Content ai_chat_schema.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root spa_management
   
   # Option 3: If MySQL is in PATH
   Get-Content ai_chat_schema.sql | mysql -u root spa_management
   ```
   
   **For Bash/Linux/Mac:**
   ```bash
   mysql -u root spa_management < ai_chat_schema.sql
   ```
   
   **Alternative:** Use MySQL Workbench or phpMyAdmin to run the SQL file manually.

3. **Install Dependencies**
   - Install the new axios dependency:
     ```bash
     cd server
     npm install
     ```

## Starting the Services

1. **Start Ollama**
   - Make sure Ollama is running:
     ```bash
     ollama serve
     ```
   - Or start it as a service (varies by OS)

2. **Start the Backend Server**
   ```bash
   cd server
   npm start
   # or for development
   npm run dev
   ```

## Testing the Integration

1. **Test Ollama Connection**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   This should return a list of available models.

2. **Test Chat API**
   - Use the frontend chatbot component
   - Or test via API:
     ```bash
     curl -X POST http://localhost:5000/api/chat/message \
       -H "Content-Type: application/json" \
       -d '{
         "sessionId": 1,
         "userId": 1,
         "message": "Hello, what services do you offer?"
       }'
     ```

## Features

- **Context Retention**: Chat history is stored in the database and persists across sessions
- **User-Specific Context**: Each user has their own chat history and context
- **System Data Integration**: The chatbot has access to:
  - User information
  - Customer data and preferences
  - Available services
  - Appointment history
  - Customer analysis data

## Troubleshooting

1. **Ollama Connection Error**
   - Ensure Ollama is running: `ollama serve`
   - Check if the port 11434 is accessible
   - Verify the model is installed: `ollama list`

2. **Database Errors**
   - Ensure the database tables are created
   - Check database connection in `config/db.js`
   - Verify user permissions

3. **Model Not Found**
   - Pull the model: `ollama pull llama3.2`
   - Or change `OLLAMA_MODEL` in `.env` to an installed model

## API Endpoints

- `GET /api/chat/session/:userId` - Get or create chat session
- `POST /api/chat/message` - Send a message and get AI response
- `POST /api/chat/new` - Start a new chat session

## Notes

- The chatbot uses the last 20 messages for context
- Context is automatically loaded when a user logs in
- Each user's chat history is isolated and secure

