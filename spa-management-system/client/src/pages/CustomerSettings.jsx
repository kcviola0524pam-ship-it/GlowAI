import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import PasswordInput from '../components/PasswordInput';

export default function CustomerSettings() {
  const { user, logout } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
  const [auditSortBy, setAuditSortBy] = useState('created_at');
  const [auditSortOrder, setAuditSortOrder] = useState('DESC');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('appointments'); // appointments, profile, audit
  const [form, setForm] = useState({
    service: '',
    appointment_date: '',
    appointment_time: '',
    staff_id: '',
    notes: '',
  });
  const [profileForm, setProfileForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    currentPassword: '',
    name: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [error, setError] = useState('');
  const [ratingForm, setRatingForm] = useState({ appointmentId: null, staffId: null, rating: 0, review: '' });
  const [showRatingForm, setShowRatingForm] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'customer') {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch customer data
        const customerRes = await axios.get(`${API_BASE_URL}/api/customer/user/${user.id}`);
        setCustomer(customerRes.data);

        // Fetch staff list
        const staffRes = await axios.get(`${API_BASE_URL}/api/staff`);
        setStaffList(staffRes.data);

        // Fetch services from API (only active services added by admin)
        const servicesRes = await axios.get(`${API_BASE_URL}/api/services`);
        setServices(servicesRes.data || []);

        // Fetch appointments
        const appointmentsRes = await axios.get(`${API_BASE_URL}/api/appointments/user/${user.id}`);
        setAppointments(appointmentsRes.data || []);

        // Fetch user data for profile
        try {
          const userRes = await axios.get(`${API_BASE_URL}/api/auth/user/${user.id}`);
          if (userRes.data) {
            setProfileForm({
              email: userRes.data.email || '',
              password: '',
              confirmPassword: '',
              currentPassword: '',
              name: userRes.data.name || '',
            });
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }

        // Fetch audit logs for this user
        try {
          const params = new URLSearchParams({
            page: '1',
            sortBy: auditSortBy,
            sortOrder: auditSortOrder,
          });
          const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
          setAuditLogs(auditRes.data.logs || []);
          setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
        } catch (err) {
          console.error('Error fetching audit logs:', err);
          setAuditLogs([]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Refetch audit logs when sorting changes
  useEffect(() => {
    if (user && user.role === 'customer') {
      const fetchAudit = async () => {
        try {
          const params = new URLSearchParams({
            page: auditPagination.currentPage.toString(),
            sortBy: auditSortBy,
            sortOrder: auditSortOrder,
          });
          const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
          setAuditLogs(auditRes.data.logs || []);
          setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
        } catch (err) {
          console.error('Error fetching audit logs:', err);
        }
      };
      fetchAudit();
    }
  }, [auditSortBy, auditSortOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) return;

    setError('');

    // Validate time is between 8am and 8pm
    if (form.appointment_time) {
      const [hours] = form.appointment_time.split(':');
      const hour = parseInt(hours, 10);
      if (hour < 8 || hour >= 20) {
        setError('Appointment time must be between 8:00 AM and 8:00 PM');
        return;
      }
    }

    try {
      await axios.post(`${API_BASE_URL}/api/appointments`, {
        customer_id: customer.id,
        staff_id: form.staff_id || null,
        service: form.service,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        notes: form.notes,
        userId: user.id,
      });

      // refresh appointments
      const appointmentsRes = await axios.get(`${API_BASE_URL}/api/appointments/user/${user.id}`);
      setAppointments(appointmentsRes.data || []);

      // Reset form
      setForm({
        service: '',
        appointment_date: '',
        appointment_time: '',
        staff_id: '',
        notes: '',
      });
      setShowForm(false);
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('appointmentCreated'));
    } catch (err) {
      console.error('Error creating appointment:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create appointment. Please try again.';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/appointments/${id}?userId=${user.id}`);
      const appointmentsRes = await axios.get(`${API_BASE_URL}/api/appointments/user/${user.id}`);
      setAppointments(appointmentsRes.data || []);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileError('Passwords do not match');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/auth/user/${user.id}`, {
        name: profileForm.name,
        email: profileForm.email,
        password: profileForm.password || undefined,
        currentPassword: profileForm.password ? profileForm.currentPassword : undefined,
      });

      setProfileSuccess('Profile updated successfully!');
      
      // Refresh user data
      const userRes = await axios.get(`${API_BASE_URL}/api/auth/user/${user.id}`);
      if (userRes.data) {
        setProfileForm({
          ...profileForm,
          password: '',
          confirmPassword: '',
          currentPassword: '',
        });
      }

      // Refresh audit logs
      const params = new URLSearchParams({
        page: auditPagination.currentPage.toString(),
        sortBy: auditSortBy,
        sortOrder: auditSortOrder,
      });
      const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
      setAuditLogs(auditRes.data.logs || []);
      setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });

      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update profile. Please try again.';
      setProfileError(errorMessage);
    }
  };

  const handleDeleteAccount = async () => {
    const password = prompt('Please enter your password to confirm account deletion:');
    if (!password) return;

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/auth/user/${user.id}`, {
        data: { password },
      });
      alert('Account deleted successfully. You will be logged out.');
      logout();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete account. Please try again.';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
          Manage your appointments, profile, and view your activity history.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-4 border-b dark:border-gray-700">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'appointments'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition-colors ${
              activeTab === 'audit'
                ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <>
          {customer && customer.booking_disabled === true && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Booking Temporarily Disabled
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    You have a No-Show appointment. Please contact the admin to re-enable booking.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (customer && customer.booking_disabled) {
                  setError('Booking is temporarily disabled. Please contact the admin to re-enable booking.');
                  return;
                }
                setShowForm(true);
                setError('');
              }}
              disabled={customer && customer.booking_disabled === true}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                customer && customer.booking_disabled === true
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              + Book New Appointment
            </button>
          </div>

          {showForm && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4 animate-fadeIn">
              <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto card-3d animate-bounce-in">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5 rounded-2xl"></div>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 rounded-t-2xl animate-shimmer"></div>
                <div className="absolute -top-2 -right-2 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold gradient-text dark:text-white mb-4 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Book Appointment
                  </h3>
                {error && (
                  <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Service
                    </label>
                    <select
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      required
                    >
                      <option value="">Select a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.name}>
                          {service.name} {service.price ? `- PHP${parseFloat(service.price).toFixed(2)}` : ''} {service.duration_minutes && service.duration_minutes > 0 ? `(${service.duration_minutes} min)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.appointment_date}
                      onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time (8:00 AM - 8:00 PM)
                    </label>
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.appointment_time}
                      onChange={(e) => {
                        const time = e.target.value;
                        // Validate time is between 8am and 8pm
                        if (time) {
                          const [hours] = time.split(':');
                          const hour = parseInt(hours, 10);
                          if (hour < 8 || hour >= 20) {
                            setError('Appointment time must be between 8:00 AM and 8:00 PM');
                            return;
                          }
                          setError('');
                        }
                        setForm({ ...form, appointment_time: time });
                      }}
                      min="08:00"
                      max="19:59"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Business hours: 8:00 AM - 8:00 PM
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Staff (Optional)
                    </label>
                    <select
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={form.staff_id}
                      onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                    >
                      <option value="">Any available staff</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} - {staff.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows="3"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any special requests or notes..."
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setError('');
                        setForm({
                          service: '',
                          appointment_date: '',
                          appointment_time: '',
                          staff_id: '',
                          notes: '',
                        });
                      }}
                      className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      Book Appointment
                    </button>
                  </div>
                </form>
                </div>
              </div>
            </div>
          )}

          <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-dots">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
            <div className="absolute -top-2 -right-2 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative z-10 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold gradient-text dark:text-white mb-4 flex items-center gap-2 animate-slideInFromLeft">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                My Appointments
              </h3>
            {appointments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No appointments booked yet.</p>
            ) : (
              <div className="space-y-4">
                {/* Sort: Scheduled appointments first, then by date */}
                {appointments
                  .sort((a, b) => {
                    // Scheduled appointments first
                    if (a.status === 'Scheduled' && b.status !== 'Scheduled') return -1;
                    if (a.status !== 'Scheduled' && b.status === 'Scheduled') return 1;
                    // Then sort by date
                    const dateA = new Date(`${a.appointment_date.split('T')[0]}T${a.appointment_time.split('.')[0]}`);
                    const dateB = new Date(`${b.appointment_date.split('T')[0]}T${b.appointment_time.split('.')[0]}`);
                    return dateA - dateB;
                  })
                  .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="border rounded-lg p-4 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{appointment.service}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                          {new Date(`2000-01-01T${appointment.appointment_time}`).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {appointment.staff_name && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Staff: {appointment.staff_name}
                          </p>
                        )}
                        {appointment.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{appointment.notes}</p>
                        )}
                        <span
                          className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                            appointment.status === 'Scheduled'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : appointment.status === 'Completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                        {appointment.status === 'Scheduled' && (
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        {appointment.status === 'Completed' && appointment.staff_id && appointment.staff_id !== 0 && (
                          <button
                            onClick={() => {
                              setRatingForm({
                                appointmentId: appointment.id,
                                staffId: appointment.staff_id,
                                rating: 0,
                                review: ''
                              });
                              setShowRatingForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            Rate Staff
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </>
        )}

        {/* Rating Modal */}
        {showRatingForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-4 w-full max-w-md">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Rate Your Experience</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How would you rate {appointments.find(a => a.id === ratingForm.appointmentId)?.staff_name || 'this staff member'}?
              </p>
              {!customer && (
                <p className="text-xs text-red-600 dark:text-red-400">Error: Customer data not found</p>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rating (1-5 stars)
                </label>
                <div className="flex gap-2 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, rating: star })}
                      className="focus:outline-none"
                    >
                      <svg
                        className={`w-8 h-8 ${
                          star <= ratingForm.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review (optional)
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="4"
                  value={ratingForm.review}
                  onChange={(e) => setRatingForm({ ...ratingForm, review: e.target.value })}
                  placeholder="Share your experience..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRatingForm(false);
                    setRatingForm({ appointmentId: null, staffId: null, rating: 0, review: '' });
                  }}
                  className="px-3 py-1 border rounded dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (ratingForm.rating === 0) {
                      alert('Please select a rating');
                      return;
                    }
                    if (!customer || !customer.id) {
                      alert('Error: Customer information not found. Please refresh the page.');
                      return;
                    }
                    if (!ratingForm.staffId || ratingForm.staffId === 0) {
                      alert('Error: Staff information not found. Please ensure the appointment has an assigned staff member.');
                      return;
                    }
                    try {
                      const payload = {
                        customer_id: customer.id,
                        appointment_id: ratingForm.appointmentId,
                        rating: ratingForm.rating,
                        review: ratingForm.review || ''
                      };
                      console.log('Submitting rating:', payload);
                      console.log('Staff ID:', ratingForm.staffId);
                      const response = await axios.post(
                        `${API_BASE_URL}/api/staff/${ratingForm.staffId}/ratings`,
                        payload
                      );
                      console.log('Rating submitted successfully:', response.data);
                      setShowRatingForm(false);
                      setRatingForm({ appointmentId: null, staffId: null, rating: 0, review: '' });
                      alert('Thank you for your rating!');
                      // Refresh appointments to show updated data
                      const appointmentsRes = await axios.get(`${API_BASE_URL}/api/appointments/user/${user.id}`);
                      setAppointments(appointmentsRes.data || []);
                    } catch (err) {
                      console.error('Error submitting rating:', err);
                      console.error('Error details:', err.response?.data);
                      console.error('Error status:', err.response?.status);
                      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit rating';
                      alert(`Error: ${errorMessage}`);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Settings</h3>
          
          {profileError && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded">
              {profileError}
            </div>
          )}
          
          {profileSuccess && (
            <div className="mb-4 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded">
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password (leave blank to keep current)
              </label>
              <PasswordInput
                className="w-full border rounded px-3 py-2 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={profileForm.password}
                onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
              />
            </div>

            {profileForm.password && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <PasswordInput
                    className="w-full border rounded px-3 py-2 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password (required to change password)
                  </label>
                  <PasswordInput
                    className="w-full border rounded px-3 py-2 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Update Profile
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t dark:border-gray-700">
            <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Audit Trail</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Showing {auditLogs.length} of {auditPagination.totalItems} actions (Page {auditPagination.currentPage} of {auditPagination.totalPages})
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  const params = new URLSearchParams({
                    page: auditPagination.currentPage.toString(),
                    sortBy: auditSortBy,
                    sortOrder: auditSortOrder,
                  });
                  const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
                  setAuditLogs(auditRes.data.logs || []);
                  setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
                } catch (err) {
                  console.error('Error refreshing audit logs:', err);
                }
              }}
              className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh
            </button>
          </div>

          {/* Sorting Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Sort by:</label>
              <select
                value={auditSortBy}
                onChange={(e) => {
                  setAuditSortBy(e.target.value);
                  setAuditPagination({ ...auditPagination, currentPage: 1 });
                }}
                className="px-3 py-1.5 border rounded text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="created_at">Date</option>
                <option value="action">Activity Type</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Order:</label>
              <select
                value={auditSortOrder}
                onChange={(e) => {
                  setAuditSortOrder(e.target.value);
                  setAuditPagination({ ...auditPagination, currentPage: 1 });
                }}
                className="px-3 py-1.5 border rounded text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
          </div>
          
          {auditLogs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No audit entries yet.</p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {log.user_name || 'System'} • {log.user_role || 'N/A'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {auditPagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-4 border-t dark:border-gray-700">
                  <button
                    onClick={async () => {
                      if (auditPagination.currentPage > 1) {
                        const newPage = auditPagination.currentPage - 1;
                        setAuditPagination({ ...auditPagination, currentPage: newPage });
                        const params = new URLSearchParams({
                          page: newPage.toString(),
                          sortBy: auditSortBy,
                          sortOrder: auditSortOrder,
                        });
                        const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
                        setAuditLogs(auditRes.data.logs || []);
                        setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
                      }
                    }}
                    disabled={auditPagination.currentPage === 1}
                    className="px-3 py-1.5 text-xs sm:text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Page {auditPagination.currentPage} of {auditPagination.totalPages}
                  </span>
                  <button
                    onClick={async () => {
                      if (auditPagination.currentPage < auditPagination.totalPages) {
                        const newPage = auditPagination.currentPage + 1;
                        setAuditPagination({ ...auditPagination, currentPage: newPage });
                        const params = new URLSearchParams({
                          page: newPage.toString(),
                          sortBy: auditSortBy,
                          sortOrder: auditSortOrder,
                        });
                        const auditRes = await axios.get(`${API_BASE_URL}/api/audit/user/${user.id}?${params}`);
                        setAuditLogs(auditRes.data.logs || []);
                        setAuditPagination(auditRes.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
                      }
                    }}
                    disabled={auditPagination.currentPage === auditPagination.totalPages}
                    className="px-3 py-1.5 text-xs sm:text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
