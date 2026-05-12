import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function DataReports() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentSalesReport, setCurrentSalesReport] = useState([]);
  const [currentPeakDays, setCurrentPeakDays] = useState([]);
  const [currentPeakHours, setCurrentPeakHours] = useState([]);
  const [currentPreferredServices, setCurrentPreferredServices] = useState([]);
  const [loadingCurrentData, setLoadingCurrentData] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    // Fetch saved reports
    axios.get(`${API_BASE_URL}/api/reports/saved`)
      .then(res => setSavedReports(res.data || []))
      .catch(err => {
        console.error('Error fetching saved reports:', err);
        setSavedReports([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const getWeekRange = (weeksAgo) => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
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

  const getCurrentDateRange = () => {
    if (useCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    const weekRange = getWeekRange(selectedWeek);
    return `${weekRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getCurrentStartDate = () => {
    if (useCustomRange && customStartDate) {
      return customStartDate;
    }
    const weekRange = getWeekRange(selectedWeek);
    return weekRange.start.toISOString().split('T')[0];
  };

  const getCurrentEndDate = () => {
    if (useCustomRange && customEndDate) {
      return customEndDate;
    }
    const weekRange = getWeekRange(selectedWeek);
    return weekRange.end.toISOString().split('T')[0];
  };


  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    const fetchData = async () => {
      setLoadingCurrentData(true);
      let startDate, endDate;
      
      if (useCustomRange && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const weekRange = getWeekRange(selectedWeek);
        startDate = weekRange.start.toISOString().split('T')[0];
        endDate = weekRange.end.toISOString().split('T')[0];
      }

      try {
        const [salesRes, peakDaysRes, peakHoursRes, preferredServicesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/reports/sales?start=${startDate}&end=${endDate}`),
          axios.get(`${API_BASE_URL}/api/reports/peak-days?start=${startDate}&end=${endDate}`),
          axios.get(`${API_BASE_URL}/api/reports/peak-hours?start=${startDate}&end=${endDate}`),
          axios.get(`${API_BASE_URL}/api/reports/preferred-services?start=${startDate}&end=${endDate}`)
        ]);

        setCurrentSalesReport(salesRes.data || []);
        setCurrentPeakDays(peakDaysRes.data || []);
        setCurrentPeakHours(peakHoursRes.data || []);
        setCurrentPreferredServices(preferredServicesRes.data || []);
      } catch (err) {
        console.error('Error fetching current data:', err);
        setCurrentSalesReport([]);
        setCurrentPeakDays([]);
        setCurrentPeakHours([]);
        setCurrentPreferredServices([]);
      } finally {
        setLoadingCurrentData(false);
      }
    };

    if (useCustomRange && customStartDate && customEndDate) {
      fetchData();
    } else if (!useCustomRange) {
      fetchData();
    }
  }, [user, selectedWeek, useCustomRange, customStartDate, customEndDate]);

  const handleSaveReport = async (weekNumber) => {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setDate(monday.getDate() - (weekNumber * 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const startDate = monday.toISOString().split('T')[0];
      const endDate = sunday.toISOString().split('T')[0];

      await axios.post(`${API_BASE_URL}/api/reports/save`, {
        week_number: weekNumber,
        start_date: startDate,
        end_date: endDate,
      });
      
      // Refresh saved reports
      const res = await axios.get(`${API_BASE_URL}/api/reports/saved`);
      setSavedReports(res.data || []);
      alert('Report saved successfully!');
    } catch (err) {
      console.error('Error saving report:', err);
      alert('Failed to save report. Please try again.');
    }
  };

  const formatDateForPrint = (date) => {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handlePrintCurrentReport = () => {
    const startDate = getCurrentStartDate();
    const endDate = getCurrentEndDate();
    const dateRangeLabel = getCurrentDateRange();
    
    const totalRevenue = currentSalesReport.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);
    const totalTransactions = currentSalesReport.reduce((sum, item) => sum + (item.transactions || 0), 0);
    const peakDay = currentPeakDays.length > 0 ? currentPeakDays[0].day : 'N/A';
    const peakHour = currentPeakHours.length > 0 ? `${currentPeakHours.reduce((max, h) => (h.activity || 0) > (max.activity || 0) ? h : max).hour}:00` : 'N/A';
    const printedBy = user?.username || user?.name || 'Admin';
    const printedOn = formatDateForPrint(new Date());

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Data Report - ${dateRangeLabel}</title>
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
          <h1>Data Report</h1>
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
            ${currentSalesReport.map(item => `
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
            ${currentPeakDays.map(item => `
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
            ${currentPeakHours.map(item => `
              <tr>
                <td>${item.hour}:00</td>
                <td>${item.activity || 0}</td>
              </tr>
            `).join('')}
          </table>

          <h2>Preferred Services</h2>
          <table>
            <tr>
              <th>Service</th>
              <th>Customers</th>
              <th>Bookings</th>
            </tr>
            ${currentPreferredServices.map(item => `
              <tr>
                <td>${item.service}</td>
                <td>${item.customers || 0}</td>
                <td>${item.bookings || 0}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintReport = async (report) => {
    const printedBy = user?.username || user?.name || 'Admin';
    const printedOn = formatDateForPrint(new Date());

    let preferredServices = [];
    try {
      const preferredRes = await axios.get(
        `${API_BASE_URL}/api/reports/preferred-services?start=${report.start_date}&end=${report.end_date}`
      );
      preferredServices = preferredRes.data || [];
    } catch (err) {
      console.error('Error fetching preferred services for saved report print:', err);
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Report - ${report.week_label}</title>
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
          <h1>Weekly Business Report</h1>
          <p><strong>Week:</strong> ${report.week_label}</p>
          <p><strong>Date Range:</strong> ${new Date(report.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${new Date(report.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Generated:</strong> ${new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          
          <div class="summary">
            <h2>Summary</h2>
            <p><strong>Total Revenue:</strong> PHP${parseFloat(report.total_revenue || 0).toFixed(2)}</p>
            <p><strong>Total Transactions:</strong> ${report.total_transactions || 0}</p>
            <p><strong>Peak Day:</strong> ${report.peak_day || 'N/A'}</p>
            <p><strong>Peak Hour:</strong> ${report.peak_hour || 'N/A'}</p>
          </div>
          
          <h2>Sales Data</h2>
          <table>
            <tr>
              <th>Date</th>
              <th>Revenue</th>
              <th>Transactions</th>
            </tr>
            ${JSON.parse(report.sales_data || '[]').map(item => `
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
            ${JSON.parse(report.peak_days_data || '[]').map(item => `
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
            ${JSON.parse(report.peak_hours_data || '[]').map(item => `
              <tr>
                <td>${item.hour}:00</td>
                <td>${item.activity || 0}</td>
              </tr>
            `).join('')}
          </table>

          <h2>Preferred Services</h2>
          <table>
            <tr>
              <th>Service</th>
              <th>Customers</th>
              <th>Bookings</th>
            </tr>
            ${preferredServices.map(item => `
              <tr>
                <td>${item.service}</td>
                <td>${item.customers || 0}</td>
                <td>${item.bookings || 0}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Data Reports</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and print reports</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handlePrintCurrentReport}
              disabled={loadingCurrentData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {loadingCurrentData ? 'Loading...' : 'Download/Print Current Report'}
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
        
        {/* Save Report Buttons */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Save reports for later:</p>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4].map((week) => (
              <button
                key={week}
                onClick={() => handleSaveReport(week)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save {week === 0 ? 'Current' : week === 1 ? 'Last' : `${week} Weeks Ago`} Week
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Preferred Services ({getCurrentDateRange()})
        </h3>
        {loadingCurrentData ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading preferred services...</p>
        ) : currentPreferredServices.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No preferred service data for the selected date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-2 text-left text-sm font-medium">Service</th>
                  <th className="p-2 text-left text-sm font-medium">Customers</th>
                  <th className="p-2 text-left text-sm font-medium">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {currentPreferredServices.map((item) => (
                  <tr key={item.service} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-2 text-sm text-gray-700 dark:text-gray-300">{item.service}</td>
                    <td className="p-2 text-sm text-gray-700 dark:text-gray-300">{item.customers || 0}</td>
                    <td className="p-2 text-sm text-gray-700 dark:text-gray-300">{item.bookings || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
        </div>
      ) : savedReports.length === 0 ? (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No saved reports yet. Save a report from the buttons above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{report.week_label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {new Date(report.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(report.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Revenue:</span>{' '}
                  <span className="text-green-600 dark:text-green-400">PHP{parseFloat(report.total_revenue || 0).toFixed(2)}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Transactions:</span>{' '}
                  <span className="text-blue-600 dark:text-blue-400">{report.total_transactions || 0}</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Saved: {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => handlePrintReport(report)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
