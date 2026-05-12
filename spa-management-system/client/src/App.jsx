import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import WalkIns from './pages/WalkIns';
import DataReports from './pages/DataReports';
import AIRecommendations from './pages/AIRecommendations';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CustomerHome from './pages/CustomerHome';
import CustomerSettings from './pages/CustomerSettings';
import CustomerNav from './components/customer/CustomerNav';
import StaffPortal from './pages/StaffPortal';
import StaffNav from './components/staff/StaffNav';
import AIChat from './components/AIChat';
import LowStockPopup from './components/LowStockPopup';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const viewMap = {
  dashboard: <Dashboard />,
  customers: <Customers />,
  staff: <Staff />,
  inventory: <Inventory />,
  pos: <POS />,
  appointments: <Appointments />,
  services: <Services />,
  walkins: <WalkIns />,
  reports: <DataReports />,
  'ai-recommendations': <AIRecommendations />,
  settings: <Settings />,
};

const AuthScreens = () => {
  const [mode, setMode] = useState('login');
  return (
    <div className="min-h-screen min-w-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-6 w-full">
      {mode === 'login' ? (
        <Login onSwitch={() => setMode('signup')} />
      ) : (
        <Signup onSwitch={() => setMode('login')} />
      )}
    </div>
  );
};

const customerViews = {
  home: <CustomerHome />,
  settings: <CustomerSettings />,
};

const staffViews = {
  bookings: <StaffPortal />,
  ratings: <StaffPortal />,
};

const CustomerShell = () => {
  const [active, setActive] = useState('home');
  return (
    <div className="min-h-screen flex w-full min-w-0 max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900">
      <CustomerNav active={active} onChange={setActive} />
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full">
        <Header />
        <main className="p-3 sm:p-4 lg:p-6 flex-1 min-w-0 w-full bg-gray-50 dark:bg-gray-900">{customerViews[active] || <CustomerHome />}</main>
      </div>
    </div>
  );
};

const StaffShell = () => {
  const [active, setActive] = useState('bookings');
  return (
    <div className="min-h-screen flex w-full min-w-0 max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900">
      <StaffNav active={active} onChange={setActive} />
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full">
        <Header />
        <main className="p-3 sm:p-4 lg:p-6 flex-1 min-w-0 w-full bg-gray-50 dark:bg-gray-900">
          <StaffPortal activeTab={active} />
        </main>
      </div>
    </div>
  );
};

const Shell = () => {
  const { user, permissions } = useAuth();
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    // Allow admin to access walkins, reports, and ai-recommendations even if not in permissions
    const adminOnlyViews = ['walkins', 'reports', 'ai-recommendations'];
    if (user && user.role === 'admin' && permissions && permissions.length > 0 && !permissions.includes(view) && !adminOnlyViews.includes(view)) {
      setView(permissions[0] || 'dashboard');
    }
  }, [permissions, view, user]);

  const currentView = useMemo(() => {
    try {
      return viewMap[view] || <Dashboard />;
    } catch (error) {
      console.error('Error rendering view:', error);
      return <Dashboard />;
    }
  }, [view]);

  if (!user) return <AuthScreens />;
  if (user.role === 'customer') return <CustomerShell />;
  if (user.role === 'staff') return <StaffShell />;

  return (
    <div className="min-h-screen flex w-full min-w-0 max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar setView={setView} view={view} allowedViews={user?.role === 'admin' ? [...(permissions || []), 'walkins', 'reports', 'ai-recommendations'] : (permissions || [])} />
      <div className="relative flex flex-1 flex-col min-w-0 w-full max-w-full">
        <Header />
        <main className="p-3 sm:p-4 lg:p-6 flex-1 min-w-0 w-full">{currentView}</main>
        {user?.role === 'admin' && <AIChat isAdmin={true} />}
        {user?.role === 'admin' && <LowStockPopup setView={setView} />}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
