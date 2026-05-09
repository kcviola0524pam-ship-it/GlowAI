import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Services() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'General',
    price: '',
    duration_minutes: 60,
    is_active: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/services/all`);
      setServices(res.data);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/services/${editingId}`, {
          ...form,
          userId: user?.id,
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/services`, {
          ...form,
          userId: user?.id,
        });
      }
      fetchServices();
      setShowForm(false);
      setEditingId(null);
      setForm({
        name: '',
        description: '',
        category: 'General',
        price: '',
        duration_minutes: 60,
        is_active: true,
      });
    } catch (err) {
      console.error('Error saving service:', err);
      alert(err.response?.data?.error || 'Failed to save service');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/services/${id}?userId=${user?.id}`);
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      alert(err.response?.data?.error || 'Failed to delete service');
    }
  };

  const startEdit = (service) => {
    setForm({
      name: service.name,
      description: service.description || '',
      category: service.category || 'General',
      price: service.price || '',
      duration_minutes: service.duration_minutes || 60,
      is_active: service.is_active !== undefined ? service.is_active : true,
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  const categories = Object.keys(servicesByCategory).sort();

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Loading services...</p>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Service Management</h2>
        <button
          onClick={() => {
            setForm({
              name: '',
              description: '',
              category: 'General',
              price: '',
              duration_minutes: 60,
              is_active: true,
            });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-base transition-colors"
        >
          + Add Service
        </button>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4">
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="border rounded-lg dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{expandedCategories.has(category) ? '▼' : '▶'}</span>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {category}
                  </h3>
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    ({servicesByCategory[category].length} {servicesByCategory[category].length === 1 ? 'service' : 'services'})
                  </span>
                </div>
              </button>
              
              {expandedCategories.has(category) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
                    <thead className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="py-2 pr-2 pl-4">Name</th>
                        <th className="py-2 pr-2">Price</th>
                        <th className="py-2 pr-2 hidden md:table-cell">Duration</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesByCategory[category].map((service) => (
                        <tr key={service.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 pr-2 pl-4 text-gray-900 dark:text-white">
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                                {service.description.substring(0, 50)}...
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-gray-900 dark:text-white">PHP{parseFloat(service.price || 0).toFixed(2)}</td>
                          <td className="py-2 pr-2 text-gray-900 dark:text-white hidden md:table-cell">{service.duration_minutes} min</td>
                          <td className="py-2 pr-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                service.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 space-x-1 sm:space-x-2">
                            <button
                              onClick={() => startEdit(service)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
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
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 space-y-4 w-full max-w-md"
          >
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Service' : 'Add Service'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Name *
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Nail Care">Nail Care</option>
                  <option value="Hair Care">Hair Care</option>
                  <option value="Skincare">Skincare</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (PHP)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={form.is_active ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border rounded text-sm dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

