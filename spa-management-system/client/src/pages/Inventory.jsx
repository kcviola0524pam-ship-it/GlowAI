import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Inventory() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [products, setProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'General',
    price: '',
    cost: '',
    stock_quantity: '',
    min_stock_level: '10',
    sku: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockToAdd, setStockToAdd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/inventory`);
      setProducts(res.data);
    } catch (err) {
      console.error('API error:', err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/inventory/alerts/low-stock`);
      setLowStockAlerts(res.data);
    } catch (err) {
      console.error('Low stock error:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLowStock();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // When editing, get current stock and don't change it
        const currentProduct = products.find(p => p.id === editingId);
        await axios.put(`${API_BASE_URL}/api/inventory/${editingId}`, {
          ...form,
          stock_quantity: currentProduct.stock_quantity, // Keep current stock
          userId: user?.id,
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/inventory`, {
          ...form,
          userId: user?.id,
        });
      }
      setForm({
        name: '',
        description: '',
        category: 'General',
        price: '',
        cost: '',
        stock_quantity: '',
        min_stock_level: '10',
        sku: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchProducts();
      fetchLowStock();
    } catch (err) {
      console.error('Save error:', err);
      alert(err.response?.data?.error || 'Error saving product');
    }
  };

  const handleAddStock = async () => {
    if (!stockToAdd || parseInt(stockToAdd) <= 0) {
      alert('Please enter a valid quantity to add');
      return;
    }

    try {
      const currentStock = selectedProduct.stock_quantity;
      const newStock = currentStock + parseInt(stockToAdd);
      
      await axios.put(`${API_BASE_URL}/api/inventory/${selectedProduct.id}`, {
        name: selectedProduct.name,
        description: selectedProduct.description || '',
        category: selectedProduct.category || 'General',
        price: selectedProduct.price,
        cost: selectedProduct.cost || 0,
        stock_quantity: newStock,
        min_stock_level: selectedProduct.min_stock_level,
        sku: selectedProduct.sku || '',
        userId: user?.id,
      });

      setShowAddStockModal(false);
      setSelectedProduct(null);
      setStockToAdd('');
      fetchProducts();
      fetchLowStock();
      alert(`Successfully added ${stockToAdd} units to ${selectedProduct.name}`);
    } catch (err) {
      console.error('Add stock error:', err);
      alert(err.response?.data?.error || 'Error adding stock');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/inventory/${id}?userId=${user?.id}`);
        fetchProducts();
        fetchLowStock();
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const startEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      category: product.category || 'General',
      price: product.price,
      cost: product.cost || '',
      stock_quantity: '', // Don't include stock in edit form
      min_stock_level: product.min_stock_level,
      sku: product.sku || '',
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const openAddStockModal = (product) => {
    setSelectedProduct(product);
    setStockToAdd('');
    setShowAddStockModal(true);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group products by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const category = product.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});

  const categories = Object.keys(productsByCategory).sort();

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div 
      className="space-y-4 sm:space-y-6 min-h-screen w-full max-w-full min-w-0 p-3 sm:p-4 md:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Inventory Management</h2>
        <button
          onClick={() => {
            setForm({
              name: '',
              description: '',
              category: 'General',
              price: '',
              cost: '',
              stock_quantity: '',
              min_stock_level: '10',
              sku: '',
            });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base whitespace-nowrap"
        >
          + Add Product
        </button>
      </div>

      {lowStockAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2 text-sm sm:text-base">⚠️ Low Stock Alerts ({lowStockAlerts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {lowStockAlerts.map((product) => (
              <div key={product.id} className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                {product.name}: {product.stock_quantity} left
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Products</h3>
          <input
            className="border rounded px-3 py-1.5 text-sm w-full sm:w-auto dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
                    ({productsByCategory[category].length} {productsByCategory[category].length === 1 ? 'product' : 'products'})
                  </span>
                </div>
              </button>
              
              {expandedCategories.has(category) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
                    <thead className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="py-2 pr-2 pl-4">Name</th>
                        <th className="py-2 pr-2 hidden sm:table-cell">SKU</th>
                        <th className="py-2 pr-2">Price</th>
                        <th className="py-2 pr-2 hidden md:table-cell">Cost</th>
                        <th className="py-2 pr-2">Stock</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsByCategory[category].map((product) => (
                        <tr key={product.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 pl-4 text-gray-900 dark:text-white">{product.name}</td>
                          <td className="py-2 pr-2 text-gray-900 dark:text-white hidden sm:table-cell">{product.sku || '-'}</td>
                          <td className="py-2 pr-2 text-gray-900 dark:text-white">PHP{parseFloat(product.price).toFixed(2)}</td>
                          <td className="py-2 pr-2 text-gray-900 dark:text-white hidden md:table-cell">PHP{parseFloat(product.cost || 0).toFixed(2)}</td>
                          <td className="py-2 pr-2">
                            <span
                              className={`font-medium ${
                                product.stock_quantity <= product.min_stock_level
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            {product.stock_quantity <= product.min_stock_level ? (
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">Low</span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">OK</span>
                            )}
                          </td>
                          <td className="py-2 space-x-2">
                            <button
                              onClick={() => startEdit(product)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openAddStockModal(product)}
                              className="text-green-600 dark:text-green-400 hover:underline text-sm"
                            >
                              Add Stock
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 dark:text-red-400 hover:underline text-sm"
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
            className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {editingId ? 'Edit Product' : 'Add Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter product name"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter product description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU (Stock Keeping Unit)
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter SKU (optional)"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option>General</option>
                <option>Nail Care</option>
                <option>Hair Care</option>
                <option>Skincare</option>
                <option>Tools</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Price (PHP) <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cost (PHP)
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            </div>

            {!editingId && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Initial Stock Quantity
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    type="number"
                    placeholder="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    type="number"
                    placeholder="10"
                    value={form.min_stock_level}
                    onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                  />
                </div>
              </div>
            )}

            {editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Stock Level
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  type="number"
                  placeholder="10"
                  value={form.min_stock_level}
                  onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && selectedProduct && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Add Stock</h3>
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setSelectedProduct(null);
                  setStockToAdd('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Product:</span> {selectedProduct.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">Current Stock:</span> {selectedProduct.stock_quantity}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity to Add <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                required
              />
            </div>

            {stockToAdd && parseInt(stockToAdd) > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">New Stock:</span>{' '}
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {selectedProduct.stock_quantity + parseInt(stockToAdd)}
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddStockModal(false);
                  setSelectedProduct(null);
                  setStockToAdd('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStock}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

