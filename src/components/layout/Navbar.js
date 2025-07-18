import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMqtt } from '../../contexts/MqttContext';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../ui/Icon';

const Navbar = ({ onMenuClick }) => {
  const { isDark, toggleTheme } = useTheme();
  const { connectionStatus, isConnected } = useMqtt();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="navbar px-4 py-3 sticky top-0 z-50 h-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden transition-colors touch-manipulation"
            aria-label="Toggle menu"
          >
            <Icon name="menu" size={24} />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Icon name="home" size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Smart Home Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                MQTT Control Panel
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Smart Home
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* MQTT Connection Status - Hidden on small screens */}
          <div className="hidden md:flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.connected 
                ? 'bg-success-500 pulse-ring' 
                : 'bg-danger-500'
            }`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {connectionStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
            {connectionStatus.connected && (
              <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400">
                {connectionStatus.brokerAddress}:{connectionStatus.port}
              </span>
            )}
          </div>

          {/* Mobile connection indicator */}
          <div className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <Icon 
              name={isConnected ? 'wifi' : 'wifi-off'} 
              size={18} 
              className={isConnected ? 'text-success-600' : 'text-danger-600'} 
            />
          </div>

          {/* User info and logout */}
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
              Welcome, {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              title="Logout"
              aria-label="Logout"
            >
              <Icon 
                name="log-out" 
                size={18} 
                className="text-gray-600 dark:text-gray-400" 
              />
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon 
              name={isDark ? 'sun' : 'moon'} 
              size={18} 
              className="text-gray-600 dark:text-gray-400" 
            />
          </button>

          {/* Connection Status Icon - Desktop only */}
          <div className="hidden md:block p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <Icon 
              name={isConnected ? 'wifi' : 'wifi-off'} 
              size={20} 
              className={isConnected ? 'text-success-600' : 'text-danger-600'} 
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 