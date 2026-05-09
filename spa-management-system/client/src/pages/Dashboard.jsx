import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [salesReport, setSalesReport] = useState([]);
  const [peakDays, setPeakDays] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = last week, etc.
  const [loading, setLoading] = useState(true);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getWeekRange = (weeksAgo) => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setDate(monday.getDate() - (weeksAgo * 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  const formatWeekLabel = (weeksAgo) => {
    if (weeksAgo === 0) return 'Current Week';
    if (weeksAgo === 1) return 'Last Week';
    return `${weeksAgo} Weeks Ago`;
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    setLoading(true);
    let startDate, endDate;
    
    if (useCustomRange && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const weekRange = getWeekRange(selectedWeek);
      startDate = weekRange.start.toISOString().split('T')[0];
      endDate = weekRange.end.toISOString().split('T')[0];
    }

    // Fetch Sales Report
    axios.get(`${API_BASE_URL}/api/reports/sales?start=${startDate}&end=${endDate}`)
      .then(res => setSalesReport(res.data || []))
      .catch(err => {
        console.error('Sales report error:', err);
        setSalesReport([]);
      });

    // Fetch Peak Days Report
    axios.get(`${API_BASE_URL}/api/reports/peak-days?start=${startDate}&end=${endDate}`)
      .then(res => setPeakDays(res.data || []))
      .catch(err => {
        console.error('Peak days error:', err);
        setPeakDays([]);
      });

    // Fetch Peak Hours Report
    axios.get(`${API_BASE_URL}/api/reports/peak-hours?start=${startDate}&end=${endDate}`)
      .then(res => setPeakHours(res.data || []))
      .catch(err => {
        console.error('Peak hours error:', err);
        setPeakHours([]);
      })
      .finally(() => setLoading(false));
  }, [user, selectedWeek, useCustomRange, customStartDate, customEndDate]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Access Denied: Admin role required.</p>
      </div>
    );
  }

  const weekRange = getWeekRange(selectedWeek);
  const weekLabel = `${weekRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  const getCurrentDateRange = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return weekLabel;
  };

  const getCurrentStartDate = () => {
    if (useCustomRange && customStartDate) {
      return customStartDate;
    }
    return weekRange.start.toISOString().split('T')[0];
  };

  const getCurrentEndDate = () => {
    if (useCustomRange && customEndDate) {
      return customEndDate;
    }
    return weekRange.end.toISOString().split('T')[0];
  };

  const formatDateForPrint = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handlePrintReport = () => {
    const startDate = getCurrentStartDate();
    const endDate = getCurrentEndDate();
    const dateRangeLabel = getCurrentDateRange();
    
    const totalRevenue = salesReport.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
    const totalTransactions = salesReport.reduce((sum, item) => sum + (item.transactions || 0), 0);
    const peakDay = peakDays.length > 0 ? peakDays[0].day : 'N/A';
    const peakHour = peakHours.length > 0 ? `${peakHours.reduce((max, h) => (h.activity || 0) > (max.activity || 0) ? h : max).hour}:00` : 'N/A';
    const printedBy = user?.username || user?.name || 'Admin';
    const printedOn = formatDateForPrint(new Date());

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard Report - ${dateRangeLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
            .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
            .print-info { text-align: right; margin-bottom: 20px; font-size: 12px; color: #666; }
            h1 { color: #2563eb; }
            h2 { color: #1e40af; margin-top: 25px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #2563eb; color: white; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>WCM Hair and Nail Salon</h1>
          </div>
          <div class="print-info">
            <p><strong>Printed by:</strong> ${printedBy}</p>
            <p><strong>Printed on:</strong> ${printedOn}</p>
          </div>
          <h1>Dashboard Business Report</h1>
          <p><strong>Date Range:</strong> ${dateRangeLabel}</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Revenue:</strong> PHP${totalRevenue.toFixed(2)}</p>
            <p><strong>Total Transactions:</strong> ${totalTransactions}</p>
            <p><strong>Peak Day:</strong> ${peakDay}</p>
            <p><strong>Peak Hour:</strong> ${peakHour}</p>
          </div>
          
          <h2>Sales Data</h2>
          <table>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Transactions</th>
            </tr>
            ${salesReport.map(item => `
              <tr>
                <td>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>PHP${parseFloat(item.revenue || 0).toFixed(2)}</td>
                <td>${item.transactions || 0}</td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Peak Days</h2>
          <table>
            <tr>
              <th>Day</th>
              <th>Activity</th>
            </tr>
            ${peakDays.map(item => `
              <tr>
                <td>${item.day}</td>
                <td>${item.activity || 0}</td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Peak Hours</h2>
          <table>
            <tr>
              <th>Hour</th>
              <th>Activity</th>
            </tr>
            ${peakHours.map(item => `
              <tr>
                <td>${item.hour}:00</td>
                <td>${item.activity || 0}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const COLORS = ['#16A34A', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  return (
    <div 
      className="space-y-4 sm:space-y-6 animate-fadeIn min-h-screen p-4 sm:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      {/* Week Selector */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Reports</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getCurrentDateRange()}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePrintReport}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download/Print Report
            </button>
          </div>
        </div>
        
        {/* Date Range Selector */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomRange}
                onChange={(e) => {
                  setUseCustomRange(e.target.checked);
                  if (!e.target.checked) {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use Custom Date Range</span>
            </label>
            
            {useCustomRange ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">From:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">To:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedWeek(week)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedWeek === week
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {formatWeekLabel(week)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
        </div>
      ) : (
        <>
          {/* Sales Report */}
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 animate-shimmer"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold gradient-text dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Sales Report
              </h3>
              <button
                onClick={() => {
                  const startDate = getCurrentStartDate();
                  const endDate = getCurrentEndDate();
                  const dateRangeLabel = getCurrentDateRange();
                  const totalRevenue = salesReport.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
                  const totalTransactions = salesReport.reduce((sum, item) => sum + (item.transactions || 0), 0);
                  const printedBy = user?.username || user?.name || 'Admin';
                  const printedOn = formatDateForPrint(new Date());

                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Sales Report - ${dateRangeLabel}</title>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
                          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
                          .print-info { text-align: right; margin-bottom: 20px; font-size: 12px; color: #666; }
                          h1 { color: #2563eb; }
                          h2 { color: #1e40af; margin-top: 25px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                          th { background-color: #2563eb; color: white; }
                          .summary { margin-top: 20px; padding: 15px; background-color: #f3f4f6; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1>WCM Hair and Nail Salon</h1>
                        </div>
                        <div class="print-info">
                          <p><strong>Printed by:</strong> ${printedBy}</p>
                          <p><strong>Printed on:</strong> ${printedOn}</p>
                        </div>
                        <h1>Sales Report</h1>
                        <p><strong>Date Range:</strong> ${dateRangeLabel}</p>
                        
                        <div class="summary">
                          <h2>Summary</h2>
                          <p><strong>Total Revenue:</strong> PHP${totalRevenue.toFixed(2)}</p>
                          <p><strong>Total Transactions:</strong> ${totalTransactions}</p>
                        </div>
                        
                        <h2>Sales Data</h2>
                        <table>
                          <tr>
                            <th>Date</th>
                            <th>Revenue</th>
                            <th>Transactions</th>
                          </tr>
                          ${salesReport.map(item => `
                            <tr>
                              <td>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td>PHP${parseFloat(item.revenue || 0).toFixed(2)}</td>
                              <td>${item.transactions || 0}</td>
                            </tr>
                          `).join('')}
                        </table>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Print
              </button>
            </div>
            {salesReport.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesReport.map(item => ({
                  ...item,
                  date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#6b7280' } }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12} 
                    allowDecimals={false}
                    label={{ value: 'Amount / Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                  />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#16A34A" strokeWidth={3} dot={{ fill: '#16A34A', r: 5 }} />
                  <Line type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No sales data available for this week.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sales Graph */}
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 animate-shimmer"></div>
              <h3 className="text-base sm:text-lg font-bold mb-4 gradient-text dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                Sales Graph
              </h3>
              {salesReport.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesReport.map(item => ({
                    ...item,
                    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280" 
                      fontSize={10} 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      label={{ value: 'Date', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12} 
                      allowDecimals={false}
                      label={{ value: 'Revenue (PHP)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#16A34A" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No sales data available for this week.</p>
              )}
            </div>

            {/* Peak Days Report */}
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 animate-shimmer"></div>
              <h3 className="text-base sm:text-lg font-bold mb-4 gradient-text dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                Peak Days Report
              </h3>
              {peakDays.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakDays}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#6b7280" 
                      fontSize={12}
                      label={{ value: 'Day of Week', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12} 
                      allowDecimals={false}
                      label={{ value: 'Number of Transactions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <Tooltip />
                    <Bar dataKey="activity" fill="#a855f7" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No peak days data available for this week.</p>
              )}
            </div>

            {/* Peak Hours Report */}
            <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d group">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-green-500 animate-shimmer"></div>
              <h3 className="text-base sm:text-lg font-bold mb-4 gradient-text dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Peak Hours Report
              </h3>
              {peakHours.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={peakHours.map(h => ({ hour: `${h.hour}:00`, activity: h.activity || h.totalActivity || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#6b7280" 
                      fontSize={12}
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={12} 
                      allowDecimals={false}
                      label={{ value: 'Number of Transactions', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                    />
                    <Tooltip />
                    <Bar dataKey="activity" fill="#16A34A" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No peak hours data available for this week.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
