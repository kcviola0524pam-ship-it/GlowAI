import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const links = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Customers' },
  { id: 'staff', label: 'Staff' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'pos', label: 'POS System' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'services', label: 'Services' },
  { id: 'walkins', label: 'Walk-ins' },
  { id: 'reports', label: 'Data Reports' },
  { id: 'ai-recommendations', label: 'AI Recommendations' },
  { id: 'settings', label: 'Settings' },
];

export default function Sidebar({ setView, view, allowedViews }) {
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode, adminColors, logo } = useTheme();
  const { user } = useAuth();
  const customColors = adminColors;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-900 dark:bg-gray-900 text-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 p-6 space-y-6 transform transition-transform duration-300 ease-in-out shadow-2xl border-r border-blue-300/50 dark:border-blue-700/50 relative overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: darkMode 
            ? `linear-gradient(to bottom, ${customColors.darkGradientStart}, ${customColors.darkGradientMiddle}, ${customColors.darkGradientEnd})`
            : `linear-gradient(to bottom, ${customColors.gradientStart}, ${customColors.gradientMiddle}, ${customColors.gradientEnd})`,
          color: darkMode ? customColors.darkTextColor : customColors.textColor,
        }}
      >
        {/* Salon Logo */}
        <div className="relative mb-4">
          <div className="flex items-center gap-3 bg-white/20 dark:bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/30 dark:border-yellow-200/20 rounded-lg">
            {logo ? (
              <img src={logo} alt="Salon Logo" className="w-10 h-10 flex-shrink-0 object-contain" />
            ) : (
              <svg className="w-10 h-10 flex-shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>
                {/* Scissors */}
                <path d="M30 20 L20 30 L35 45 L45 35 Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="25" cy="25" r="5" fill="currentColor"/>
                <circle cx="40" cy="40" r="5" fill="currentColor"/>
                {/* Nail Polish Bottle */}
                <rect x="55" y="25" width="15" height="25" rx="2" fill="currentColor" opacity="0.9"/>
                <rect x="58" y="20" width="9" height="8" rx="1" fill="currentColor"/>
                <path d="M60 28 L65 28" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M60 32 L65 32" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-widest font-bold" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>WCM SALON</p>
              <p className="text-xs opacity-80" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {links.map((link) => {
            // Hide walkins, reports, and ai-recommendations for non-admin users
            if ((link.id === 'walkins' || link.id === 'reports' || link.id === 'ai-recommendations') && user?.role !== 'admin') {
              return null;
            }
            // Allow admin to access walkins, reports, and ai-recommendations even if not in allowedViews
            const isAdminOnly = (link.id === 'walkins' || link.id === 'reports' || link.id === 'ai-recommendations');
            const disabled = isAdminOnly ? false : !allowedViews.includes(link.id);
            const isActive = view === link.id;
            const icons = {
              dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
              customers: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              staff: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
              inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
              pos: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
              appointments: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
              services: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
              walkins: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
              reports: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
              'ai-recommendations': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
              settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
            };
            return (
              <button
                key={link.id}
                onClick={() => {
                  if (!disabled) {
                    setView(link.id);
                    setIsOpen(false);
                  }
                }}
                disabled={disabled}
                className={`group relative p-3 rounded-xl text-left transition-all duration-300 text-sm sm:text-base flex items-center gap-3 ${
                  isActive 
                    ? 'bg-white/30 dark:bg-blue-800/50 shadow-lg shadow-blue-500/30 scale-105' 
                    : 'hover:bg-white/20 dark:hover:bg-white/10 hover:scale-105'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{
                  color: darkMode 
                    ? (isActive ? customColors.darkTextColor : (customColors.darkTextColor + 'E6'))
                    : (isActive ? customColors.textColor : (customColors.textColor + 'E6')),
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[link.id] || icons.dashboard} />
                </svg>
                <span className="flex-1">{link.label}</span>
                {isActive && (
                  <div className="absolute right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
                {disabled && <span className="ml-2 text-xs">(No access)</span>}
              </button>
            );
          })}
        </nav>
        
        {/* Salon decorative elements in sidebar empty space - bottom */}
        <div className="absolute bottom-6 left-0 right-0 px-6 flex items-center justify-center gap-3 opacity-15 pointer-events-none">
          {/* Scissors icon */}
          <svg className="w-6 h-6 text-blue-300 animate-rotate-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
          {/* Nail polish icon */}
          <svg className="w-5 h-5 text-pink-300 animate-wiggle" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {/* Sparkle icon */}
          <svg className="w-5 h-5 text-yellow-300 animate-sparkle" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {/* Massage wave icon */}
          <svg className="w-5 h-5 text-purple-300 animate-massage-wave" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      </aside>
    </>
  );
}
