import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function AIChat({ customerId, onRecommendations, isAdmin = false, onAppointmentBooked }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !sessionId) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = async () => {
    try {
      // Get existing session or create new one
      const res = await axios.get(`${API_BASE_URL}/api/chat/session/${user.id}`);
      setSessionId(res.data.id);
      
      // Load messages from session (context is retained from database)
      if (res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
      } else {
        // Fallback: should not happen, but handle gracefully
        const greeting = isAdmin 
          ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
          : "Hi! I'm your AI spa assistant. How can I help you today?";
        const initialMessage = {
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString()
        };
        setMessages([initialMessage]);
      }
    } catch (err) {
      console.error('Error initializing chat:', err);
      // Fallback: create new session
      try {
        const res = await axios.post(`${API_BASE_URL}/api/chat/new`, {
          userId: user.id
        });
        setSessionId(res.data.id);
        const greeting = isAdmin 
          ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
          : "Hi! I'm your AI spa assistant. How can I help you today?";
        setMessages(res.data.messages || [{
          role: 'assistant',
          content: res.data.message || greeting,
          timestamp: new Date().toISOString()
        }]);
      } catch (createErr) {
        console.error('Error creating new session:', createErr);
        // Show error message to user
        const errorMsg = isAdmin
          ? 'Unable to initialize business analytics chat. Please try again.'
          : 'Sorry, I encountered an error initializing the chat. Please try again.';
        setMessages([{
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send message to Ollama-integrated chat API
      const res = await axios.post(`${API_BASE_URL}/api/chat/message`, {
        sessionId,
        userId: user.id,
        message: userMessage.content
      });

      const aiMessage = {
        role: 'assistant',
        content: res.data.message,
        timestamp: res.data.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // If appointment was booked successfully, trigger refresh
      if (res.data.bookingSuccess && res.data.appointment && onAppointmentBooked) {
        console.log('Appointment booked successfully, refreshing appointments...');
        setTimeout(() => {
          onAppointmentBooked();
        }, 500);
      }

      // Focus input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = {
        role: 'assistant',
        content: err.response?.data?.message || err.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/new`, {
        userId: user.id
      });
      setSessionId(res.data.id);
      setRecommendations(null);
      const greeting = isAdmin 
        ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
        : "Hi! I'm your AI spa assistant. How can I help you today?";
      setMessages(res.data.messages || [{
        role: 'assistant',
        content: res.data.message || greeting,
        timestamp: new Date().toISOString()
      }]);
      if (onRecommendations) {
        onRecommendations(null);
      }
    } catch (err) {
      console.error('Error starting new chat:', err);
      // Show error message
      setMessages([{
        role: 'assistant',
        content: 'Sorry, I encountered an error starting a new chat. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 ${isAdmin ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700'} text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50 flex items-center gap-2 group`}
          title={isAdmin ? "Business Intelligence Assistant" : "Chat with GlamAI"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isAdmin ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            )}
          </svg>
          <span className="hidden sm:inline font-semibold">{isAdmin ? 'BI Assistant' : 'GlamAI'}</span>
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 z-50 animate-fadeIn">
          {/* Header */}
          <div className={`${isAdmin ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-green-600'} text-white p-4 rounded-t-2xl flex justify-between items-center`}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                {isAdmin ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-semibold">{isAdmin ? 'Business Intelligence' : 'Glam recommendations'}</h3>
                <p className="text-xs text-white/80">{isAdmin ? 'Data-driven insights' : 'Your wellness partner'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartNew}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="Start new chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? isAdmin 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-700">
            {recommendations && recommendations.length > 0 && (
              <button
                type="button"
                onClick={handleStartNew}
                className="w-full mb-3 text-xs sm:text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start New Consultation
              </button>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`${isAdmin ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700'} text-white px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

