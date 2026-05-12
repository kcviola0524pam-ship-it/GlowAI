import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function LowStockPopup({ setView, onClose }) {
  const { user } = useAuth();
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    const fetchLowStock = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/inventory/alerts/low-stock`);
        setLowStockItems(res.data || []);
        if (res.data && res.data.length > 0) {
          setIsVisible(true);
        }
      } catch (err) {
        console.error('Low stock error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStock();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleClick = () => {
    setView('inventory');
    handleClose();
  };

  if (!isVisible || lowStockItems.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:w-96 animate-slideUp">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-red-500 overflow-hidden">
        {/* Header */}
        <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-sm sm:text-base">Low Stock Alert</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-red-600 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {lowStockItems.length} {lowStockItems.length === 1 ? 'product' : 'products'} {lowStockItems.length === 1 ? 'has' : 'have'} low stock:
          </p>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                onClick={handleClick}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    {item.sku && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        SKU: {item.sku}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 text-right">
                    <p className="text-red-600 dark:text-red-400 font-bold text-sm">
                      {item.stock_quantity}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Min: {item.min_stock_level}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={handleClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Go to Inventory Management
          </button>
        </div>
      </div>
    </div>
  );
}

