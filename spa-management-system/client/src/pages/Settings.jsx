import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { user } = useAuth();
  const { portalColors, updateColors, resetColors, logo, updateLogo, removeLogo, darkMode, adminColors } = useTheme();
  const [form, setForm] = useState({ gymName: 'WCM HAIR AND NAIL SALON', contact: '', address: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
  const [auditSortBy, setAuditSortBy] = useState('created_at');
  const [auditSortOrder, setAuditSortOrder] = useState('DESC');
  const [auditSortByUser, setAuditSortByUser] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [users, setUsers] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activePortal, setActivePortal] = useState('admin'); // admin, customer, staff
  const [colorForm, setColorForm] = useState(portalColors[activePortal] || portalColors.admin);
  const [logoInput, setLogoInput] = useState('');

  // Fetch users for the filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/users`);
        setUsers(res.data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch staff users for the staff filter dropdown
  useEffect(() => {
    const fetchStaffUsers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/users/staff`);
        setStaffUsers(res.data || []);
      } catch (err) {
        console.error('Error fetching staff users:', err);
      }
    };
    fetchStaffUsers();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = new URLSearchParams({
          page: '1',
          sortBy: auditSortBy,
          sortOrder: auditSortOrder,
        });
        if (auditSortByUser) {
          params.set('sortBy', 'user_name');
        }
        if (selectedUserId) {
          params.set('userId', selectedUserId);
        }
        if (selectedStaffId) {
          params.set('staffId', selectedStaffId);
          // Clear userId when staff is selected
          params.delete('userId');
        }
        const res = await axios.get(`${API_BASE_URL}/api/audit?${params}`);
        setAuditLogs(res.data.logs || []);
        setAuditPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
      } catch (err) {
        console.error('Audit load error:', err);
      }
    };
    fetch();
  }, [auditSortBy, auditSortOrder, auditSortByUser, selectedUserId, selectedStaffId]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = new URLSearchParams({
          page: auditPagination.currentPage.toString(),
          sortBy: auditSortBy,
          sortOrder: auditSortOrder,
        });
        if (auditSortByUser) {
          params.set('sortBy', 'user_name');
        }
        if (selectedUserId) {
          params.set('userId', selectedUserId);
        }
        if (selectedStaffId) {
          params.set('staffId', selectedStaffId);
          params.delete('userId');
        }
        const res = await axios.get(`${API_BASE_URL}/api/audit?${params}`);
        setAuditLogs(res.data.logs || []);
        setAuditPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
      } catch (err) {
        console.error('Audit load error:', err);
      }
    };
    fetch();
  }, [auditPagination.currentPage]);

  useEffect(() => {
    setColorForm(portalColors[activePortal] || portalColors.admin);
  }, [activePortal, portalColors]);

  const handleColorChange = (key, value) => {
    setColorForm({ ...colorForm, [key]: value });
  };

  const handleSaveColors = () => {
    updateColors(activePortal, colorForm);
    alert(`${activePortal.charAt(0).toUpperCase() + activePortal.slice(1)} portal colors saved successfully!`);
  };

  const handleLogoSubmit = () => {
    if (logoInput.trim()) {
      updateLogo(logoInput.trim());
      setLogoInput('');
      alert('Logo updated successfully!');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateLogo(reader.result);
        alert('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/api/audit`, {
        userId: user?.id,
        action: `${user?.name || 'User'} updated gym settings`,
      });
      fetchAudit();
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setSaving(false);
    }
  };

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
      {/* Custom Colors Section */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Custom Colors</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
            Customize navigation colors for each portal independently using hex codes. Each portal can have its own unique color scheme.
          </p>
        </div>

        {/* Portal Selection Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {['admin', 'customer', 'staff'].map((portal) => (
              <button
                key={portal}
                onClick={() => setActivePortal(portal)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activePortal === portal
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {portal.charAt(0).toUpperCase() + portal.slice(1)} Portal
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Editing: <span className="capitalize">{activePortal} Portal</span>
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Light Mode Colors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Light Mode</h3>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient Start (Top)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.gradientStart}
                  onChange={(e) => handleColorChange('gradientStart', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.gradientStart}
                  onChange={(e) => handleColorChange('gradientStart', e.target.value)}
                  placeholder="#2563eb"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient Middle</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.gradientMiddle}
                  onChange={(e) => handleColorChange('gradientMiddle', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.gradientMiddle}
                  onChange={(e) => handleColorChange('gradientMiddle', e.target.value)}
                  placeholder="#60a5fa"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient End (Bottom)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.gradientEnd}
                  onChange={(e) => handleColorChange('gradientEnd', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.gradientEnd}
                  onChange={(e) => handleColorChange('gradientEnd', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.textColor}
                  onChange={(e) => handleColorChange('textColor', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.textColor}
                  onChange={(e) => handleColorChange('textColor', e.target.value)}
                  placeholder="#fef9c3"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Dark Mode Colors */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Dark Mode</h3>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient Start (Top)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.darkGradientStart}
                  onChange={(e) => handleColorChange('darkGradientStart', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.darkGradientStart}
                  onChange={(e) => handleColorChange('darkGradientStart', e.target.value)}
                  placeholder="#1e3a8a"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient Middle</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.darkGradientMiddle}
                  onChange={(e) => handleColorChange('darkGradientMiddle', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.darkGradientMiddle}
                  onChange={(e) => handleColorChange('darkGradientMiddle', e.target.value)}
                  placeholder="#1d4ed8"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Gradient End (Bottom)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.darkGradientEnd}
                  onChange={(e) => handleColorChange('darkGradientEnd', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.darkGradientEnd}
                  onChange={(e) => handleColorChange('darkGradientEnd', e.target.value)}
                  placeholder="#1f2937"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colorForm.darkTextColor}
                  onChange={(e) => handleColorChange('darkTextColor', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={colorForm.darkTextColor}
                  onChange={(e) => handleColorChange('darkTextColor', e.target.value)}
                  placeholder="#fef08a"
                  className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveColors}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            Save {activePortal.charAt(0).toUpperCase() + activePortal.slice(1)} Portal Colors
          </button>
          <button
            onClick={() => {
              resetColors(activePortal);
              setColorForm(portalColors[activePortal] || portalColors.admin);
              alert(`${activePortal.charAt(0).toUpperCase() + activePortal.slice(1)} portal colors reset to default!`);
            }}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
          >
            Reset {activePortal.charAt(0).toUpperCase() + activePortal.slice(1)} Portal
          </button>
          <button
            onClick={() => {
              resetColors();
              setColorForm(portalColors[activePortal] || portalColors.admin);
              alert('All portal colors reset to default!');
            }}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
          >
            Reset All Portals
          </button>
        </div>
      </div>

      {/* Logo Section */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900 dark:text-white">Custom Logo</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload or enter a URL for your logo. It will appear in the navigation bar and sidebar.
          </p>
        </div>

        <div className="space-y-4">
          {/* Logo Preview */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-700">
              {logo ? (
                <img src={logo} alt="Custom Logo" className="max-w-full max-h-full object-contain rounded" />
              ) : (
                <div className="text-center p-2">
                  <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-gray-400 mt-1">No Logo</p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Logo Preview</p>
              {logo && (
                <button
                  onClick={removeLogo}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove Logo
                </button>
              )}
            </div>
          </div>

          {/* Logo URL Input */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Logo URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                placeholder="https://example.com/logo.png or data:image/..."
                className="flex-1 p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={handleLogoSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Set Logo
              </button>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Upload Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supported formats: PNG, JPG, SVG, GIF</p>
          </div>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-2 text-gray-900 dark:text-white">WCM Settings</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Update branding and contact information. Saving creates an audit record.
            </p>
          </div>
          <input
            className="p-2 border rounded w-full text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Gym Name"
            value={form.gymName}
            onChange={(e) => setForm({ ...form, gymName: e.target.value })}
          />
          <input
            className="p-2 border rounded w-full text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Contact Number"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <input
            className="p-2 border rounded w-full text-sm sm:text-base dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <button
            className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded disabled:opacity-70 text-sm sm:text-base"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Audit Trail</h3>
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
                if (auditSortByUser) {
                  params.set('sortBy', 'user_name');
                }
                if (selectedUserId) {
                  params.set('userId', selectedUserId);
                }
                if (selectedStaffId) {
                  params.set('staffId', selectedStaffId);
                  params.delete('userId');
                }
                const res = await axios.get(`${API_BASE_URL}/api/audit?${params}`);
                setAuditLogs(res.data.logs || []);
                setAuditPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
              } catch (err) {
                console.error('Audit load error:', err);
              }
            }} 
            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Refresh
          </button>
        </div>

        {/* Filtering and Sorting Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Filter by User:</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setSelectedStaffId(''); // Clear staff filter when user is selected
                setAuditPagination({ ...auditPagination, currentPage: 1 });
              }}
              className="px-3 py-1.5 border rounded text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Filter by Staff:</label>
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setSelectedUserId(''); // Clear user filter when staff is selected
                setAuditPagination({ ...auditPagination, currentPage: 1 });
              }}
              className="px-3 py-1.5 border rounded text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Staff</option>
              {staffUsers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
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
              <option value="user_name">User</option>
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
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No audit entries yet.</p>
        ) : (
          <>
            <ul className="space-y-3 mb-4">
              {auditLogs.map((log) => (
                <li key={log.id} className="border rounded-lg p-3 text-xs sm:text-sm flex flex-col sm:flex-row justify-between gap-2 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {log.user_name || 'System'} • {log.user_role || 'N/A'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>

            {/* Pagination Controls */}
            {auditPagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={async () => {
                    if (auditPagination.currentPage > 1) {
                      const newPage = auditPagination.currentPage - 1;
                      setAuditPagination({ ...auditPagination, currentPage: newPage });
                      try {
                        const params = new URLSearchParams({
                          page: newPage.toString(),
                          sortBy: auditSortBy,
                          sortOrder: auditSortOrder,
                        });
                        if (auditSortByUser) {
                          params.set('sortBy', 'user_name');
                        }
                        if (selectedUserId) {
                          params.set('userId', selectedUserId);
                        }
                        if (selectedStaffId) {
                          params.set('staffId', selectedStaffId);
                          params.delete('userId');
                        }
                        const res = await axios.get(`${API_BASE_URL}/api/audit?${params}`);
                        setAuditLogs(res.data.logs || []);
                        setAuditPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
                      } catch (err) {
                        console.error('Audit load error:', err);
                      }
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
                      try {
                        const params = new URLSearchParams({
                          page: newPage.toString(),
                          sortBy: auditSortBy,
                          sortOrder: auditSortOrder,
                        });
                        if (auditSortByUser) {
                          params.set('sortBy', 'user_name');
                        }
                        if (selectedUserId) {
                          params.set('userId', selectedUserId);
                        }
                        if (selectedStaffId) {
                          params.set('staffId', selectedStaffId);
                          params.delete('userId');
                        }
                        const res = await axios.get(`${API_BASE_URL}/api/audit?${params}`);
                        setAuditLogs(res.data.logs || []);
                        setAuditPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
                      } catch (err) {
                        console.error('Audit load error:', err);
                      }
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
    </div>
  );
}
