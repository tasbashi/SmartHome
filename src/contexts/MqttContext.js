import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const MqttContext = createContext();

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within an MqttProvider');
  }
  return context;
};

export const MqttProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    brokerAddress: '',
    port: '',
    lastConnected: null,
    error: null
  });
  const [messages, setMessages] = useState([]);
  const [subscribedTopics, setSubscribedTopics] = useState(new Set());

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('connectionStatus', (status) => {
      setConnectionStatus(status);
    });

    newSocket.on('mqttMessage', (data) => {
      const newMessage = {
        ...data,
        id: Date.now() + Math.random(),
        timestamp: new Date()
      };
      setMessages(prev => [newMessage, ...prev.slice(0, 99)]); // Keep last 100 messages
    });

    newSocket.on('subscriptionConfirmed', (topic) => {
      setSubscribedTopics(prev => new Set([...prev, topic]));
    });

    newSocket.on('subscriptionError', (error) => {
      console.error('Subscription error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const connectToMqtt = useCallback(async (connectionParams) => {
    if (!socket) return;

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionParams),
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [socket]);

  const disconnectFromMqtt = useCallback(async () => {
    if (!socket) return;

    try {
      const response = await fetch('/api/disconnect', {
        method: 'POST',
      });

      const result = await response.json();
      
      if (response.ok) {
        setSubscribedTopics(new Set());
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [socket]);

  const subscribeToTopic = useCallback((topic, qos = 0) => {
    if (!socket || !connectionStatus.connected) return;

    socket.emit('subscribe', { topic, qos });
  }, [socket, connectionStatus.connected]);

  const unsubscribeFromTopic = useCallback((topic) => {
    if (!socket || !connectionStatus.connected) {
      console.log('Cannot unsubscribe: socket not connected');
      return;
    }

    console.log('Unsubscribing from topic:', topic);
    socket.emit('unsubscribe', { topic });
    
    // Remove from subscribed topics immediately
    setSubscribedTopics(prev => {
      const newSet = new Set(prev);
      newSet.delete(topic);
      console.log('Topic removed from subscription list:', topic);
      console.log('Remaining subscriptions:', Array.from(newSet));
      return newSet;
    });
    
    // Emit additional cleanup event if needed
    socket.emit('cleanup-topic', { topic });
    
  }, [socket, connectionStatus.connected]);

  const publishMessage = useCallback((topic, message, qos = 0) => {
    if (!socket || !connectionStatus.connected) return;

    // Add _send suffix to topics when publishing from UI to devices
    const sendTopic = topic.endsWith('_send') ? topic : `${topic}_send`;
    
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`Publishing to topic: ${sendTopic}`, payload);
    socket.emit('publish', { topic: sendTopic, message: payload, qos });
  }, [socket, connectionStatus.connected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const value = {
    isConnected,
    connectionStatus,
    messages,
    subscribedTopics: Array.from(subscribedTopics),
    connectToMqtt,
    disconnectFromMqtt,
    subscribeToTopic,
    unsubscribeFromTopic,
    publishMessage,
    clearMessages,
  };

  return (
    <MqttContext.Provider value={value}>
      {children}
    </MqttContext.Provider>
  );
}; 