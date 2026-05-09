import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function StaffPortal({ activeTab: propActiveTab }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(propActiveTab || 'bookings');
  
  // Update activeTab when prop changes
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);
  const [bookings, setBookings] = useState([]);
  const [ratings, setRatings] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [staffId, setStaffId] = useState(null);

  // Get staff ID from user
  useEffect(() => {
    const fetchStaffId = async () => {
      if (!user) return;
      
      try {
        // Try to get staff by username first, then by email, then by name
        const res = await axios.get(`${API_BASE_URL}/api/staff`);
        const staff = res.data.find(s => 
          s.username === user.name || 
          s.email === user.email || 
          s.name === user.name
        );
        if (staff) {
          setStaffId(staff.id);
        } else {
          console.error('Staff member not found for user:', user);
        }
      } catch (err) {
        console.error('Error fetching staff ID:', err);
      }
    };
    
    fetchStaffId();
  }, [user]);

  const fetchStaffBookings = useCallback(async (id) => {
    if (!id) return;
    setLoadingBookings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff/${id}/bookings`);
      setBookings(res.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const fetchStaffRatings = useCallback(async (id) => {
    if (!id) return;
    setLoadingRatings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/staff/${id}/ratings`);
      setRatings(res.data);
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setRatings(null);
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  useEffect(() => {
    if (staffId && propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab, staffId]);

  useEffect(() => {
    if (staffId) {
      if (activeTab === 'bookings') {
        fetchStaffBookings(staffId);
      } else if (activeTab === 'ratings') {
        fetchStaffRatings(staffId);
      }
    }
  }, [staffId, activeTab, fetchStaffBookings, fetchStaffRatings]);

  if (!user || user.role !== 'staff') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-500 dark:text-red-400">Access Denied: Staff role required.</p>
      </div>
    );
  }

  if (!staffId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading staff information or staff not found...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Staff Portal</h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
          View your bookings and customer ratings.
        </p>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">My Bookings</h3>
          {loadingBookings ? (
            <p className="text-gray-500 dark:text-gray-400">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No bookings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{booking.customer_name}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{booking.service}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {new Date(booking.appointment_date).toLocaleDateString()}
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

      {/* Ratings Tab */}
      {activeTab === 'ratings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">My Ratings & Reviews</h3>
          {loadingRatings ? (
            <p className="text-gray-500 dark:text-gray-400">Loading ratings...</p>
          ) : !ratings || ratings.ratings.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No ratings or reviews yet.</p>
          ) : (
            <div>
              {ratings && ratings.averageRating !== undefined && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-4">
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
                </div>
              )}
              <div className="space-y-4">
                {ratings.ratings.map((rating) => (
                  <div
                    key={rating.id}
                    className="border rounded-lg p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{rating.customer_name}</p>
                        {rating.appointment_date && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(rating.appointment_date).toLocaleDateString()} • {rating.service}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
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
                      {new Date(rating.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
