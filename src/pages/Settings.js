import React, { useState, useEffect } from 'react';
import { useMqtt } from '../contexts/MqttContext';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/ui/Icon';

const Settings = () => {
  const { connectToMqtt, disconnectFromMqtt, connectionStatus } = useMqtt();
  const { isDark, toggleTheme } = useTheme();
  
  const [connectionSettings, setConnectionSettings] = useState({
    brokerAddress: '',
    port: 8883,
    username: '',
    password: '',
    useTLS: true,
    cleanSession: true,
    useAwsCerts: false
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Certificate management state
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState('');
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  
  // AWS certificates state
  const [awsCertificates, setAwsCertificates] = useState({
    ca: null,
    client: null,
    key: null
  });
  const [awsUploadStatus, setAwsUploadStatus] = useState({
    ca: '',
    client: '',
    key: ''
  });

  useEffect(() => {
    // Load saved connection settings
    const saved = localStorage.getItem('mqtt-connection-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setConnectionSettings(prev => ({ ...prev, ...settings }));
      } catch (error) {
        console.error('Error loading connection settings:', error);
      }
    }
  }, []);

  // Load certificates on component mount
  useEffect(() => {
    loadCertificates();
  }, []);

  // Load certificates from server
  const loadCertificates = async () => {
    try {
      const response = await fetch('/api/certificates');
      const result = await response.json();
      if (response.ok) {
        setCertificates(result.certificates || []);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
  };

  // Handle certificate file upload
  const handleCertificateUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingCert(true);
    setUploadMessage('');

    const formData = new FormData();
    formData.append('certificate', file);

    try {
      const response = await fetch('/api/upload-certificate', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadMessage('Certificate uploaded successfully!');
        loadCertificates();
        event.target.value = ''; // Clear input
      } else {
        setUploadMessage(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`Upload error: ${error.message}`);
    } finally {
      setIsUploadingCert(false);
    }
  };

  // Handle AWS certificate upload
  const handleAwsCertificateUpload = async (event, certType) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('awsCertificate', file);
    formData.append('certType', certType);

    setAwsUploadStatus(prev => ({ ...prev, [certType]: 'Uploading...' }));

    try {
      const response = await fetch('/api/upload-aws-certificate', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setAwsCertificates(prev => ({ ...prev, [certType]: result.filename }));
        setAwsUploadStatus(prev => ({ ...prev, [certType]: `✓ ${file.name}` }));
      } else {
        setAwsUploadStatus(prev => ({ ...prev, [certType]: `✗ ${result.error}` }));
      }
    } catch (error) {
      setAwsUploadStatus(prev => ({ ...prev, [certType]: `✗ Upload error` }));
    } finally {
      event.target.value = ''; // Clear input
    }
  };

  const saveConnectionSettings = (settings) => {
    // Don't save password for security
    const toSave = { ...settings };
    delete toSave.password;
    localStorage.setItem('mqtt-connection-settings', JSON.stringify(toSave));
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionMessage('');

    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...connectionSettings,
          certificateFile: selectedCertificate,
          useAwsCerts: connectionSettings.useAwsCerts
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setConnectionMessage('Connected successfully!');
        saveConnectionSettings(connectionSettings);
      } else {
        setConnectionMessage(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      setConnectionMessage(`Connection error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsConnecting(true);
    setConnectionMessage('Disconnecting...');

    try {
      const result = await disconnectFromMqtt();
      
      if (result.success) {
        setConnectionMessage('Disconnected successfully');
      } else {
        setConnectionMessage(`Disconnect failed: ${result.error}`);
      }
    } catch (error) {
      setConnectionMessage(`Disconnect error: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testConfigurations = [
    {
      name: 'EMQX Public (MQTT)',
      config: {
        brokerAddress: 'broker.emqx.io',
        port: 1883,
        useTLS: false,
        username: '',
        password: ''
      }
    },
    {
      name: 'EMQX Public (MQTTS)',
      config: {
        brokerAddress: 'broker.emqx.io',
        port: 8883,
        useTLS: true,
        username: '',
        password: ''
      }
    },
    {
      name: 'Eclipse IoT',
      config: {
        brokerAddress: 'iot.eclipse.org',
        port: 1883,
        useTLS: false,
        username: '',
        password: ''
      }
    },
    {
      name: 'Mosquitto Test',
      config: {
        brokerAddress: 'test.mosquitto.org',
        port: 1883,
        useTLS: false,
        username: '',
        password: ''
      }
    }
  ];

  const loadTestConfig = (config) => {
    setConnectionSettings(prev => ({
      ...prev,
      ...config,
      cleanSession: true,
      useAwsCerts: false
    }));
  };

  const clearData = () => {
    if (window.confirm('This will clear all saved devices and settings. Are you sure?')) {
      localStorage.removeItem('smart-home-devices');
      localStorage.removeItem('smart-home-layout');
      localStorage.removeItem('mqtt-connection-settings');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
          Configure your smart home dashboard
        </p>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* MQTT Connection */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            MQTT Connection
          </h2>
          
          <div className="grid mobile-grid-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Broker Address
              </label>
              <input
                type="text"
                className="input"
                placeholder="broker.example.com"
                value={connectionSettings.brokerAddress}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  brokerAddress: e.target.value
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Port
              </label>
              <input
                type="number"
                className="input"
                placeholder="8883"
                value={connectionSettings.port}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  port: parseInt(e.target.value) || 8883
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username (Optional)
              </label>
              <input
                type="text"
                className="input"
                placeholder="username"
                value={connectionSettings.username}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  username: e.target.value
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password (Optional)
              </label>
              <input
                type="password"
                className="input"
                placeholder="password"
                value={connectionSettings.password}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  password: e.target.value
                })}
              />
            </div>
          </div>

          <div className="space-y-3 mb-6 form-mobile">
            <label className="flex items-center touch-manipulation">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                checked={connectionSettings.useTLS}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  useTLS: e.target.checked
                })}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use TLS/SSL
              </span>
            </label>

            <label className="flex items-center touch-manipulation">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                checked={connectionSettings.cleanSession}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  cleanSession: e.target.checked
                })}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Clean Session
              </span>
            </label>

            <label className="flex items-center touch-manipulation">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                checked={connectionSettings.useAwsCerts}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  useAwsCerts: e.target.checked
                })}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use AWS IoT Certificates
              </span>
            </label>
          </div>

          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 mb-4">
            {!connectionStatus.connected ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="btn btn-primary w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Icon name="refresh" size={16} className="mr-2 spinner" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Icon name="wifi" size={16} className="mr-2" />
                    Connect
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="btn btn-danger w-full sm:w-auto"
              >
                <Icon name="wifi-off" size={16} className="mr-2" />
                Disconnect
              </button>
            )}

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              <Icon name="settings" size={16} className="mr-2" />
              Advanced
            </button>
          </div>

          {connectionMessage && (
            <div className={`p-3 rounded-lg ${
              connectionMessage.includes('success') || connectionMessage.includes('Connected')
                ? 'bg-success-50 text-success-800 dark:bg-success-900/20 dark:text-success-200'
                : 'bg-danger-50 text-danger-800 dark:bg-danger-900/20 dark:text-danger-200'
            }`}>
              {connectionMessage}
            </div>
          )}

          {/* Test Configurations */}
          {showAdvanced && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Quick Test Configurations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testConfigurations.map((test, index) => (
                  <button
                    key={index}
                    onClick={() => loadTestConfig(test.config)}
                    className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {test.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {test.config.brokerAddress}:{test.config.port}
                      {test.config.useTLS ? ' (TLS)' : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Certificate Management */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            <Icon name="shield" size={20} className="mr-2 inline" />
            Certificate Management
          </h2>
          
          {!connectionSettings.useAwsCerts ? (
            <>
              {/* Standard Certificate Upload */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Standard TLS Certificate
                </h3>
                
                <div className="mb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Certificate (.crt, .cer, .pem, .key)
                    </label>
                    <input
                      type="file"
                      accept=".crt,.cer,.pem,.key"
                      onChange={handleCertificateUpload}
                      disabled={isUploadingCert}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-200 file:touch-manipulation"
                    />
                    {isUploadingCert && (
                      <div className="mt-2 text-sm text-primary-600 dark:text-primary-400">
                        <Icon name="refresh" size={14} className="mr-1 inline spinner" />
                        Uploading...
                      </div>
                    )}
                  </div>

                  {uploadMessage && (
                    <div className={`p-3 rounded-lg ${
                      uploadMessage.includes('success')
                        ? 'bg-success-50 text-success-800 dark:bg-success-900/20 dark:text-success-200'
                        : 'bg-danger-50 text-danger-800 dark:bg-danger-900/20 dark:text-danger-200'
                    }`}>
                      {uploadMessage}
                    </div>
                  )}

                  {/* Certificate Selection */}
                  {certificates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Certificate for Connection
                      </label>
                      <select
                        value={selectedCertificate}
                        onChange={(e) => setSelectedCertificate(e.target.value)}
                        className="input"
                      >
                        <option value="">Select a certificate (optional)</option>
                        {certificates.map((cert, index) => (
                          <option key={index} value={cert}>
                            {cert}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Certificate List */}
                {certificates.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Certificates:
                    </h4>
                    <div className="space-y-2">
                      {certificates.map((cert, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Icon name="shield" size={16} className="mr-3 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 break-all">{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <Icon name="shield" size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No certificates uploaded yet
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* AWS Certificate Upload */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
                  <Icon name="cloud" size={18} className="mr-2 inline text-orange-500" />
                  AWS IoT Certificates
                </h3>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-6">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    AWS IoT requires three certificate files: CA Certificate, Client Certificate, and Private Key.
                    Upload all three files to establish a secure connection.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* CA Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Icon name="shield" size={16} className="mr-1 inline" />
                      CA Certificate (ca-cert.pem)
                    </label>
                    <input
                      type="file"
                      accept=".pem,.crt"
                      onChange={(e) => handleAwsCertificateUpload(e, 'ca')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900 dark:file:text-orange-200 file:touch-manipulation"
                    />
                    {awsUploadStatus.ca && (
                      <div className={`mt-2 text-xs ${
                        awsUploadStatus.ca.includes('✓') 
                          ? 'text-success-600 dark:text-success-400' 
                          : awsUploadStatus.ca.includes('✗')
                          ? 'text-danger-600 dark:text-danger-400'
                          : 'text-primary-600 dark:text-primary-400'
                      }`}>
                        {awsUploadStatus.ca}
                      </div>
                    )}
                  </div>

                  {/* Client Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Icon name="user" size={16} className="mr-1 inline" />
                      Client Certificate (client-cert.pem)
                    </label>
                    <input
                      type="file"
                      accept=".pem,.crt"
                      onChange={(e) => handleAwsCertificateUpload(e, 'client')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900 dark:file:text-orange-200 file:touch-manipulation"
                    />
                    {awsUploadStatus.client && (
                      <div className={`mt-2 text-xs ${
                        awsUploadStatus.client.includes('✓') 
                          ? 'text-success-600 dark:text-success-400' 
                          : awsUploadStatus.client.includes('✗')
                          ? 'text-danger-600 dark:text-danger-400'
                          : 'text-primary-600 dark:text-primary-400'
                      }`}>
                        {awsUploadStatus.client}
                      </div>
                    )}
                  </div>

                  {/* Private Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Icon name="key" size={16} className="mr-1 inline" />
                      Private Key (client-key.pem)
                    </label>
                    <input
                      type="file"
                      accept=".pem,.key"
                      onChange={(e) => handleAwsCertificateUpload(e, 'key')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900 dark:file:text-orange-200 file:touch-manipulation"
                    />
                    {awsUploadStatus.key && (
                      <div className={`mt-2 text-xs ${
                        awsUploadStatus.key.includes('✓') 
                          ? 'text-success-600 dark:text-success-400' 
                          : awsUploadStatus.key.includes('✗')
                          ? 'text-danger-600 dark:text-danger-400'
                          : 'text-primary-600 dark:text-primary-400'
                      }`}>
                        {awsUploadStatus.key}
                      </div>
                    )}
                  </div>
                </div>

                {/* AWS Status Summary */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Upload Status:
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center ${awsCertificates.ca ? 'text-success-600' : 'text-gray-500'}`}>
                      <Icon name={awsCertificates.ca ? "check" : "x"} size={12} className="mr-2 flex-shrink-0" />
                      <span>CA Certificate {awsCertificates.ca ? '(Ready)' : '(Missing)'}</span>
                    </div>
                    <div className={`flex items-center ${awsCertificates.client ? 'text-success-600' : 'text-gray-500'}`}>
                      <Icon name={awsCertificates.client ? "check" : "x"} size={12} className="mr-2 flex-shrink-0" />
                      <span>Client Certificate {awsCertificates.client ? '(Ready)' : '(Missing)'}</span>
                    </div>
                    <div className={`flex items-center ${awsCertificates.key ? 'text-success-600' : 'text-gray-500'}`}>
                      <Icon name={awsCertificates.key ? "check" : "x"} size={12} className="mr-2 flex-shrink-0" />
                      <span>Private Key {awsCertificates.key ? '(Ready)' : '(Missing)'}</span>
                    </div>
                  </div>
                  
                  {awsCertificates.ca && awsCertificates.client && awsCertificates.key && (
                    <div className="mt-3 p-3 bg-success-50 dark:bg-success-900/20 rounded text-success-800 dark:text-success-200 text-xs">
                      <Icon name="check-circle" size={12} className="mr-2 inline" />
                      All AWS certificates uploaded! Ready for secure connection.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Appearance */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toggle between light and dark themes
                </p>
              </div>
              
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                  isDark ? 'bg-primary-600' : 'bg-gray-200'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            Data Management
          </h2>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Clear All Data
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remove all saved devices, layouts, and settings
                </p>
              </div>
              
              <button
                onClick={clearData}
                className="btn btn-danger w-full sm:w-auto"
              >
                <Icon name="trash" size={16} className="mr-2" />
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            System Information
          </h2>
          
          <div className="grid mobile-grid-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Version:</span>
              <span className="text-gray-900 dark:text-white">1.0.0</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Build:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Theme:</span>
              <span className="text-gray-900 dark:text-white">
                {isDark ? 'Dark' : 'Light'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Connection:</span>
              <span className={`${
                connectionStatus.connected 
                  ? 'text-success-600 dark:text-success-400' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {connectionStatus.connected ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 