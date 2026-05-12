import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode, adminColors, logo } = useTheme();
  const customColors = adminColors;

  return (
    <header 
      className="relative flex items-center justify-between pr-3 sm:pr-6 max-md:pl-14 md:px-6 py-3 sm:py-4 border-b border-blue-300/50 dark:border-blue-700/50 shadow-lg backdrop-blur-sm overflow-hidden min-w-0 shrink-0"
      style={{
        background: darkMode 
          ? `linear-gradient(to right, ${customColors.darkGradientStart}, ${customColors.darkGradientMiddle}, ${customColors.darkGradientEnd})`
          : `linear-gradient(to right, ${customColors.gradientStart}, ${customColors.gradientMiddle}, ${customColors.gradientEnd})`,
        color: darkMode ? customColors.darkTextColor : customColors.textColor,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
      
      {/* Salon Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
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
        <div className="hidden sm:block">
          <p className="text-sm font-bold" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>WCM Salon</p>
          <p className="text-xs opacity-80" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>Management System</p>
        </div>
      </div>
      
      {/* Salon decorative elements in header empty space */}
      <div className="hidden md:flex absolute left-32 lg:left-48 top-1/2 -translate-y-1/2 items-center gap-4 opacity-20 pointer-events-none">
        {/* Scissors icon */}
        <svg className="w-8 h-8 text-blue-300 animate-rotate-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
        {/* Nail polish icon */}
        <svg className="w-7 h-7 text-pink-300 animate-wiggle" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {/* Massage wave icon */}
        <svg className="w-7 h-7 text-purple-300 animate-massage-wave" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      
      {user && (
        <div className="relative flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1 justify-end">
          <button
            onClick={toggleDarkMode}
            className="group p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-white/10 transition-all duration-300 hover:scale-110 backdrop-blur-sm border border-blue-300/50 dark:border-yellow-200/20"
            style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className="text-right hidden sm:block bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-300/50 dark:border-yellow-200/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>{user.name}</p>
                <p className="text-xs uppercase tracking-wide opacity-80" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>{user.role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="group px-3 sm:px-4 py-2 text-xs sm:text-sm border-2 border-red-500/50 rounded-lg hover:bg-red-500/20 dark:border-red-400/50 dark:hover:bg-red-500/20 whitespace-nowrap transition-all duration-300 hover:scale-105 hover:border-red-500 flex items-center gap-2 backdrop-blur-sm"
            style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}
          >
            <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
