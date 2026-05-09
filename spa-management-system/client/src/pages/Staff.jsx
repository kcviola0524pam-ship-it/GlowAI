import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import PasswordInput from "../components/PasswordInput";
import { formatAppointmentDate } from "../utils/dateHelpers";

export default function Staff() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [staffList, setStaffList] = useState([]);
  const [activeTab, setActiveTab] = useState('management'); // management, bookings, ratings
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [ratings, setRatings] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    username: "",
    email: "",
    password: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff`);
      setStaffList(res.data);
    } catch (err) {
      console.error("API error:", err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/staff/${editingId}`, {
          ...form,
          userId: user?.id,
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/staff`, {
          ...form,
          userId: user?.id,
        });
      }
      setForm({ name: "", role: "", username: "", email: "", password: "" });
      setEditingId(null);
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this staff member?")) {
      try {
        await axios.delete(`${API_BASE_URL}/api/staff/${id}?userId=${user?.id}`);
        fetchStaff();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const startEdit = (staff) => {
    setForm(staff);
    setEditingId(staff.id);
    setShowForm(true);
  };

  const fetchStaffBookings = React.useCallback(async (staffId) => {
    setLoadingBookings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff/${staffId}/bookings`);
      setBookings(res.data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchStaffRatings = React.useCallback(async (staffId) => {
    setLoadingRatings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff/${staffId}/ratings`);
      setRatings(res.data);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setRatings(null);
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  const handleStaffSelect = (staffId) => {
    setSelectedStaffId(staffId);
    if (activeTab === 'bookings') {
      fetchStaffBookings(staffId);
    } else if (activeTab === 'ratings') {
      fetchStaffRatings(staffId);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings' && selectedStaffId) {
      fetchStaffBookings(selectedStaffId);
    } else if (activeTab === 'ratings' && selectedStaffId) {
      fetchStaffRatings(selectedStaffId);
    }
  }, [activeTab, selectedStaffId, fetchStaffBookings, fetchStaffRatings]);

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
      {/* Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Staff Management</h2>
            <button
            onClick={() => {
              setForm({ name: "", role: "", username: "", email: "", password: "" });
              setEditingId(null);
              setShowForm(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            + Add Staff
          </button>
          
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => {
              setActiveTab('management');
              setSelectedStaffId(null);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'management'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Staff Management
          </button>
          <button
            onClick={() => {
              setActiveTab('bookings');
              setSelectedStaffId(null);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'bookings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => {
              setActiveTab('ratings');
              setSelectedStaffId(null);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ratings'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Ratings & Reviews
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'management' && (
          <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
          <thead className="text-gray-500 dark:text-gray-400">
            <tr>
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2 hidden sm:table-cell">Username</th>
              <th className="py-2 pr-2 hidden md:table-cell">Email</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((s) => (
              <tr key={s.id} className="border-t dark:border-gray-700">
                <td className="py-2 pr-2 text-gray-900 dark:text-white">{s.name}</td>
                <td className="py-2 pr-2 text-gray-900 dark:text-white">{s.role}</td>
                <td className="py-2 pr-2 text-gray-900 dark:text-white hidden sm:table-cell">{s.username}</td>
                <td className="py-2 pr-2 text-gray-900 dark:text-white hidden md:table-cell">{s.email}</td>
                <td className="py-2 space-x-1 sm:space-x-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-600 dark:text-red-400 hover:underline text-xs sm:text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}

        {activeTab === 'bookings' && (
          <div>
            {!selectedStaffId ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select a staff member to view their bookings:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {staffList.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => handleStaffSelect(staff.id)}
                      className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white">{staff.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{staff.role}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {staffList.find(s => s.id === selectedStaffId)?.name}'s Bookings
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total: {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Back to Staff List
                  </button>
                </div>
                {loadingBookings ? (
                  <p className="text-gray-500 dark:text-gray-400">Loading bookings...</p>
                ) : bookings.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No bookings found for this staff member.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-300">Customer Name</th>
                          <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-300">Service</th>
                          <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-300">Date</th>
                          <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-300">Time</th>
                          <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{booking.customer_name}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{booking.service}</td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                              {formatAppointmentDate(booking.appointment_date)}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">
                              {new Date(`2000-01-01T${booking.appointment_time}`).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  booking.status === 'Completed'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : booking.status === 'Scheduled'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : booking.status === 'Cancelled'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {booking.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ratings' && (
          <div>
            {!selectedStaffId ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Select a staff member to view their ratings and reviews:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {staffList.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => handleStaffSelect(staff.id)}
                      className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white">{staff.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{staff.role}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {staffList.find(s => s.id === selectedStaffId)?.name}'s Ratings & Reviews
                    </h3>
                    {ratings && ratings.averageRating !== undefined && (
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {ratings.averageRating.toFixed(1)}
                          </p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(ratings.averageRating || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {ratings.totalRatings || 0} review{(ratings.totalRatings || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Back to Staff List
                  </button>
                </div>
                {loadingRatings ? (
                  <p className="text-gray-500 dark:text-gray-400">Loading ratings...</p>
                ) : !ratings || ratings.ratings.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No ratings or reviews yet for this staff member.</p>
                ) : (
                  <div className="space-y-4">
                    {ratings.ratings.map((rating) => (
                      <div
                        key={rating.id}
                        className="border rounded-lg p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{rating.customer_name}</p>
                            {rating.appointment_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {rating.service} - {formatAppointmentDate(rating.appointment_date)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= rating.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        {rating.review && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{rating.review}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-4 w-full max-w-md"
          >
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {editingId ? "Edit Staff" : "Add Staff"}
            </h3>

            <input className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <input className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            />

            <input className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />

            <input className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            {!editingId && (
              <>
              <PasswordInput
                  className="w-full border rounded p-2 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1 border rounded dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
