import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CustomerHeader from '../components/customer/CustomerHeader';
import CustomerSidebar from '../components/customer/CustomerSidebar';

export default function Customers() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activePanel, setActivePanel] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Active', 'Inactive'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    name: '',
    service: '',
    walked_in: '',
    visits: 0,
    status: 'Active',
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer`);
      setCustomers(res.data);
      if (selectedCustomer) {
        const updated = res.data.find((c) => c.id === selectedCustomer.id);
        setSelectedCustomer(updated || res.data[0] || null);
      } else if (res.data.length) {
        setSelectedCustomer(res.data[0]);
      }
    } catch (err) {
      console.error('API error:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!selectedCustomer && customers.length) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/customer/${editingId}`, {
          ...form,
          userId: user?.id,
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/customer`, {
          ...form,
          userId: user?.id,
        });
      }
      setForm({ name: '', service: '', walked_in: '', visits: 0, status: 'Active' });
      setEditingId(null);
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleArchive = async (customer) => {
    if (confirm(`Archive ${customer.name}? This will set their status to Inactive.`)) {
      try {
        await axios.put(`${API_BASE_URL}/api/customer/${customer.id}`, {
          name: customer.name,
          service: customer.service,
          walked_in: customer.walked_in,
          visits: customer.visits || 0,
          status: 'Inactive',
          booking_disabled: customer.booking_disabled || false,
          userId: user?.id,
        });
        if (selectedCustomer?.id === customer.id) {
          setSelectedCustomer(null);
        }
        fetchCustomers();
      } catch (err) {
        console.error('Archive error:', err);
        alert('Failed to archive customer');
      }
    }
  };

  const startEdit = (customer) => {
    setForm({
      name: customer.name,
      service: customer.service,
      walked_in: customer.walked_in?.slice(0, 10) || '',
      visits: customer.visits || 0,
      status: customer.status,
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter((customer) => customer.status === statusFilter);
    }
    
    return filtered;
  }, [customers, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const OverviewPanel = () => (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-dots">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold gradient-text dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                Customers
              </h3>
              <div className="flex gap-2">
                <select
                  className="border-2 border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 dark:text-white bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <input
                  className="border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm dark:bg-gray-700 dark:text-white bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm hover:shadow-md w-40 sm:w-48"
                  placeholder="🔍 Search customer"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-auto max-h-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Service</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.length > 0 ? (
                    paginatedCustomers.map((c, idx) => (
                      <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-green-50/50 dark:hover:from-blue-900/20 dark:hover:to-green-900/20 transition-all duration-200 animate-slideInFromLeft" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-xs">
                              {c.name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                            {c.booking_disabled ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium shadow-sm animate-pulse" title="Booking Disabled - No-Show">
                               ⚠️
                            </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium shadow-sm" title="Booking Enabled">
                                ✓
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium">
                            {c.service}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                              c.status === 'Active'
                                ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300'
                                : c.status === 'Expired'
                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-300'
                                : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedCustomer(c)}
                              className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95"
                              title="Select Customer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => startEdit(c)} 
                              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95"
                              title="Edit Customer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleArchive(c)}
                              className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95"
                              title="Archive Customer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-green-900/20 rounded-2xl shadow-2xl border-2 border-transparent bg-clip-padding overflow-hidden card-3d pattern-grid">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-green-500/5 to-purple-500/5"></div>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-green-500 to-purple-500 animate-shimmer"></div>
          <div className="absolute -top-2 -right-2 w-32 h-32 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative z-10 p-4 space-y-4">
            <h3 className="text-lg font-bold gradient-text dark:text-white flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Customer Snapshot
            </h3>
            {selectedCustomer ? (
              <>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-700 dark:to-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-md">
                  <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <p className="text-2xl font-bold gradient-text dark:text-white">{selectedCustomer.status}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 rounded-xl border-2 border-green-200 dark:border-green-700 shadow-md">
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Service</p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedCustomer.service}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-md">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Walked in on
                  </p>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{selectedCustomer.walked_in?.slice(0, 10) || 'N/A'}</p>
                </div>
                {selectedCustomer.booking_disabled && (
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl shadow-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200 mb-1">Booking Disabled</p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                          Customer has a No-Show appointment. Booking is temporarily disabled.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await axios.put(`${API_BASE_URL}/api/customer/${selectedCustomer.id}/toggle-booking`, {
                            userId: user?.id,
                          });
                          fetchCustomers();
                          alert('Booking has been re-enabled for this customer.');
                        } catch (err) {
                          console.error('Error re-enabling booking:', err);
                          alert('Failed to re-enable booking');
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 btn-creative"
                    >
                      ✓ Re-enable Booking
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a customer to view insight.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className="space-y-4 min-h-screen p-4 sm:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      <CustomerHeader
        customer={selectedCustomer}
        onAdd={() => {
          setForm({
            name: '',
            service: '',
            walked_in: '',
            visits: 0,
            status: 'Active'
          });
          setEditingId(null);
          setShowForm(true);
        }}
        onRefresh={fetchCustomers}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <CustomerSidebar active={activePanel} onChange={setActivePanel} />
        <div className="flex-1">
          {activePanel === 'overview' && <OverviewPanel />}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-4 w-full max-w-md shadow-lg">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
            <input
              className="w-full border rounded p-2"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Service"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              required
            />
            <input
              type="date"
              className="w-full border rounded p-2"
              value={form.walked_in}
              onChange={(e) => setForm({ ...form, walked_in: e.target.value })}
              required
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Visits"
              value={form.visits}
              onChange={(e) => setForm({ ...form, visits: e.target.value })}
              required
            />
            
            <select
              className="w-full border rounded p-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1 border rounded"
              >
                Cancel
              </button>
              <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

