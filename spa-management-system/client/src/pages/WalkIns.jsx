import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function WalkIns() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [checkinError, setCheckinError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    // Fetch recent check-ins
    axios.get(`${API_BASE_URL}/api/checkins`)
      .then(res => setRecentCheckins(res.data))
      .catch(err => console.error('Checkins error:', err));

    // Fetch customers list
    axios.get(`${API_BASE_URL}/api/customer`)
      .then(res => setCustomers(res.data))
      .catch(err => console.error('Customers error:', err));
  }, [user]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Access Denied: Admin role required.</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-4 sm:space-y-6 animate-fadeIn min-h-screen w-full max-w-full min-w-0 p-3 sm:p-4 md:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Manual Check-in Form */}
        <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-green-500/10 to-purple-500/10"></div>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-green-500 animate-shimmer"></div>
          <div className="absolute -top-2 -right-2 w-28 h-28 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
          <h3 className="relative z-10 text-sm sm:text-base font-bold mb-4 gradient-text dark:text-white flex items-center gap-2 animate-slideInFromLeft">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            Manual Check-in
          </h3>
          <form
            className="relative z-10"
            onSubmit={async (e) => {
              e.preventDefault();
              setCheckinError('');
              setCheckinSuccess('');
              
              if (!selectedCustomerId) {
                setCheckinError('Please select a customer');
                return;
              }

              setIsSubmitting(true);
              try {
                await axios.post(`${API_BASE_URL}/api/checkins`, {
                  customer_id: parseInt(selectedCustomerId),
                  userId: user?.id,
                });
                
                setCheckinSuccess('Check-in added successfully!');
                setSelectedCustomerId('');
                
                // Refresh recent check-ins
                const res = await axios.get(`${API_BASE_URL}/api/checkins`);
                setRecentCheckins(res.data);
                
                // Clear success message after 3 seconds
                setTimeout(() => setCheckinSuccess(''), 3000);
              } catch (err) {
                const errorMessage = err.response?.data?.error || 'Failed to add check-in. Please try again.';
                setCheckinError(errorMessage);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setCheckinError('');
                  setCheckinSuccess('');
                }}
                className="border p-2 rounded w-full text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">-- Select a customer --</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.id} - {customer.name} ({customer.status})
                  </option>
                ))}
              </select>
            </div>
            
            {checkinError && (
              <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded mt-2">
                {checkinError}
              </div>
            )}
            
            {checkinSuccess && (
              <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded mt-2">
                {checkinSuccess}
              </div>
            )}
            
            <button 
              type="submit" 
              className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-lg w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
              disabled={isSubmitting || !selectedCustomerId}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Check-in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Recent Walk-ins */}
        <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group pattern-grid">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10"></div>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-blue-500 animate-shimmer"></div>
          <div className="absolute -top-2 -left-2 w-24 h-24 bg-green-400/20 rounded-full blur-2xl animate-pulse"></div>
          <h3 className="relative z-10 text-sm sm:text-base font-bold mb-4 text dark:text-white flex items-center gap-2 animate-slideInFromLeft">
            <div className="p-1.5 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            Recent Walk-ins
          </h3>
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[200px]">
              <thead>
                <tr className="text-white-500 dark:text-white-400 border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold hidden sm:table-cell">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.slice(0, 10).map((c, idx) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-green-50/50 dark:hover:from-blue-900/20 dark:hover:to-green-900/20 transition-all duration-200 animate-slideInFromLeft" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <td className="py-3 text-gray-900 dark:text-white font-medium">{c.name || 'N/A'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        {c.status || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 text-white-600 dark:text-white-400 hidden sm:table-cell text-xs">{new Date(c.checkin_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
