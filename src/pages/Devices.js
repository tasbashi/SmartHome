import React, { useState } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useMqtt } from '../contexts/MqttContext';
import Icon from '../components/ui/Icon';

const Devices = () => {
  const { 
    devices, 
    deviceConfig, 
    addDevice, 
    removeDevice, 
    toggleDeviceEnabled,
    autoDetectDevices, 
    getFilteredDevices,
    deviceFilters,
    setDeviceFilters,
    clearAllDevices,
    cleanupInvalidDevices
  } = useDevices();
  const { connectionStatus, publishMessage } = useMqtt();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'temperature_sensor',
    topic: '',
    room: 'Living Room'
  });

  const deviceList = getFilteredDevices();
  const deviceTypes = Object.keys(deviceConfig);
  const rooms = [...new Set(Object.values(devices).filter(device => device && device.room).map(device => device.room))];
  
  // Debug logging
  console.log('Devices page - Raw devices count:', Object.keys(devices).length);
  console.log('Devices page - Raw devices:', Object.values(devices));
  console.log('Devices page - Filtered devices count:', deviceList.length);
  console.log('Devices page - Device filters:', deviceFilters);
  
  // Device statistics
  const totalDevices = Object.keys(devices).length;
  const onlineDevices = Object.values(devices).filter(device => device.isOnline).length;
  const offlineDevices = totalDevices - onlineDevices;
  const devicesByType = deviceTypes.map(type => ({
    type,
    count: Object.values(devices).filter(device => device.type === type).length,
    online: Object.values(devices).filter(device => device.type === type && device.isOnline).length
  })).filter(stat => stat.count > 0);

  const handleAddDevice = () => {
    if (newDevice.name && newDevice.topic) {
      addDevice(newDevice);
      setNewDevice({
        name: '',
        type: 'temperature_sensor',
        topic: '',
        room: 'Living Room'
      });
      setShowAddModal(false);
    }
  };

  const handleAutoDetect = () => {
    console.log('Auto-detect button clicked');
    console.log('Connection status:', connectionStatus);
    console.log('Current devices count:', Object.keys(devices).length);
    
    const detectedDevices = autoDetectDevices();
    console.log('Auto-detected devices:', detectedDevices);
    
    if (detectedDevices.length > 0) {
      console.log(`Adding ${detectedDevices.length} detected devices...`);
      detectedDevices.forEach((device, index) => {
        console.log(`Adding device ${index + 1}:`, device);
        addDevice(device);
      });
    } else {
      console.log('No devices detected');
    }
  };

  const handleRemoveDevice = (deviceId) => {
    if (window.confirm('Are you sure you want to remove this device?')) {
      // Add a small delay to show visual feedback
      const deviceElement = document.querySelector(`[data-device-id="${deviceId}"]`);
      if (deviceElement) {
        deviceElement.style.opacity = '0.5';
        deviceElement.style.transform = 'scale(0.95)';
        deviceElement.style.transition = 'all 0.2s ease-out';
      }
      
      setTimeout(() => {
        removeDevice(deviceId);
        setSelectedDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(deviceId);
          return newSet;
        });
      }, 200);
    }
  };

  const handleSelectDevice = (deviceId) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDevices.size === deviceList.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(deviceList.map(device => device.id)));
    }
  };

  const handleBulkAction = (action) => {
    if (action === 'remove' && selectedDevices.size > 0) {
      if (window.confirm(`Are you sure you want to remove ${selectedDevices.size} selected devices?`)) {
        // Add visual feedback for bulk delete
        selectedDevices.forEach(deviceId => {
          const deviceElement = document.querySelector(`[data-device-id="${deviceId}"]`);
          if (deviceElement) {
            deviceElement.style.opacity = '0.5';
            deviceElement.style.transform = 'scale(0.95)';
            deviceElement.style.transition = 'all 0.2s ease-out';
          }
        });
        
        setTimeout(() => {
          selectedDevices.forEach(deviceId => removeDevice(deviceId));
          setSelectedDevices(new Set());
        }, 200);
      }
    }
  };

  const getDeviceTypeIcon = (type) => {
    return deviceConfig[type]?.icon || 'alert-circle';
  };

  const getDeviceTypeName = (type) => {
    return deviceConfig[type]?.name || type;
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500';
  };

  const getStatusBgColor = (isOnline) => {
    return isOnline ? 'bg-success-100 dark:bg-success-900' : 'bg-gray-100 dark:bg-gray-700';
  };

  const handleCleanupInvalidDevices = () => {
    console.log('Manual cleanup triggered');
    const cleanedCount = cleanupInvalidDevices();
    if (cleanedCount > 0) {
      alert(`Cleaned up ${cleanedCount} invalid/null devices from the system.`);
    } else {
      alert('No invalid devices found. All devices are valid.');
    }
  };



  const handleSendTestMessage = () => {
    if (!connectionStatus.connected) {
      alert('MQTT not connected! Please connect to MQTT broker first.');
      return;
    }
    
    const testTopics = [
      {
        topic: 'home/livingroom/temperature',
        payload: { Temp: 22.5, Humidity: 65 }
      },
      {
        topic: 'home/kitchen/motion', 
        payload: { Motion: 'Detected', LastSeen: new Date().toISOString() }
      },
      {
        topic: 'home/frontdoor/door',
        payload: { Door: 'Closed', Battery: 95 }
      }
    ];
    
    console.log('Sending test MQTT messages for auto-detection...');
    testTopics.forEach((test, index) => {
      setTimeout(() => {
        console.log(`Sending test message ${index + 1}:`, test);
        publishMessage(test.topic, test.payload, 0);
      }, index * 1000);
    });
    
    alert(`Sending ${testTopics.length} test messages. Check auto-detect in a few seconds!`);
  };

  const handleClearAllDevices = () => {
    if (window.confirm('Are you sure you want to remove ALL devices? This action cannot be undone and will clear all device data including localStorage.')) {
      clearAllDevices();
      setSelectedDevices(new Set());
      alert('All devices have been cleared from the system and storage.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header with Actions */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Devices
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Manage your smart home devices
          </p>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          {/* View Mode Toggle - Hidden on mobile */}
          <div className="hidden sm:flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon name="grid-3x3" size={16} className="mr-1.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Icon name="list" size={16} className="mr-1.5" />
              List
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary w-full sm:w-auto"
          >
            <Icon name="plus" size={18} className="mr-2" />
            Add Device
          </button>
          
          <button
            onClick={handleAutoDetect}
            className="btn btn-secondary w-full sm:w-auto"
          >
            <Icon name="search" size={18} className="mr-2" />
            Auto-Detect
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid mobile-grid-4 gap-3 sm:gap-4">
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Icon name="home" size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {totalDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
              <Icon name="check-circle" size={20} className="text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
              <p className="text-xl font-semibold text-success-600 dark:text-success-400">
                {onlineDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900 rounded-lg">
              <Icon name="alert-circle" size={20} className="text-danger-600 dark:text-danger-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
              <p className="text-xl font-semibold text-danger-600 dark:text-danger-400">
                {offlineDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Icon name="filter" size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Filtered</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {deviceList.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Device Types Quick Selection */}
      {devicesByType.length > 0 && (
        <div className="card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Device Types
          </h3>
          <div className="grid mobile-grid-3 gap-3 sm:gap-4">
            <button
              onClick={() => setDeviceFilters({ ...deviceFilters, type: 'all' })}
              className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                deviceFilters.type === 'all' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon name="grid-3x3" size={20} className="mx-auto mb-2 text-gray-600 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">All</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{totalDevices} devices</p>
            </button>
            
            {devicesByType.map(({ type, count, online }) => (
              <button
                key={type}
                onClick={() => setDeviceFilters({ ...deviceFilters, type })}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                  deviceFilters.type === type 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon 
                  name={getDeviceTypeIcon(type)} 
                  size={20} 
                  className="mx-auto mb-2 text-gray-600 dark:text-gray-400" 
                />
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getDeviceTypeName(type)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {count} total • {online} online
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-6">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connected Devices ({deviceList.length})
            </h3>
            {selectedDevices.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDevices.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction('remove')}
                  className="text-sm text-danger-600 hover:text-danger-700 dark:text-danger-400 touch-manipulation"
                >
                  Remove Selected
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between sm:justify-end space-x-3">
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 touch-manipulation"
            >
              {selectedDevices.size === deviceList.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {/* View Mode Toggle - Show on mobile too */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors touch-manipulation ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon name="grid-3x3" size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors touch-manipulation ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon name="list" size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid mobile-grid-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Icon name="search" size={16} className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search devices..."
                className="input pl-10"
                value={deviceFilters.search}
                onChange={(e) => setDeviceFilters({ ...deviceFilters, search: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              className="select"
              value={deviceFilters.status}
              onChange={(e) => setDeviceFilters({ ...deviceFilters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room
            </label>
            <select
              className="select"
              value={deviceFilters.room || 'all'}
              onChange={(e) => setDeviceFilters({ ...deviceFilters, room: e.target.value === 'all' ? '' : e.target.value })}
            >
              <option value="all">All Rooms</option>
              {rooms.map(room => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              className="select"
              value={deviceFilters.type || 'all'}
              onChange={(e) => setDeviceFilters({ ...deviceFilters, type: e.target.value === 'all' ? '' : e.target.value })}
            >
              <option value="all">All Types</option>
              {deviceTypes.map(type => (
                <option key={type} value={type}>
                  {getDeviceTypeName(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Device List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {deviceList.map((device) => (
          <div 
            key={device.id}
            data-device-id={device.id}
            className={`card p-6 cursor-pointer transition-all ${
              selectedDevices.has(device.id) 
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => handleSelectDevice(device.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`
                  p-3 rounded-lg transition-colors
                  ${getStatusBgColor(device.isOnline)}
                `}>
                  <Icon 
                    name={device.icon || 'alert-circle'} 
                    size={24} 
                    className={getStatusColor(device.isOnline)}
                  />
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {device.name || 'Unknown Device'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {device.room || 'Unknown Room'} • {getDeviceTypeName(device.type || 'unknown')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`
                  status-indicator
                  ${device.isOnline ? 'status-success' : 'status-gray'}
                `}>
                  {device.isOnline ? 'Online' : 'Offline'}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDeviceEnabled(device.id);
                  }}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    device.enabled ? 'text-success-600' : 'text-gray-400'
                  }`}
                  title={device.enabled ? 'Disable device' : 'Enable device'}
                >
                  <Icon name={device.enabled ? "check-circle" : "pause-circle"} size={16} />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDevice(device.id);
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-danger-600"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Topic:</span>
                <span className="font-mono text-gray-900 dark:text-white text-xs break-all">
                  {device.topic || 'No topic'}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Controllable:</span>
                <span className="text-gray-900 dark:text-white">
                  {device.controllable ? (
                    <span className="text-success-600 dark:text-success-400">Yes</span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No</span>
                  )}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="text-gray-900 dark:text-white">
                  {device.enabled ? (
                    <span className="text-success-600 dark:text-success-400">Enabled</span>
                  ) : (
                    <span className="text-warning-600 dark:text-warning-400">Disabled</span>
                  )}
                </span>
              </div>
              
              {device.lastUpdated && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(device.lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {device.data && Object.keys(device.data).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Data
                </h4>
                <div className="space-y-1">
                  {Object.entries(device.data).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deviceList.length === 0 && (
        <div className="text-center py-12">
          <Icon name="search" size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No devices found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filters or add a new device.
          </p>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Device
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Living Room Temperature"
                  value={newDevice.name}
                  onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Device Type
                </label>
                <select
                  className="select"
                  value={newDevice.type}
                  onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                >
                  {deviceTypes.map(type => (
                    <option key={type} value={type}>
                      {getDeviceTypeName(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  MQTT Topic
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="home/livingroom/temp"
                  value={newDevice.topic}
                  onChange={(e) => setNewDevice({ ...newDevice, topic: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Living Room"
                  value={newDevice.room}
                  onChange={(e) => setNewDevice({ ...newDevice, room: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDevice}
                className="btn btn-primary"
                disabled={!newDevice.name || !newDevice.topic}
              >
                Add Device
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating clean buttons */}
      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-40">
        <button
          onClick={handleCleanupInvalidDevices}
          className="btn btn-warning btn-sm text-xs px-2 py-1"
          title="Clean up null/invalid devices"
        >
          <Icon name="filter" size={14} className="mr-1" />
          Clean
        </button>

        <button
          onClick={handleClearAllDevices}
          className="btn btn-danger btn-sm text-xs px-2 py-1"
          title="Clear all devices and storage"
        >
          <Icon name="trash-2" size={14} className="mr-1" />
          Clear All
        </button>
      </div>
    </div>
  );
};

export default Devices; 