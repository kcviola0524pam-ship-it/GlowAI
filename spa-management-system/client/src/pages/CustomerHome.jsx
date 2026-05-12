import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import AIChat from '../components/AIChat';
import { formatAppointmentDate } from '../utils/dateHelpers';

export default function CustomerHome() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [aiChatRecommendations, setAiChatRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const fetchCustomerData = async () => {
    if (!user || user.role !== 'customer') {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/user/${user.id}`);
      setCustomer(res.data);
      
      // Fetch appointments
      try {
        const appointmentsRes = await axios.get(`${API_BASE_URL}/api/appointments/user/${user.id}`);
        console.log('Fetched appointments for customer:', appointmentsRes.data);
        const fetchedAppointments = appointmentsRes.data || [];
        console.log('Total appointments fetched:', fetchedAppointments.length);
        console.log('Appointment details:', fetchedAppointments.map(apt => ({
          id: apt.id,
          service: apt.service,
          date: apt.appointment_date,
          time: apt.appointment_time,
          status: apt.status
        })));
        setAppointments(fetchedAppointments);
      } catch (apptErr) {
        console.error('Error fetching appointments:', apptErr);
        if (apptErr.response?.status === 404) {
          // Customer not found or no appointments - this is okay
          setAppointments([]);
        } else {
          setAppointments([]);
        }
      }

      // Fetch AI recommendations if customer exists
      if (res.data && res.data.id) {
        setLoadingRecommendations(true);
        try {
          const recRes = await axios.get(`${API_BASE_URL}/api/recommendations/customer/${res.data.id}`);
          setRecommendations(recRes.data);
        } catch (recErr) {
          console.error('Error fetching recommendations:', recErr);
        } finally {
          setLoadingRecommendations(false);
        }
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      setCustomer(null);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [user]);

  // Listen for appointment creation events from other pages
  useEffect(() => {
    const handleAppointmentCreated = () => {
      console.log('Appointment created event received, refreshing appointments...');
      fetchCustomerData();
    };

    window.addEventListener('appointmentCreated', handleAppointmentCreated);
    return () => {
      window.removeEventListener('appointmentCreated', handleAppointmentCreated);
    };
  }, [user]);

  // Filter appointments into upcoming and past using useMemo for performance
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const currentTime = new Date();
    console.log('Current time for comparison:', currentTime);
    console.log('All appointments before filtering:', appointments);
    
    const upcoming = appointments.filter(apt => {
      if (!apt.appointment_date || !apt.appointment_time) {
        console.log('Appointment missing date or time:', apt);
        return false;
      }
      
      // Only show scheduled appointments in upcoming
      if (apt.status !== 'Scheduled') {
        return false;
      }
      
      try {
        // Parse date (could be YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format)
        const datePart = apt.appointment_date.includes('T') 
          ? apt.appointment_date.split('T')[0] 
          : apt.appointment_date;
        
        // Parse time (could be HH:MM:SS or HH:MM format)
        let timePart = apt.appointment_time;
        if (timePart.includes('.')) {
          timePart = timePart.split('.')[0]; // Remove milliseconds if present
        }
        if (timePart.length > 8) {
          timePart = timePart.substring(0, 8); // Limit to HH:MM:SS
        }
        
        // Ensure time has at least HH:MM format
        if (timePart.length < 5) {
          console.error('Invalid time format:', apt.appointment_time);
          return false;
        }
        
        // Combine date and time
        const dateStr = `${datePart}T${timePart}`;
        const aptDate = new Date(dateStr);
        
        // Validate the date is valid
        if (isNaN(aptDate.getTime())) {
          console.error('Invalid date parsed:', apt, 'dateStr:', dateStr);
          return false;
        }
        
        // Check if appointment is in the future (including today if time hasn't passed)
        const isUpcoming = aptDate >= currentTime;
        
        if (isUpcoming) {
          console.log('Found upcoming appointment:', {
            id: apt.id,
            service: apt.service,
            date: aptDate,
            currentTime: currentTime,
            status: apt.status,
            parsedDate: dateStr,
            isFuture: aptDate >= currentTime
          });
        } else {
          console.log('Appointment filtered out (past or invalid):', {
            id: apt.id,
            service: apt.service,
            date: aptDate,
            currentTime: currentTime,
            status: apt.status
          });
        }
        
        return isUpcoming;
      } catch (e) {
        console.error('Error parsing appointment date:', apt, e);
        return false;
      }
    }).sort((a, b) => {
      // Sort scheduled appointments by date/time
      try {
        const dateAStr = a.appointment_date.includes('T') ? a.appointment_date.split('T')[0] : a.appointment_date;
        let timeAStr = a.appointment_time.includes('.') ? a.appointment_time.split('.')[0] : a.appointment_time;
        if (timeAStr.length > 8) timeAStr = timeAStr.substring(0, 8);
        
        const dateBStr = b.appointment_date.includes('T') ? b.appointment_date.split('T')[0] : b.appointment_date;
        let timeBStr = b.appointment_time.includes('.') ? b.appointment_time.split('.')[0] : b.appointment_time;
        if (timeBStr.length > 8) timeBStr = timeBStr.substring(0, 8);
        
        const dateA = new Date(`${dateAStr}T${timeAStr}`);
        const dateB = new Date(`${dateBStr}T${timeBStr}`);
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    });
    
    console.log('Upcoming appointments count:', upcoming.length);
    console.log('Upcoming appointments:', upcoming);
    
    const past = appointments.filter(apt => {
    if (!apt.appointment_date || !apt.appointment_time) return false;
    
    try {
      // Parse date (could be YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format)
      const datePart = apt.appointment_date.includes('T') 
        ? apt.appointment_date.split('T')[0] 
        : apt.appointment_date;
      
      // Parse time (could be HH:MM:SS or HH:MM format)
      let timePart = apt.appointment_time;
      if (timePart.includes('.')) {
        timePart = timePart.split('.')[0]; // Remove milliseconds if present
      }
      if (timePart.length > 8) {
        timePart = timePart.substring(0, 8); // Limit to HH:MM:SS
      }
      
      // Combine date and time
      const dateStr = `${datePart}T${timePart}`;
      const aptDate = new Date(dateStr);
      
      // Validate the date is valid
      if (isNaN(aptDate.getTime())) {
        console.error('Invalid date parsed:', apt);
        return false;
      }
      
      // Check if appointment is in the past or has been completed/cancelled/no-show
      const isPast = aptDate < currentTime || apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'No-Show';
        return isPast;
      } catch (e) {
        console.error('Error parsing appointment date:', apt, e);
        return false;
      }
    });

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Welcome back, {user?.name}</h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
          Manage your spa and salon services.
        </p>
      </div>

      {/* AI Recommendations Section (merged chat + history-based) */}
      {((aiChatRecommendations && aiChatRecommendations.length > 0) || 
        (recommendations && recommendations.recommendations && recommendations.recommendations.length > 0)) && (
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-green-900/20 rounded-xl shadow-sm p-4 sm:p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">AI-Powered Service Recommendations</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {aiChatRecommendations && aiChatRecommendations.length > 0 
              ? "Based on our conversation and your booking history, here are personalized recommendations:"
              : "Based on your booking history and preferences, we recommend these services:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Prioritize chat recommendations, fallback to history-based */}
            {((aiChatRecommendations && aiChatRecommendations.length > 0 ? aiChatRecommendations : (recommendations && recommendations.recommendations ? recommendations.recommendations : [])) || []).map((rec, index) => {
              if (!rec || !rec.service) return null;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{rec.service.name || 'Service'}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      rec.confidence === 'High'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : rec.confidence === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {rec.confidence || 'Medium'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {rec.service.description || 'Professional service'}
                  </p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      PHP{parseFloat(rec.service.price || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {rec.service.duration_minutes || 0} min
                    </span>
                  </div>
                  {rec.service.category && (
                    <div className="mb-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {rec.service.category}
                      </span>
                    </div>
                  )}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Why we recommend:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {(rec.reasons || []).slice(0, 2).map((reason, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Match Score: {rec.score || 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {customer ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3">
            <p className="text-sm uppercase text-gray-400 dark:text-gray-500">Service</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {customer.service || 'Nail Care'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your preferred service</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3 relative overflow-hidden">
            {/* Scissors icon decoration */}
            <div className="absolute top-2 right-2 opacity-20">
              <svg className="w-12 h-12 text-blue-400 animate-wiggle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
            </div>
            <p className="text-sm uppercase text-gray-400 dark:text-gray-500">Total Visits</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {customer.visits || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Number of visits to our spa</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3 relative overflow-hidden">
            {/* Sparkle icon decoration */}
            <div className="absolute top-2 right-2 opacity-20">
              <svg className="w-12 h-12 text-yellow-400 animate-sparkle" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <p className="text-sm uppercase text-gray-400 dark:text-gray-500">Status</p>
            <p className={`text-2xl font-semibold ${
              customer.status === 'Active' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {customer.status || 'Active'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Account status</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3 relative overflow-hidden">
            {/* Massage wave icon decoration */}
            <div className="absolute top-2 right-2 opacity-20">
              <svg className="w-12 h-12 text-purple-400 animate-massage-wave" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-sm uppercase text-gray-400 dark:text-gray-500">First Visit</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {customer.walked_in ? new Date(customer.walked_in).toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Date you first visited</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            No customer profile found. Please contact support to set up your customer account.
          </p>
        </div>
      )}

      {/* Services Availed Section */}
      <div className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-dots">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
        <div className="absolute -top-2 -right-2 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h3 className="text-lg sm:text-xl font-bold gradient-text dark:text-white flex items-center gap-2 animate-slideInFromLeft">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              My Appointments
            </h3>
            <button
              onClick={fetchCustomerData}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 btn-creative"
              title="Refresh appointments"
            >
              🔄 Refresh
            </button>
          </div>
        
        {/* Upcoming Appointments */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Upcoming Appointments
              {upcomingAppointments.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {upcomingAppointments.length}
                </span>
              )}
            </h4>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                {appointments.length === 0 
                  ? 'No appointments found. Book your first appointment using the AI chatbot or in Settings & Appointments.' 
                  : 'No upcoming appointments scheduled. All appointments are in the past or completed.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => {
                // Format date and time for display
                const datePart = apt.appointment_date.includes('T') 
                  ? apt.appointment_date.split('T')[0] 
                  : apt.appointment_date;
                let timePart = apt.appointment_time;
                if (timePart.includes('.')) {
                  timePart = timePart.split('.')[0];
                }
                const displayTime = new Date(`2000-01-01T${timePart}`).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={apt.id}
                    className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-gradient-to-r from-blue-50/50 to-green-50/50 dark:from-blue-900/20 dark:to-green-900/20 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold text-gray-900 dark:text-white text-lg">{apt.service}</h5>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {apt.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            📅 {formatAppointmentDate(apt.appointment_date)}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                            🕐 {displayTime}
                          </p>
                          {apt.staff_name && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              👤 Staff: {apt.staff_name}
                            </p>
                          )}
                          {apt.notes && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 italic">
                              Note: {apt.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Appointments */}
        <div>
          <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Past Appointments</h4>
          {pastAppointments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No past appointments.</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="border rounded-lg p-4 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white">{apt.service}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatAppointmentDate(apt.appointment_date)} at{' '}
                        {new Date(`2000-01-01T${apt.appointment_time}`).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {apt.staff_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Staff: {apt.staff_name}
                        </p>
                      )}
                      {apt.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{apt.notes}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        apt.status === 'Completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : apt.status === 'Cancelled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* AI Chat Component */}
      {customer && customer.id && (
        <AIChat
          customerId={customer.id}
          onRecommendations={(recs) => {
            setAiChatRecommendations(recs);
          }}
          onAppointmentBooked={() => {
            // Refresh appointments when a new one is booked via chatbot
            console.log('Refreshing appointments after booking...');
            setTimeout(() => {
              fetchCustomerData();
            }, 1000); // Small delay to ensure database is updated
          }}
        />
      )}
    </div>
  );
}

