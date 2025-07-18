import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMqtt } from './MqttContext';
import { useAuth } from './AuthContext';
import deviceConfig from '../config/devices.json';

const DeviceContext = createContext();

export const useDevices = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
};

export const DeviceProvider = ({ children }) => {
  const { messages, subscribeToTopic, publishMessage, connectionStatus, unsubscribeFromTopic } = useMqtt();
  const { dashboardConfig, saveDashboardConfig, refreshDashboardConfig, isAuthenticated } = useAuth();
  const [devices, setDevices] = useState({});
  const [deviceLayouts, setDeviceLayouts] = useState([]);
  const [deviceOfflineTimers, setDeviceOfflineTimers] = useState({});
  const [deletedTopics, setDeletedTopics] = useState(new Set());
  const [deviceFilters, setDeviceFilters] = useState({
    type: 'all',
    status: 'all',
    search: '',
    room: '',
    controllable: '',
    enabled: 'all'
  });
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Reduced periodic sync - only sync every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncInterval = setInterval(async () => {
      console.log('Performing periodic dashboard config sync...');
      await refreshDashboardConfig();
    }, 300000); // Sync every 5 minutes

    return () => clearInterval(syncInterval);
  }, [isAuthenticated, refreshDashboardConfig]);

  // Load configuration from database when user is authenticated
  useEffect(() => {
    if (isAuthenticated && dashboardConfig && Object.keys(dashboardConfig).length > 0) {
      console.log('Loading dashboard config from database:', dashboardConfig);
      
      // Check if this is a newer config than what we have
      const configLastUpdated = dashboardConfig.lastUpdated;
      if (lastSyncTime && configLastUpdated && new Date(configLastUpdated) <= new Date(lastSyncTime)) {
        console.log('Dashboard config is not newer than current state, skipping update');
        return;
      }
      
      // Load devices from database config
      if (dashboardConfig.devices) {
        setDevices(dashboardConfig.devices);
        console.log('Loaded devices from database:', dashboardConfig.devices);
      }
      
      // Load device layouts from database config (including layouts from user_settings)
      if (dashboardConfig.deviceLayouts) {
        setDeviceLayouts(dashboardConfig.deviceLayouts);
        console.log('Loaded device layouts from database:', dashboardConfig.deviceLayouts);
      } else if (dashboardConfig.layouts) {
        // Handle layouts from user_settings format
        setDeviceLayouts(dashboardConfig.layouts);
        console.log('Loaded layouts from user_settings:', dashboardConfig.layouts);
      }
      
      // Load deleted topics from database config
      if (dashboardConfig.deletedTopics) {
        setDeletedTopics(new Set(dashboardConfig.deletedTopics));
        console.log('Loaded deleted topics from database:', dashboardConfig.deletedTopics);
      }
      
      // Load device filters from database config
      if (dashboardConfig.deviceFilters) {
        setDeviceFilters(dashboardConfig.deviceFilters);
        console.log('Loaded device filters from database:', dashboardConfig.deviceFilters);
      }
      
      // Update last sync time
      setLastSyncTime(new Date().toISOString());
    } else if (!isAuthenticated) {
      // Clear data when user logs out
      setDevices({});
      setDeviceLayouts([]);
      setDeletedTopics(new Set());
      setDeviceFilters({
        type: 'all',
        status: 'all',
        search: '',
        room: '',
        controllable: '',
        enabled: 'all'
      });
      setLastSyncTime(null);
    }
  }, [isAuthenticated, dashboardConfig]);

  // Migration function to move localStorage data to database (one-time)
  useEffect(() => {
    if (isAuthenticated && Object.keys(dashboardConfig).length === 0) {
      console.log('Checking for localStorage data to migrate...');
      
      // Check if there's existing localStorage data to migrate
      const savedDevices = localStorage.getItem('smart-home-devices');
      const savedLayout = localStorage.getItem('smart-home-layout');
      const savedDeletedTopics = localStorage.getItem('smart-home-deleted-topics');
      
      if (savedDevices || savedLayout || savedDeletedTopics) {
        console.log('Found localStorage data, migrating to database...');
        
        let migratedDevices = {};
        let migratedLayouts = [];
        let migratedDeletedTopics = [];
        
        // Migrate devices
        if (savedDevices) {
          try {
            const parsedDevices = JSON.parse(savedDevices);
            if (Object.keys(parsedDevices).length > 0) {
              // Migrate existing devices to have enabled property
              Object.entries(parsedDevices).forEach(([deviceId, device]) => {
                migratedDevices[deviceId] = {
                  ...device,
                  enabled: device.enabled !== undefined ? device.enabled : true
                };
              });
              setDevices(migratedDevices);
              console.log('Migrated devices from localStorage:', migratedDevices);
            }
          } catch (error) {
            console.error('Error migrating devices:', error);
          }
        }
        
        // Migrate layouts
        if (savedLayout) {
          try {
            const parsedLayout = JSON.parse(savedLayout);
            if (Array.isArray(parsedLayout) && parsedLayout.length > 0) {
              migratedLayouts = parsedLayout;
              setDeviceLayouts(parsedLayout);
              console.log('Migrated layouts from localStorage:', parsedLayout);
            }
          } catch (error) {
            console.error('Error migrating layouts:', error);
          }
        }
        
        // Migrate deleted topics
        if (savedDeletedTopics) {
          try {
            const topics = JSON.parse(savedDeletedTopics);
            migratedDeletedTopics = topics;
            setDeletedTopics(new Set(topics));
            console.log('Migrated deleted topics from localStorage:', topics);
          } catch (error) {
            console.error('Error migrating deleted topics:', error);
          }
        }
        
        // Save migrated data to database
        const migratedConfig = {
          devices: migratedDevices,
          deviceLayouts: migratedLayouts,
          deletedTopics: migratedDeletedTopics,
          deviceFilters: {
            type: 'all',
            status: 'all',
            search: '',
            room: '',
            controllable: '',
            enabled: 'all'
          },
          migrated: true,
          migratedAt: new Date().toISOString()
        };
        
        console.log('Saving migrated config to database:', migratedConfig);
        saveDashboardConfig(migratedConfig).then(() => {
          console.log('Migration completed successfully');
          // Clear localStorage after successful migration
          localStorage.removeItem('smart-home-devices');
          localStorage.removeItem('smart-home-layout');
          localStorage.removeItem('smart-home-deleted-topics');
          console.log('Cleared localStorage after migration');
        }).catch(error => {
          console.error('Failed to save migrated config:', error);
        });
      }
    }
  }, [isAuthenticated, dashboardConfig, saveDashboardConfig]);

  // Save configuration to database when data changes
  const saveConfigToDatabase = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const config = {
      devices,
      deviceLayouts,
      deletedTopics: Array.from(deletedTopics),
      deviceFilters,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Saving dashboard config to database:', config);
    await saveDashboardConfig(config);
  }, [isAuthenticated, devices, deviceLayouts, deletedTopics, deviceFilters, saveDashboardConfig]);

  // Manual save function for when user finishes editing
  const saveLayoutToDatabase = useCallback(async () => {
    if (isAuthenticated) {
      console.log('Manually saving layout to database...');
      await saveConfigToDatabase();
    }
  }, [isAuthenticated, saveConfigToDatabase]);

  // Function to clean up null/invalid devices
  const cleanupInvalidDevices = useCallback(() => {
    console.log('🧹 Starting aggressive cleanup of null/invalid devices...');
    
    let cleanedCount = 0;
    let cleanedDevices = {};
    
    // Clean devices
    Object.entries(devices).forEach(([deviceId, device]) => {
      // Comprehensive validation
      if (device && 
          typeof device === 'object' && 
          device.id && 
          device.name && 
          device.topic &&
          device.id !== 'null' && 
          device.id !== 'undefined' &&
          device.id !== null &&
          device.id !== undefined &&
          device.name !== 'null' && 
          device.name !== 'undefined' &&
          device.name !== null &&
          device.name !== undefined &&
          device.topic !== 'null' && 
          device.topic !== 'undefined' &&
          device.topic !== null &&
          device.topic !== undefined &&
          typeof device.id === 'string' &&
          typeof device.name === 'string' &&
          typeof device.topic === 'string' &&
          device.id.trim() !== '' &&
          device.name.trim() !== '' &&
          device.topic.trim() !== '') {
        cleanedDevices[deviceId] = device;
      } else {
        console.log('🗑️ Removing invalid device:', deviceId, device);
        cleanedCount++;
        
        // Clear offline timer if exists
        if (deviceOfflineTimers[deviceId]) {
          clearTimeout(deviceOfflineTimers[deviceId]);
        }
        
        // Unsubscribe if device has topic and we're connected
        if (device?.topic && connectionStatus.connected && unsubscribeFromTopic) {
          console.log('📡 Unsubscribing from invalid device topic:', device.topic);
          unsubscribeFromTopic(device.topic);
        }
      }
    });
    
    // Update devices state
    setDevices(cleanedDevices);
    
    // Clean up device layouts for removed devices
    const validDeviceIds = Object.keys(cleanedDevices);
    const cleanedLayouts = deviceLayouts.filter(layout => 
      layout && 
      layout.i && 
      typeof layout.i === 'string' &&
      layout.i.trim() !== '' &&
      validDeviceIds.includes(layout.i) &&
      layout.i !== 'null' && 
      layout.i !== 'undefined'
    );
    
    if (cleanedLayouts.length !== deviceLayouts.length) {
      const layoutsRemoved = deviceLayouts.length - cleanedLayouts.length;
      console.log(`🗑️ Cleaned up ${layoutsRemoved} invalid layouts`);
      setDeviceLayouts(cleanedLayouts);
    }
    
    // Clean up offline timers
    const cleanedTimers = {};
    Object.entries(deviceOfflineTimers).forEach(([deviceId, timer]) => {
      if (cleanedDevices[deviceId] && timer) {
        cleanedTimers[deviceId] = timer;
      } else if (timer) {
        console.log('⏰ Clearing orphaned timer for:', deviceId);
        clearTimeout(timer);
      }
    });
    setDeviceOfflineTimers(cleanedTimers);
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleanup completed: ${cleanedCount} invalid devices removed`);
    } else {
      console.log('✅ Cleanup completed: No invalid devices found');
    }
    
    return cleanedCount;
  }, [devices, deviceLayouts, deviceOfflineTimers, connectionStatus.connected, unsubscribeFromTopic]);

  // Function to completely clear all devices and storage
  const clearAllDevices = useCallback(() => {
    console.log('Clearing all devices and storage...');
    
    // Clear all offline timers
    Object.values(deviceOfflineTimers).forEach(timer => {
      if (timer) clearTimeout(timer);
    });
    setDeviceOfflineTimers({});
    
    // Clear devices state
    setDevices({});
    setDeviceLayouts([]);
    
    // Clear deleted topics
    setDeletedTopics(new Set());
    
    // Save cleared state to database
    if (isAuthenticated) {
      saveConfigToDatabase();
    }
    
    console.log('All devices and storage cleared');
  }, [deviceOfflineTimers, isAuthenticated, saveConfigToDatabase]);

  const clearDeletedTopics = useCallback(() => {
    console.log('Clearing deleted topics...');
    setDeletedTopics(new Set());
  }, []);

  // Auto cleanup when devices change
  useEffect(() => {
    // Delay cleanup to avoid infinite loops
    const timeoutId = setTimeout(() => {
      const deviceArray = Object.values(devices);
      const hasInvalidDevices = deviceArray.some(device => 
        !device || 
        typeof device !== 'object' || 
        !device.id || 
        !device.name || 
        !device.topic ||
        device.id === 'null' || 
        device.id === 'undefined' ||
        device.name === 'null' || 
        device.name === 'undefined' ||
        device.topic === 'null' || 
        device.topic === 'undefined'
      );
      
      if (hasInvalidDevices && deviceArray.length > 0) {
        console.log('Invalid devices detected, cleaning up...');
        cleanupInvalidDevices();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [devices, cleanupInvalidDevices]);

  // Auto-subscribe to all device topics when MQTT connection is established
  useEffect(() => {
    if (connectionStatus.connected) {
      console.log('MQTT connected, subscribing to all topics with # wildcard...');
      // Subscribe to all topics to capture any MQTT messages for auto-detection
      subscribeToTopic('#');
      
      // Also subscribe to individual device topics if they exist
      if (Object.keys(devices).length > 0) {
        Object.values(devices).forEach(device => {
          console.log('Auto-subscribing to device topic:', device.topic);
          subscribeToTopic(device.topic);
        });
      }
    }
  }, [connectionStatus.connected, subscribeToTopic, devices]);

  // Process incoming MQTT messages and update device states
  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[0];
    const { topic, message } = latestMessage;

    // Skip _send topics as they are for outgoing messages only
    if (topic.endsWith('_send')) {
      console.log('Skipping _send topic:', topic);
      return;
    }

    console.log('Received MQTT message:', { topic, message });

    // Find device by topic (exact match or wildcard match)
    const deviceId = Object.keys(devices).find(id => {
      const device = devices[id];
      if (!device || !device.topic) return false;
      
      const deviceTopic = device.topic;
      // Exact match
      if (deviceTopic === topic) return true;
      
      // Wildcard match (+ for single level, # for multi-level)
      if (deviceTopic.includes('+') || deviceTopic.includes('#')) {
        try {
          const regex = deviceTopic
            .replace(/\+/g, '[^/]+')
            .replace(/#/g, '.*');
          return new RegExp(`^${regex}$`).test(topic);
        } catch (error) {
          console.error('Error creating regex for topic:', deviceTopic, error);
          return false;
        }
      }
      
      return false;
    });

    if (deviceId) {
      try {
        let parsedMessage;
        try {
          parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        } catch {
          // If JSON parsing fails, use the raw message
          parsedMessage = { value: message };
        }
        
        console.log('Updating device:', deviceId, 'with data:', parsedMessage);
        
        // Clear existing offline timer for this device
        if (deviceOfflineTimers[deviceId]) {
          clearTimeout(deviceOfflineTimers[deviceId]);
        }
        
        // Set device as online and update data
        setDevices(prev => ({
          ...prev,
          [deviceId]: {
            ...prev[deviceId],
            data: parsedMessage,
            lastUpdated: new Date(),
            isOnline: true
          }
        }));
        
        // Set a timer to mark device as offline after 60 seconds of no activity
        const offlineTimer = setTimeout(() => {
          console.log('Device', deviceId, 'marked as offline due to timeout');
          setDevices(prev => ({
            ...prev,
            [deviceId]: {
              ...prev[deviceId],
              isOnline: false
            }
          }));
          setDeviceOfflineTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[deviceId];
            return newTimers;
          });
        }, 60000); // 60 seconds timeout
        
        setDeviceOfflineTimers(prev => ({
          ...prev,
          [deviceId]: offlineTimer
        }));
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    } else {
      console.log('No device found for topic:', topic);
      console.log('Available devices:', Object.values(devices).map(d => ({ id: d.id, name: d.name, topic: d.topic })));
    }
  }, [messages, devices]);

  const addDevice = useCallback((deviceData) => {
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const configType = deviceConfig[deviceData.type] || {};
    
    const newDevice = {
      id: deviceId,
      name: deviceData.name || configType.name || 'Unknown Device',
      type: deviceData.type,
      topic: deviceData.topic,
      room: deviceData.room || 'General',
      icon: configType.icon || 'device-unknown',
      controllable: configType.controllable || false,
      enabled: deviceData.enabled !== undefined ? deviceData.enabled : true, // Add enabled property
      data: {},
      isOnline: false,
      lastUpdated: null,
      config: configType
    };

    setDevices(prev => ({
      ...prev,
      [deviceId]: newDevice
    }));

    // Subscribe to device topic if connected and remove from deleted topics if re-adding
    if (connectionStatus.connected) {
      console.log('Subscribing to topic:', deviceData.topic);
      subscribeToTopic(deviceData.topic);
    } else {
      console.log('Not connected to MQTT, cannot subscribe to:', deviceData.topic);
    }

    // Remove topic from deleted topics if re-adding manually
    setDeletedTopics(prev => {
      const newSet = new Set(prev);
      newSet.delete(deviceData.topic);
      return newSet;
    });

    // Add to layout if not exists
    setDeviceLayouts(prev => {
      const exists = prev.find(layout => layout.i === deviceId);
      if (!exists) {
        // Calculate position for new device
        const col = (prev.length % 4) * 3; // 4 columns, each 3 units wide
        const row = Math.floor(prev.length / 4) * 3; // 3 units tall
        
        return [...prev, {
          i: deviceId,
          x: col,
          y: row,
          w: 3,
          h: 3,
          minW: 2,
          maxW: 6,
          minH: 2,
          maxH: 6
        }];
      }
      return prev;
    });

    return deviceId;
  }, [connectionStatus.connected, subscribeToTopic]);

  const removeDevice = useCallback((deviceId) => {
    console.log('Removing device:', deviceId);
    const device = devices[deviceId];
    
    if (!device) {
      console.log('Device not found:', deviceId);
      return;
    }
    
    // Add topic to deleted topics to prevent auto-detection from re-adding it
    if (device.topic) {
      setDeletedTopics(prev => new Set([...prev, device.topic]));
      console.log('Added topic to deleted topics:', device.topic);
    }
    
    // Clear offline timer if exists
    if (deviceOfflineTimers[deviceId]) {
      console.log('Clearing offline timer for device:', deviceId);
      clearTimeout(deviceOfflineTimers[deviceId]);
      setDeviceOfflineTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[deviceId];
        return newTimers;
      });
    }

    // Unsubscribe from device topic if connected and device exists
    if (device.topic && connectionStatus.connected && unsubscribeFromTopic) {
      console.log('Unsubscribing from topic:', device.topic);
      unsubscribeFromTopic(device.topic);
      
      // Also emit unsubscribe event to make sure it's properly handled
      try {
        // Additional cleanup - ensure topic is fully unsubscribed
        console.log('Ensuring complete unsubscription from:', device.topic);
      } catch (error) {
        console.error('Error during unsubscription:', error);
      }
    }

    // Remove device from state
    setDevices(prev => {
      const newDevices = { ...prev };
      delete newDevices[deviceId];
      console.log('Device removed from state. Remaining devices:', Object.keys(newDevices).length);
      
      // Force cleanup of any null/undefined entries
      const cleanedDevices = {};
      Object.entries(newDevices).forEach(([id, deviceData]) => {
        if (deviceData && typeof deviceData === 'object' && deviceData.id && deviceData.name) {
          cleanedDevices[id] = deviceData;
        } else {
          console.log('Removing null/invalid device during cleanup:', id);
        }
      });
      
      return cleanedDevices;
    });

    // Remove from layout
    setDeviceLayouts(prev => {
      const newLayout = prev.filter(layout => layout && layout.i && layout.i !== deviceId);
      console.log('Device removed from layout. Remaining layouts:', newLayout.length);
      return newLayout;
    });
    
    // Force immediate cleanup of invalid devices
    setTimeout(() => {
      console.log('Triggering post-removal cleanup...');
      cleanupInvalidDevices();
    }, 100);
    
    console.log('Device completely removed and cleaned:', deviceId);
  }, [devices, deviceOfflineTimers, connectionStatus.connected, unsubscribeFromTopic, cleanupInvalidDevices]);

  const updateDevice = useCallback((deviceId, updates) => {
    setDevices(prev => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        ...updates
      }
    }));
  }, []);

  const toggleDeviceEnabled = useCallback((deviceId) => {
    const device = devices[deviceId];
    if (!device) return;
    
    const newEnabledState = !device.enabled;
    updateDevice(deviceId, { enabled: newEnabledState });
    
    console.log(`Device ${device.name} ${newEnabledState ? 'enabled' : 'disabled'}`);
  }, [devices, updateDevice]);

  const controlDevice = useCallback((deviceId, controlData) => {
    const device = devices[deviceId];
    if (!device || !device.controllable || !connectionStatus.connected) return;

    publishMessage(device.topic, controlData);
  }, [devices, connectionStatus.connected, publishMessage]);

  const updateLayout = useCallback((newLayout) => {
    // Validate and clean the layout data
    const validatedLayout = newLayout.map(item => ({
      ...item,
      i: String(item.i),
      x: Math.max(0, Number(item.x) || 0),
      y: Math.max(0, Number(item.y) || 0),
      w: Math.max(1, Math.min(12, Number(item.w) || 2)),
      h: Math.max(1, Math.min(10, Number(item.h) || 2)),
      minW: 1,
      maxW: 12,
      minH: 1,
      maxH: 10
    }));
    
    setDeviceLayouts(validatedLayout);
  }, []);

  const autoDetectDevices = useCallback(() => {
    // Auto-detect devices based on recent MQTT messages
    const detectedDevices = [];
    const recentTopics = new Set();

    console.log('Auto-detecting devices from recent messages...');
    console.log('Total available messages:', messages.length);
    console.log('Recent messages:', messages.slice(0, 20).map(m => ({ topic: m.topic, message: m.message })));

    // Get unique topics from recent messages that don't have devices yet and aren't deleted
    const messagesToCheck = messages.slice(0, 100); // Check more messages
    messagesToCheck.forEach(msg => {
      // Skip if device already exists for this topic, topic was manually deleted, or is a _send topic
      const existingDevice = Object.values(devices).find(device => device.topic === msg.topic);
      const wasDeleted = deletedTopics.has(msg.topic);
      const isSendTopic = msg.topic.endsWith('_send');
      if (!existingDevice && !wasDeleted && !isSendTopic) {
        recentTopics.add(msg.topic);
      }
    });

    console.log('New topics found for auto-detection:', Array.from(recentTopics));

    if (recentTopics.size === 0) {
      console.log('No new topics found in MQTT messages');
      if (messages.length === 0) {
        console.log('No MQTT messages available at all. Make sure MQTT broker is connected and sending messages.');
      }
      return [];
    }

    recentTopics.forEach(topic => {
      // Find the latest message for this topic to analyze content
      const latestMessage = messagesToCheck.find(msg => msg.topic === topic);
      let messageData = {};
      
      try {
        if (latestMessage && latestMessage.message) {
          messageData = typeof latestMessage.message === 'string' 
            ? JSON.parse(latestMessage.message) 
            : latestMessage.message;
        }
      } catch (error) {
        console.log('Could not parse message for topic:', topic);
        messageData = { value: latestMessage?.message || 'unknown' };
      }

      // Try to match topic pattern and message content with device types
      let detectedType = 'temperature_sensor'; // default
      let deviceName = 'Unknown Device';
      
      // More comprehensive topic and data analysis
      const topicLower = topic.toLowerCase();
      const messageKeys = Object.keys(messageData).map(k => k.toLowerCase());
      const messageContent = JSON.stringify(messageData).toLowerCase();
      
      // Analyze both topic and message content for better detection
      if (topicLower.includes('temp') || topicLower.includes('temperature') || 
          messageKeys.some(k => k.includes('temp')) || messageContent.includes('humidity')) {
        detectedType = 'temperature_sensor';
        deviceName = 'Temperature Sensor';
      } else if (topicLower.includes('door') || topicLower.includes('contact') ||
                 messageKeys.some(k => k.includes('door')) || messageContent.includes('open') || messageContent.includes('closed')) {
        detectedType = 'door_sensor';
        deviceName = 'Door Sensor';
      } else if (topicLower.includes('relay') || topicLower.includes('light') || topicLower.includes('switch') ||
                 messageKeys.some(k => k.includes('relay')) || messageContent.includes('"on"') || messageContent.includes('"off"')) {
        detectedType = 'relay';
        deviceName = 'Smart Relay';
      } else if (topicLower.includes('motion') || topicLower.includes('pir') ||
                 messageKeys.some(k => k.includes('motion')) || messageContent.includes('detected')) {
        detectedType = 'motion_sensor';
        deviceName = 'Motion Sensor';
      } else if (topicLower.includes('distance') || topicLower.includes('ultrasonic') || topicLower.includes('range') ||
                 messageKeys.some(k => k.includes('distance'))) {
        detectedType = 'distance_sensor';
        deviceName = 'Distance Sensor';
      } else if (topicLower.includes('thermostat') || topicLower.includes('hvac') || topicLower.includes('climate') ||
                 messageKeys.some(k => k.includes('target'))) {
        detectedType = 'smart_thermostat';
        deviceName = 'Thermostat';
      } else if (topicLower.includes('lock') || topicLower.includes('deadbolt') ||
                 messageKeys.some(k => k.includes('lock')) || messageContent.includes('locked') || messageContent.includes('unlocked')) {
        detectedType = 'smart_lock';
        deviceName = 'Smart Lock';
      } else if (topicLower.includes('air') || topicLower.includes('quality') || topicLower.includes('co2') ||
                 messageKeys.some(k => k.includes('co2') || k.includes('pm') || k.includes('aqi'))) {
        detectedType = 'air_quality';
        deviceName = 'Air Quality Sensor';
      } else if (topicLower.includes('camera') || topicLower.includes('video') ||
                 messageKeys.some(k => k.includes('video') || k.includes('recording'))) {
        detectedType = 'security_camera';
        deviceName = 'Security Camera';
      } else if (topicLower.includes('water') || topicLower.includes('leak') || topicLower.includes('flood') ||
                 messageKeys.some(k => k.includes('water') || k.includes('leak')) || messageContent.includes('wet') || messageContent.includes('dry')) {
        detectedType = 'water_leak_sensor';
        deviceName = 'Water Leak Sensor';
      }

      // Extract room from topic
      let room = 'General';
      const roomPatterns = [
        /home\/([^\/]+)\//,
        /([^\/]+)\/[^\/]+$/,
        /\/([^\/]+)\//
      ];
      
      for (const pattern of roomPatterns) {
        const roomMatch = topic.match(pattern);
        if (roomMatch && roomMatch[1] && !['home', 'device', 'sensor', 'mqtt'].includes(roomMatch[1].toLowerCase())) {
          room = roomMatch[1].charAt(0).toUpperCase() + roomMatch[1].slice(1).replace(/[-_]/g, ' ');
          break;
        }
      }

      // Create device name based on topic structure
      const topicParts = topic.split('/');
      const lastPart = topicParts[topicParts.length - 1] || 'Device';
      const deviceIdentifier = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);

      detectedDevices.push({
        name: `${deviceName} (${deviceIdentifier})`,
        type: detectedType,
        topic: topic,
        room: room
      });
      
      console.log(`Detected device for topic ${topic}:`, {
        type: detectedType,
        name: deviceName,
        room: room,
        messageData: messageData
      });
    });

    console.log('Detected devices:', detectedDevices);
    return detectedDevices;
  }, [messages, devices, deletedTopics]);

  const getDevicesByType = useCallback((type) => {
    return Object.values(devices).filter(device => device.type === type);
  }, [devices]);

  const getDevicesByRoom = useCallback((room) => {
    return Object.values(devices).filter(device => device.room === room);
  }, [devices]);

  const getFilteredDevices = useCallback(() => {
    // Start with valid devices only - just check if device exists and has an id
    let filtered = Object.values(devices).filter(device => 
      device && device.id && typeof device === 'object'
    );

    console.log('Total devices before filtering:', filtered.length);
    console.log('Raw devices:', filtered.map(d => ({ id: d.id, name: d.name, topic: d.topic, isOnline: d.isOnline })));
    console.log('Device filters:', deviceFilters);

    if (deviceFilters.type !== 'all') {
      filtered = filtered.filter(device => device.type === deviceFilters.type);
      console.log('After type filter:', filtered.length);
    }

    if (deviceFilters.status !== 'all') {
      if (deviceFilters.status === 'online') {
        filtered = filtered.filter(device => device.isOnline === true);
      } else if (deviceFilters.status === 'offline') {
        filtered = filtered.filter(device => device.isOnline !== true);
      }
      console.log('After status filter:', filtered.length);
    }

    if (deviceFilters.room) {
      filtered = filtered.filter(device => device.room === deviceFilters.room);
      console.log('After room filter:', filtered.length);
    }

    if (deviceFilters.controllable) {
      if (deviceFilters.controllable === 'true') {
        filtered = filtered.filter(device => device.controllable === true);
      } else if (deviceFilters.controllable === 'false') {
        filtered = filtered.filter(device => device.controllable !== true);
      }
      console.log('After controllable filter:', filtered.length);
    }

    if (deviceFilters.enabled !== 'all') {
      if (deviceFilters.enabled === 'true') {
        filtered = filtered.filter(device => device.enabled === true);
      } else if (deviceFilters.enabled === 'false') {
        filtered = filtered.filter(device => device.enabled !== true);
      }
      console.log('After enabled filter:', filtered.length);
    }

    if (deviceFilters.search) {
      const searchLower = deviceFilters.search.toLowerCase();
      filtered = filtered.filter(device => {
        if (!device) return false;
        
        const name = (device.name || '').toLowerCase();
        const room = (device.room || '').toLowerCase();
        const topic = (device.topic || '').toLowerCase();
        
        return name.includes(searchLower) ||
               room.includes(searchLower) ||
               topic.includes(searchLower);
      });
      console.log('After search filter:', filtered.length);
    }

    console.log('Final filtered devices:', filtered.length);
    console.log('Filtered device details:', filtered.map(d => ({ id: d.id, name: d.name, topic: d.topic, isOnline: d.isOnline })));
    
    return filtered;
  }, [devices, deviceFilters]);

  const value = {
    devices,
    deviceLayouts,
    deviceFilters,
    deviceConfig,
    addDevice,
    removeDevice,
    updateDevice,
    toggleDeviceEnabled,
    controlDevice,
    updateLayout,
    autoDetectDevices,
    getDevicesByType,
    getDevicesByRoom,
    getFilteredDevices,
    setDeviceFilters,
    clearAllDevices,
    clearDeletedTopics,
    cleanupInvalidDevices,
    saveLayoutToDatabase,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}; 