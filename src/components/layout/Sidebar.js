import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDevices } from '../../contexts/DeviceContext';
import { useMqtt } from '../../contexts/MqttContext';
import Icon from '../ui/Icon';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { devices } = useDevices();
  const { connectionStatus } = useMqtt();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: 'home' },
    { name: 'Devices', href: '/devices', icon: 'users' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ];

  const deviceCount = Object.keys(devices).length;
  const onlineDevices = Object.values(devices).filter(device => device.isOnline).length;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 sidebar transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-gray-200 dark:border-gray-700">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Navigation
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Close navigation"
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href === '/dashboard' && location.pathname === '/');
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors touch-manipulation
                    ${isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon name={item.icon} size={20} className="mr-3 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Stats */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Devices</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {deviceCount}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Online</span>
                <span className="font-medium text-success-600 dark:text-success-400">
                  {onlineDevices}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Offline</span>
                <span className="font-medium text-danger-600 dark:text-danger-400">
                  {deviceCount - onlineDevices}
                </span>
              </div>
            </div>

            {/* Connection Status */}
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  connectionStatus.connected ? 'bg-success-500' : 'bg-danger-500'
                }`} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  MQTT {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {connectionStatus.connected && connectionStatus.lastConnected && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Connected at {new Date(connectionStatus.lastConnected).toLocaleTimeString()}
                </div>
              )}
              
              {connectionStatus.error && (
                <div className="mt-1 text-xs text-danger-600 dark:text-danger-400 break-words">
                  {connectionStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 