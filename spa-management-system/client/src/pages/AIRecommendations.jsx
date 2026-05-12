import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AIRecommendations() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [recommendations, setRecommendations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/recommendations/business`);
      setRecommendations(res.data.recommendations || []);
      setStatistics(res.data.statistics || null);
      setPeakHours(res.data.peakHours || []);
    } catch (err) {
      console.error('Error fetching AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading AI recommendations...</p>
      </div>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'Low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High':
        return 'text-green-600 dark:text-green-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div 
      className="space-y-4 sm:space-y-6 min-h-screen w-full max-w-full min-w-0 p-3 sm:p-4 md:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Business Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-white-500 dark:text-white-400 mt-1">
            Data-driven insights to optimize your spa operations
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Total Revenue (30 days)</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              PHP{parseFloat(statistics.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Average Transaction</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              PHP{parseFloat(statistics.averageTransaction || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Active Customers</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {statistics.activeCustomers || 0}
            </p>
          </div>
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Low Stock Items</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
              {statistics.lowStockItems || 0}
            </p>
          </div>
        </div>
      )}

      {/* Peak Hours */}
      {peakHours && peakHours.length > 0 && (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📊 Peak Activity Hours (Last 30 Days)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {peakHours.map((hour, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {hour.hour}:00
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {hour.totalActivity} activities
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {hour.transactions || 0} transactions
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {hour.appointments || 0} appointments
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Services */}
      {statistics && statistics.popularServices && statistics.popularServices.length > 0 && (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
            ⭐ Popular Services
          </h3>
          <div className="flex flex-wrap gap-2">
            {statistics.popularServices.map((service, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg px-4 py-2 border border-purple-200 dark:border-purple-800"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {service.service}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {service.count} bookings
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
          💡 AI Recommendations
        </h3>
        {recommendations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No recommendations available at this time. Check back later for insights based on your business data.
          </p>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow dark:border-gray-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {rec.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(rec.priority)}`}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Category: <span className="font-medium text-gray-700 dark:text-gray-300">{rec.category}</span>
                      </span>
                      <span className={`font-semibold ${getImpactColor(rec.impact)}`}>
                        Impact: {rec.impact}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

