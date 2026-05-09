import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function POS() {
  const { user } = useAuth();
  const { darkMode, adminColors } = useTheme();
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'services'

  useEffect(() => {
    fetchProducts();
    fetchServices();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/inventory`);
      setProducts(res.data.filter((p) => p.stock_quantity > 0));
    } catch (err) {
      console.error('Products error:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/services`);
      setServices(res.data.filter((s) => s.is_active !== false));
    } catch (err) {
      console.error('Services error:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Customers error:', err);
    }
  };

  const addToCart = (item, isService = false) => {
    if (isService) {
      // Handle services - they don't have stock limits
      const existingItem = cart.find((cartItem) => cartItem.service_id === item.id);
      if (existingItem) {
        setCart(
          cart.map((cartItem) =>
            cartItem.service_id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1, subtotal: (cartItem.quantity + 1) * cartItem.unit_price }
              : cartItem
          )
        );
      } else {
        setCart([
          ...cart,
          {
            service_id: item.id,
            product_name: item.name,
            quantity: 1,
            unit_price: parseFloat(item.price),
            subtotal: parseFloat(item.price),
            is_service: true,
          },
        ]);
      }
    } else {
      // Handle products - check stock
      const existingItem = cart.find((cartItem) => cartItem.product_id === item.id);
      if (existingItem) {
        if (existingItem.quantity >= item.stock_quantity) {
          alert('Not enough stock available');
          return;
        }
        setCart(
          cart.map((cartItem) =>
            cartItem.product_id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1, subtotal: (cartItem.quantity + 1) * cartItem.unit_price }
              : cartItem
          )
        );
      } else {
        setCart([
          ...cart,
          {
            product_id: item.id,
            product_name: item.name,
            quantity: 1,
            unit_price: parseFloat(item.price),
            subtotal: parseFloat(item.price),
            is_service: false,
          },
        ]);
      }
    }
  };

  const updateQuantity = (itemId, newQuantity, isService = false) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, isService);
      return;
    }
    
    if (isService) {
      // Services don't have stock limits
      setCart(
        cart.map((item) =>
          item.service_id === itemId
            ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price }
            : item
        )
      );
    } else {
      // Products have stock limits
      const product = products.find((p) => p.id === itemId);
      if (newQuantity > product.stock_quantity) {
        alert('Not enough stock available');
        return;
      }
      setCart(
        cart.map((item) =>
          item.product_id === itemId
            ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.unit_price }
            : item
        )
      );
    }
  };

  const removeFromCart = (itemId, isService = false) => {
    if (isService) {
      setCart(cart.filter((item) => item.service_id !== itemId));
    } else {
      setCart(cart.filter((item) => item.product_id !== itemId));
    }
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    // Separate products and services
    const productItems = cart.filter(item => !item.is_service);
    const serviceItems = cart.filter(item => item.is_service);

    // For now, only process products through the sales API
    // Services will be included in the receipt display
    try {
      let saleResponse = null;
      
      if (productItems.length > 0) {
        // Only send products to the backend
        const response = await axios.post(`${API_BASE_URL}/api/sales`, {
          customer_id: selectedCustomer?.id || null,
          staff_id: user?.id || null,
          userId: user?.id || null,
          items: productItems,
          payment_method: paymentMethod,
          total_amount: total,
        });
        saleResponse = response;
      } else {
        // If only services, create a mock sale object for receipt
        saleResponse = {
          data: {
            sale: {
              id: `SVC-${Date.now()}`,
              transaction_number: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              customer_id: selectedCustomer?.id || null,
              staff_id: user?.id || null,
              total_amount: total,
              payment_method: paymentMethod,
              status: 'Completed',
              created_at: new Date().toISOString(),
              customer_name: selectedCustomer?.name || null,
              staff_name: user?.name || null,
            }
          }
        };
      }

      // Store receipt data with both products and services
      if (saleResponse.data.sale) {
        const receiptData = {
          ...saleResponse.data.sale,
          items: [
            ...(productItems.map(item => ({
              ...item,
              product_name: item.product_name,
            }))),
            ...(serviceItems.map(item => ({
              ...item,
              product_name: item.product_name,
              is_service: true,
            })))
          ]
        };
        setReceipt(receiptData);
        setShowReceipt(true);
      } else if (saleResponse.data.id) {
        // Fetch complete sale data if not included in response
        try {
          const saleData = await axios.get(`${API_BASE_URL}/api/sales/${saleResponse.data.id}`);
          const receiptData = {
            ...saleData.data,
            items: [
              ...(saleData.data.items || []),
              ...(serviceItems.map(item => ({
                ...item,
                product_name: item.product_name,
                is_service: true,
              })))
            ]
          };
          setReceipt(receiptData);
          setShowReceipt(true);
        } catch (fetchErr) {
          console.error('Error fetching receipt:', fetchErr);
          alert('Sale completed successfully!');
        }
      }

      setCart([]);
      setSelectedCustomer(null);
      fetchProducts();
      fetchServices();
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.error || 'Error processing sale');
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    const receiptContent = document.getElementById('receipt-content').innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 10px;
                font-family: Arial, sans-serif;
                font-size: 12px;
              }
            }
            body {
              margin: 0;
              padding: 10px;
              font-family: Arial, sans-serif;
              font-size: 12px;
              width: 80mm;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
              padding-bottom: 5px;
              border-bottom: 1px dotted #ccc;
            }
            .receipt-total {
              border-top: 2px solid #000;
              margin-top: 10px;
              padding-top: 10px;
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setReceipt(null);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
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

  // Group services by category
  const servicesByCategory = filteredServices.reduce((acc, service) => {
    const category = service.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  const productCategories = Object.keys(productsByCategory).sort();
  const serviceCategories = Object.keys(servicesByCategory).sort();

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
      className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-h-screen p-4 sm:p-6"
      style={{
        background: darkMode 
          ? `linear-gradient(to bottom, ${adminColors.darkGradientStart}, ${adminColors.darkGradientMiddle}, ${adminColors.darkGradientEnd})`
          : `linear-gradient(to bottom, ${adminColors.gradientStart}, ${adminColors.gradientMiddle}, ${adminColors.gradientEnd})`,
        color: darkMode ? adminColors.darkTextColor : adminColors.textColor,
      }}
    >
      {/* Products/Services Section */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4">
          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'products'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'services'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Services
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {activeTab === 'products' ? 'Products' : 'Services'}
            </h2>
            <input
              className="border rounded px-3 py-1.5 text-sm w-full sm:w-auto dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={activeTab === 'products' ? 'Search products...' : 'Search services...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
            {activeTab === 'products' ? (
              // Products Tab
              productCategories.length > 0 ? (
                productCategories.map((category) => (
                  <div key={category} className="border rounded-lg dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3">
                        {productsByCategory[category].map((product) => (
                          <button
                            key={product.id}
                            onClick={() => addToCart(product, false)}
                            className="border rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition dark:border-gray-600"
                            disabled={product.stock_quantity === 0}
                          >
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">{product.name}</div>
                            <div className="text-green-600 dark:text-green-400 font-bold mt-2">PHP{parseFloat(product.price).toFixed(2)}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Stock: {product.stock_quantity}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No products available</p>
              )
            ) : (
              // Services Tab
              serviceCategories.length > 0 ? (
                serviceCategories.map((category) => (
                  <div key={category} className="border rounded-lg dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3">
                        {servicesByCategory[category].map((service) => (
                          <button
                            key={service.id}
                            onClick={() => addToCart(service, true)}
                            className="border rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition dark:border-gray-600"
                          >
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">{service.name}</div>
                            <div className="text-green-600 dark:text-green-400 font-bold mt-2">PHP{parseFloat(service.price).toFixed(2)}</div>
                            {service.duration_minutes && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Duration: {service.duration_minutes} min
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No services available</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white">Cart</h2>

          {/* Customer Selection */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-1 block">Customer (Optional)</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-100 dark:bg-gray-700"
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find((c) => c.id === parseInt(e.target.value));
                setSelectedCustomer(customer || null);
              }}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
            {cart.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Cart is empty</p>
            ) : (
              cart.map((item, index) => {
                const itemId = item.product_id || item.service_id;
                const isService = item.is_service || false;
                return (
                  <div key={`${isService ? 'service' : 'product'}-${itemId}-${index}`} className="border rounded p-2 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.product_name}
                          {isService && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(Service)</span>}
                        </div>
                        <div className="text-gray-500">PHP{item.unit_price.toFixed(2)} each</div>
                      </div>
                      <button
                        onClick={() => removeFromCart(itemId, isService)}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity - 1, isService)}
                          className="w-6 h-6 border rounded flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity + 1, isService)}
                          className="w-6 h-6 border rounded flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-semibold">PHP{item.subtotal.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <label className="text-sm text-gray-600 mb-1 block">Payment Method</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-100 dark:bg-gray-700"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>Card</option>
              <option>Digital</option>
            </select>
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600">PHP{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Sale
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Receipt</h3>
              <button
                onClick={closeReceipt}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div id="receipt-content" className="space-y-4">
              {/* Receipt Header */}
              <div className="text-center border-b dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WCM HAIR AND NAIL SALON</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Management System</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Transaction: {receipt.transaction_number}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Date: {new Date(receipt.created_at).toLocaleString()}
                </p>
              </div>

              {/* Customer & Staff Info */}
              <div className="border-b dark:border-gray-700 pb-3">
                {receipt.customer_name && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Customer:</span> {receipt.customer_name}
                  </p>
                )}
                {receipt.staff_name && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Staff:</span> {receipt.staff_name}
                  </p>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Payment:</span> {receipt.payment_method}
                </p>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Items:</h4>
                <div className="space-y-2">
                  {receipt.items && receipt.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm border-b dark:border-gray-700 pb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.product_name}
                          {item.is_service && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(Service)</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} × PHP{parseFloat(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          PHP{parseFloat(item.subtotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    PHP{parseFloat(receipt.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center border-t dark:border-gray-700 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Thank you for your purchase!
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Have a great day!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors"
              >
                Print Receipt
              </button>
              <button
                onClick={closeReceipt}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

