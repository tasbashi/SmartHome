import React, { useState } from 'react';
import { useMqtt } from '../../contexts/MqttContext';
import { useDevices } from '../../contexts/DeviceContext';
import Icon from './Icon';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, connectionStatus, subscribedTopics } = useMqtt();
  const { devices } = useDevices();

  const formatMessage = (message) => {
    try {
      if (typeof message === 'string') {
        return JSON.stringify(JSON.parse(message), null, 2);
      }
      return JSON.stringify(message, null, 2);
    } catch {
      return message;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-16 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug Panel"
      >
        <Icon name="code" size={16} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-3 h-full">
          {/* Connection Status */}
          <div className="border-r border-gray-200 dark:border-gray-700 p-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Connection</h4>
            <div className="space-y-1 text-xs">
              <div className={`flex items-center space-x-1 ${connectionStatus.connected ? 'text-success-600' : 'text-danger-600'}`}>
                <Icon name={connectionStatus.connected ? "check-circle" : "x-circle"} size={12} />
                <span>{connectionStatus.connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {connectionStatus.brokerAddress && (
                <div className="text-gray-600 dark:text-gray-400">
                  {connectionStatus.brokerAddress}:{connectionStatus.port}
                </div>
              )}
              <div className="text-gray-600 dark:text-gray-400">
                Topics: {subscribedTopics.length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Devices: {Object.keys(devices).length}
              </div>
            </div>

            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-3 mb-2">Subscribed Topics</h4>
            <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
              {subscribedTopics.map((topic, index) => (
                <div key={index} className="font-mono text-gray-600 dark:text-gray-400 break-all">
                  {topic}
                </div>
              ))}
            </div>
          </div>

          {/* Device Status */}
          <div className="border-r border-gray-200 dark:border-gray-700 p-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Devices</h4>
            <div className="space-y-1 text-xs max-h-full overflow-y-auto">
              {Object.values(devices).map((device) => (
                <div key={device.id} className="space-y-1">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-success-500' : 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {device.name}
                    </span>
                  </div>
                  <div className="font-mono text-gray-600 dark:text-gray-400 break-all pl-3">
                    {device.topic}
                  </div>
                  {device.lastUpdated && (
                    <div className="text-gray-500 dark:text-gray-400 pl-3">
                      {new Date(device.lastUpdated).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Messages */}
          <div className="p-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Messages</h4>
            <div className="space-y-2 text-xs max-h-full overflow-y-auto">
              {messages.slice(0, 10).map((msg, index) => (
                <div key={index} className="border-b border-gray-100 dark:border-gray-700 pb-1">
                  <div className="font-mono text-gray-600 dark:text-gray-400 break-all">
                    {msg.topic}
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {formatMessage(msg.message).slice(0, 50)}...
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel; 