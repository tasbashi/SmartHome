import React, { useState } from 'react';
import { useDevices } from '../../contexts/DeviceContext';
import Icon from './Icon';

const DevicesDebug = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { devices, deviceFilters, getFilteredDevices, clearAllDevices, cleanupInvalidDevices } = useDevices();

  const rawDevices = Object.values(devices);
  const filteredDevices = getFilteredDevices();

  // Function to inspect localStorage
  const getLocalStorageData = () => {
    try {
      const devicesData = localStorage.getItem('smart-home-devices');
      const layoutData = localStorage.getItem('smart-home-layout');
      return {
        devices: devicesData ? JSON.parse(devicesData) : null,
        layout: layoutData ? JSON.parse(layoutData) : null
      };
    } catch (error) {
      return { error: error.message };
    }
  };

  const handleForceCleanupLocalStorage = () => {
    if (window.confirm('Force clear localStorage? This will remove all saved device data.')) {
      localStorage.removeItem('smart-home-devices');
      localStorage.removeItem('smart-home-layout');
      window.location.reload();
    }
  };

  const handleCleanupInvalid = () => {
    const count = cleanupInvalidDevices();
    alert(`Cleaned up ${count} invalid devices.`);
  };

  const localStorageData = getLocalStorageData();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-16 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg z-50"
        title="Devices Debug"
      >
        <Icon name="bug" size={16} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 w-96 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Devices Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Actions
            </h4>
            <div className="space-y-2">
              <button
                onClick={handleCleanupInvalid}
                className="w-full text-xs bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-2 rounded"
              >
                Clean Invalid Devices
              </button>
              <button
                onClick={() => clearAllDevices()}
                className="w-full text-xs bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
              >
                Clear All Devices
              </button>
              <button
                onClick={handleForceCleanupLocalStorage}
                className="w-full text-xs bg-red-700 hover:bg-red-800 text-white py-1 px-2 rounded"
              >
                Force Clear localStorage
              </button>
            </div>
          </div>

          {/* Device Counts */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device Counts
            </h4>
            <div className="text-xs space-y-1">
              <div>Raw devices: {rawDevices.length}</div>
              <div>Filtered devices: {filteredDevices.length}</div>
              <div>Valid devices: {rawDevices.filter(d => d && d.id && d.name).length}</div>
              <div>Invalid devices: {rawDevices.filter(d => !d || !d.id || !d.name).length}</div>
            </div>
          </div>

          {/* LocalStorage Data */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              localStorage Data
            </h4>
            <div className="text-xs space-y-1 max-h-24 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-2 rounded">
              {localStorageData.error ? (
                <div className="text-red-500">Error: {localStorageData.error}</div>
              ) : (
                <div>
                  <div>Devices in storage: {localStorageData.devices ? Object.keys(localStorageData.devices).length : 0}</div>
                  <div>Layouts in storage: {localStorageData.layout ? localStorageData.layout.length : 0}</div>
                  <div className="mt-2 text-xs">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(localStorageData, null, 1).substring(0, 200)}...
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Current Filters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Filters
            </h4>
            <div className="text-xs space-y-1">
              <div>Type: {deviceFilters.type}</div>
              <div>Status: {deviceFilters.status}</div>
              <div>Room: {deviceFilters.room || 'all'}</div>
              <div>Controllable: {deviceFilters.controllable || 'all'}</div>
              <div>Search: "{deviceFilters.search}"</div>
            </div>
          </div>

          {/* Raw Devices */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raw Devices
            </h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {rawDevices.map((device, index) => (
                <div key={index} className={`border-b border-gray-100 dark:border-gray-700 pb-1 ${!device || !device.id || !device.name ? 'bg-red-100 dark:bg-red-900' : ''}`}>
                  <div>ID: {device?.id || 'NULL'}</div>
                  <div>Name: {device?.name || 'NULL'}</div>
                  <div>Topic: {device?.topic || 'NULL'}</div>
                  <div>Online: {device?.isOnline ? 'true' : 'false'}</div>
                  <div>Type: {device?.type || 'NULL'}</div>
                  {(!device || !device.id || !device.name) && (
                    <div className="text-red-600 font-bold">⚠️ INVALID</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicesDebug; 