import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatAppointmentDate, formatAppointmentTime, formatDateForAPI } from '../utils/dateHelpers';

export default function Appointments() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, completed, cancelled
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/appointments`);
      setAppointments(res.data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const appointment = appointments.find(apt => apt.id === id);
      if (!appointment) return;

      // When updating status from the admin table, don't send date/time.
      // The backend will keep the existing appointment_date and appointment_time.
      const updatedData = {
        customer_id: appointment.customer_id,
        staff_id: appointment.staff_id,
        service: appointment.service,
        notes: appointment.notes || '',
        status: newStatus,
        userId: user?.id,
      };

      await axios.put(`${API_BASE_URL}/api/appointments/${id}`, updatedData);
      fetchAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      alert('Failed to update appointment status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/appointments/${id}?userId=${user?.id}`);
      fetchAppointments();
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to delete appointment');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesFilter = filter === 'all' || apt.status === filter;
    const matchesSearch = 
      apt.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.staff_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-4 sm:space-y-6 min-h-screen p-4 sm:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-dots">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
        <div className="absolute -top-2 -right-2 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h2 className="text-xl sm:text-2xl font-bold gradient-text dark:text-white flex items-center gap-2 animate-slideInFromLeft">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              Appointments Management
            </h2>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-700/50 rounded-xl backdrop-blur-sm border border-gray-200 dark:border-gray-600 shadow-sm">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Total:</span>
              <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{appointments.length}</span>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">|</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Scheduled:</span>
              <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">{appointments.filter(a => a.status === 'Scheduled').length}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <input
              type="text"
              placeholder="🔍 Search by customer, service, or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm dark:bg-gray-700 dark:text-white bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm hover:shadow-md"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm dark:bg-gray-700 dark:text-white bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No-Show">No-Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-grid">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
        <div className="relative z-10 overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[800px]">
            <thead className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                  Staff
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 sm:px-6 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No appointments found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt, idx) => (
                  <tr key={apt.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-green-50/50 dark:hover:from-blue-900/20 dark:hover:to-green-900/20 transition-all duration-200 animate-slideInFromLeft" style={{ animationDelay: `${idx * 0.02}s` }}>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {apt.customer_name || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {apt.service}
                    </td>
                    {/* ✅ FIXED DATE & TIME DISPLAY */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      <div>
                        {formatAppointmentDate(apt.appointment_date)}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {formatAppointmentTime(apt.appointment_time)}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-gray-900 dark:text-white hidden md:table-cell">
                      {apt.staff_name || 'Any available'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <select
                        value={apt.status}
                        onChange={(e) => handleStatusUpdate(apt.id, e.target.value)}
                        className={`text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                          apt.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                            : apt.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800'
                            : apt.status === 'Cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        } dark:bg-gray-700 dark:border-gray-600`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="No-Show">No-Show</option>
                      </select>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs sm:text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Modal (if needed) */}
      {filteredAppointments.some(apt => apt.notes) && (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appointment Details</h3>
          <div className="space-y-2">
            {filteredAppointments
              .filter(apt => apt.notes)
              .map((apt) => (
                <div key={apt.id} className="border-b dark:border-gray-700 pb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {apt.customer_name} - {apt.service}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{apt.notes}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}