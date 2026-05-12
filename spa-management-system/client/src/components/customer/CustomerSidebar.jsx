import React from 'react';

const tabs = [
  { id: 'overview', label: 'Overview' },
];

export default function CustomerSidebar({ active, onChange }) {
  return (
    <div className="w-full sm:w-56 shrink-0 bg-gray-100 dark:bg-gray-700 rounded-xl shadow-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Customer Tools</p>
      <nav className="space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition ${
              active === tab.id
                ? 'border-green-600 bg-green-50 text-green-700 font-semibold'
                : 'border-transparent hover:bg-gray-50 text-gray-70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

