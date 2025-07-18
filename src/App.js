import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { MqttProvider } from './contexts/MqttContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import DebugPanel from './components/ui/DebugPanel';
import DevicesDebug from './components/ui/DevicesDebug';
import Login from './components/auth/Login';
import GridDashboard from './pages/GridDashboard';
import Devices from './pages/Devices';
import Settings from './pages/Settings';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Login onLogin={() => {}} />;
  }
  
  return children;
};

// Main App Content Component
const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, loading, login } = useAuth();

  useEffect(() => {
    // Apply saved theme on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Close sidebar when clicking outside on mobile
  const closeSidebar = () => setSidebarOpen(false);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Show main app if authenticated
  return (
    <ThemeProvider>
      <MqttProvider>
        <DeviceProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
            
            <div className="flex h-[calc(100vh-4rem)]">
              <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
              
              <main className="flex-1 overflow-hidden lg:ml-0">
                <div className="h-full overflow-y-auto">
                  <div className="p-4 sm:p-6 max-w-full">
                    <Routes>
                      <Route path="/" element={<GridDashboard />} />
                      <Route path="/dashboard" element={<GridDashboard />} />
                      <Route path="/devices" element={<Devices />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </div>
                </div>
              </main>
            </div>
            
            <DebugPanel />
            <DevicesDebug />
          </div>
        </DeviceProvider>
      </MqttProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App; 