import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
  { id: 'home', label: 'My Overview' },
  { id: 'settings', label: 'Settings & Appointments' },
];

export default function CustomerNav({ active, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const { darkMode, getPortalColors, logo } = useTheme();
  const customColors = getPortalColors('customer');

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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shadow-sm border-r border-blue-300/50 dark:border-blue-700/50 p-4 sm:p-6 transform transition-transform duration-300 ease-in-out ${
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
        <div className="mb-6">
          <div className="flex items-center gap-3 bg-white/20 dark:bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/30 dark:border-yellow-200/20">
            {logo ? (
              <img src={logo} alt="Salon Logo" className="w-10 h-10 flex-shrink-0 object-contain" />
            ) : (
              <svg className="w-10 h-10 flex-shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>
                <path d="M30 20 L20 30 L35 45 L45 35 Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="25" cy="25" r="5" fill="currentColor"/>
                <circle cx="40" cy="40" r="5" fill="currentColor"/>
                <rect x="55" y="25" width="15" height="25" rx="2" fill="currentColor" opacity="0.9"/>
                <rect x="58" y="20" width="9" height="8" rx="1" fill="currentColor"/>
                <path d="M60 28 L65 28" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M60 32 L65 32" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-wide font-bold" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>Customer Portal</p>
            <p className="text-xs opacity-80" style={{ color: darkMode ? customColors.darkTextColor : customColors.textColor }}>WCM Salon</p>
          </div>
          </div>
        </div>
        <div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  active === item.id
                    ? 'bg-white/30 dark:bg-green-700 shadow-md'
                    : 'hover:bg-white/20 dark:hover:bg-white/10'
                }`}
                style={{
                  color: darkMode 
                    ? (active ? customColors.darkTextColor : (customColors.darkTextColor + 'E6'))
                    : (active ? customColors.textColor : (customColors.textColor + 'E6')),
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

