import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardConfig, setDashboardConfig] = useState({});
  const [configLoading, setConfigLoading] = useState(false);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          await loadDashboardConfig();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData) => {
    setUser(userData);
    await loadDashboardConfig();
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        setDashboardConfig({});
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const loadDashboardConfig = async () => {
    try {
      setConfigLoading(true);
      console.log('Loading dashboard config...');
      
      // First check if user has dashboard_layout setting
      const layoutResponse = await fetch('/api/auth/user-settings/dashboard_layout', {
        credentials: 'include'
      });
      
      if (layoutResponse.ok) {
        const layoutData = await layoutResponse.json();
        if (layoutData.value) {
          try {
            const parsedLayout = JSON.parse(layoutData.value);
            console.log('Loaded dashboard layout from user_settings:', parsedLayout);
            setDashboardConfig(parsedLayout);
            return;
          } catch (parseError) {
            console.error('Failed to parse dashboard layout:', parseError);
          }
        }
      }
      
      // Fallback to old dashboard-config endpoint
      const response = await fetch('/api/auth/dashboard-config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded dashboard config from fallback:', data.config);
        setDashboardConfig(data.config || {});
      }
    } catch (error) {
      console.error('Failed to load dashboard config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const saveDashboardConfig = async (config) => {
    try {
      // Add timestamp and version to config
      const configWithMetadata = {
        ...config,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      
      // Save to user_settings table with dashboard_layout key
      const response = await fetch('/api/auth/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          key: 'dashboard_layout', 
          value: JSON.stringify(configWithMetadata) 
        }),
      });
      
      if (response.ok) {
        setDashboardConfig(configWithMetadata);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save dashboard config:', error);
      return false;
    }
  };

  const refreshDashboardConfig = async () => {
    console.log('Force refreshing dashboard config...');
    await loadDashboardConfig();
  };

  const value = {
    user,
    loading,
    dashboardConfig,
    configLoading,
    login,
    logout,
    saveDashboardConfig,
    refreshDashboardConfig,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 