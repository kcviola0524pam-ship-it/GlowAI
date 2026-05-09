import React from 'react';

export default function CustomerHeader({ customer, onAdd, onRefresh }) {
  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Selected customer</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {customer ? customer.name : 'Select a customer'}
        </p>
        {customer && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Service preferred: <span className="font-medium text-gray-800 dark:text-white">{customer.service}</span> • Status:{' '}
            <span className="font-medium text-gray-800 dark:text-white">{customer.status}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="px-4 py-2 border rounded text-gray-900 dark:text-white hover:bg-gray-50 text-sm"
        >
          Refresh
        </button>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm shadow-sm"
        >
          + Add Customer
        </button>
      </div>
    </div>
  );
}

