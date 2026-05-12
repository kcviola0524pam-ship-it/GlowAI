import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
      const res = await axios.get(`${API_BASE_URL}/api/chat/session/${user.id}`);
      setSessionId(res.data.id);

      if (res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
      } else {
        const greeting = isAdmin
          ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
          : "Hi! I'm your AI spa assistant. How can I help you today?";
        setMessages([
          {
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error initializing chat:', err);
      try {
        const res = await axios.post(`${API_BASE_URL}/api/chat/new`, {
          userId: user.id,
        });
        setSessionId(res.data.id);
        const greeting = isAdmin
          ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
          : "Hi! I'm your AI spa assistant. How can I help you today?";
        setMessages(
          res.data.messages || [
            {
              role: 'assistant',
              content: res.data.message || greeting,
              timestamp: new Date().toISOString(),
            },
          ]
        );
      } catch (createErr) {
        console.error('Error creating new session:', createErr);
        const errorMsg = isAdmin
          ? 'Unable to initialize business analytics chat. Please try again.'
          : 'Sorry, I encountered an error initializing the chat. Please try again.';
        setMessages([
          {
            role: 'assistant',
            content: errorMsg,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/message`, {
        sessionId,
        userId: user.id,
        message: userMessage.content,
      });

      const aiMessage = {
        role: 'assistant',
        content: res.data.message,
        timestamp: res.data.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (res.data.bookingSuccess && res.data.appointment && onAppointmentBooked) {
        setTimeout(() => {
          onAppointmentBooked();
        }, 500);
      }

      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = {
        role: 'assistant',
        content:
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat/new`, {
        userId: user.id,
      });
      setSessionId(res.data.id);
      setRecommendations(null);
      const greeting = isAdmin
        ? "Hello! I'm your business intelligence assistant. I can analyze your spa's data and provide actionable insights to improve operations. What would you like to know?"
        : "Hi! I'm your AI spa assistant. How can I help you today?";
      setMessages(
        res.data.messages || [
          {
            role: 'assistant',
            content: res.data.message || greeting,
            timestamp: new Date().toISOString(),
          },
        ]
      );
      if (onRecommendations) {
        onRecommendations(null);
      }
    } catch (err) {
      console.error('Error starting new chat:', err);
      setMessages([
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error starting a new chat. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const bubbleLabel = isAdmin ? 'Open business intelligence chat' : 'Open GlamAI chat';

  return createPortal(
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={bubbleLabel}
          title={bubbleLabel}
          className={`fixed z-[100] flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg ring-2 ring-white/40 transition-transform duration-200 hover:scale-105 active:scale-95 ${
            isAdmin
              ? 'bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
              : 'bg-gradient-to-br from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700'
          }`}
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            right: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {isAdmin ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            )}
          </svg>
          <span
            className="pointer-events-none absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden="true"
          />
        </button>
      )}

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close chat"
            className="fixed inset-0 z-[90] bg-black/45 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isAdmin ? 'Business intelligence chat' : 'GlamAI chat'}
            className="fixed z-[100] flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[88vh] max-sm:rounded-t-3xl sm:left-auto sm:max-h-[min(600px,85vh)] sm:w-[min(24rem,calc(100vw-2rem))] sm:rounded-2xl sm:shadow-2xl sm:bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:right-[max(1.25rem,env(safe-area-inset-right,0px))]"
          >
            <div
              className={`${isAdmin ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-blue-600 to-green-600'} flex shrink-0 items-center justify-between gap-2 rounded-t-3xl p-3 text-white sm:rounded-t-2xl`}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                    {isAdmin ? (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold sm:text-base">
                      {isAdmin ? 'Business Intelligence' : 'Glam recommendations'}
                    </h3>
                    <p className="truncate text-xs text-white/80">
                      {isAdmin ? 'Data-driven insights' : 'Your wellness partner'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    title="Start new chat"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    title="Close chat"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[min(100%,20rem)] rounded-2xl px-4 py-2 sm:max-w-[85%] ${
                        msg.role === 'user'
                          ? isAdmin
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-green-600 text-white'
                          : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      }`}
                    >
                      <p className="break-words text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="mb-4 flex justify-start">
                    <div className="rounded-2xl bg-gray-100 px-4 py-2 dark:bg-gray-700">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="shrink-0 border-t border-gray-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] dark:border-gray-700 sm:p-4"
              >
                {recommendations && recommendations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/20 px-3 py-2 text-xs text-blue-800 transition-colors hover:bg-blue-500/30 dark:text-blue-200 sm:text-sm"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Start New Consultation
                  </button>
                )}
                <div className="flex min-w-0 gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-base dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:px-4"
                    disabled={loading}
                    enterKeyHint="send"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className={`shrink-0 rounded-xl px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${
                      isAdmin
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                        : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700'
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
