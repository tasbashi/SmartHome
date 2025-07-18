import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDevices } from '../contexts/DeviceContext';
import { useMqtt } from '../contexts/MqttContext';
import { useAuth } from '../contexts/AuthContext';
import DeviceWidget from '../components/devices/DeviceWidget';
import Icon from '../components/ui/Icon';
import '../styles/grid-dashboard.css';

const GRID_SIZE = 10;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 250;

const GridDashboard = () => {
  const { devices, deviceLayouts, updateLayout, clearAllDevices, cleanupInvalidDevices, autoDetectDevices, addDevice, saveLayoutToDatabase } = useDevices();
  const { connectionStatus } = useMqtt();
  const { refreshDashboardConfig, dashboardConfig, configLoading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [widgets, setWidgets] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');
  const containerRef = useRef(null);
  
  // Drag state
  const [dragState, setDragState] = useState({
    isDragging: false,
    widgetId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });
  
  // Resize state
  const [resizeState, setResizeState] = useState({
    isResizing: false,
    widgetId: null,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startLeft: 0,
    startTop: 0
  });

  const deviceList = Object.values(devices).filter(device => device.enabled !== false);
  const onlineDevices = deviceList.filter(device => device.isOnline);
  const offlineDevices = deviceList.filter(device => !device.isOnline);

  // Initialize widgets
  useEffect(() => {
    const newWidgets = deviceList.map((device, index) => {
      const existingLayout = deviceLayouts.find(l => l.i === device.id);
      
      if (existingLayout) {
        return {
          id: device.id,
          x: existingLayout.x * GRID_SIZE,
          y: existingLayout.y * GRID_SIZE,
          width: existingLayout.w * GRID_SIZE,
          height: existingLayout.h * GRID_SIZE,
          device: device
        };
      }
      
      const col = index % 3;
      const row = Math.floor(index / 3);
      
      return {
        id: device.id,
        x: col * (DEFAULT_WIDTH + GRID_SIZE * 2),
        y: row * (DEFAULT_HEIGHT + GRID_SIZE * 2),
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        device: device
      };
    });
    
    setWidgets(newWidgets);
  }, [deviceList, deviceLayouts]);

  // Snap to grid
  const snapToGrid = (value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Save layout
  const saveCurrentLayout = useCallback(async () => {
    const newLayout = widgets.map(w => ({
      i: w.id,
      x: Math.round(w.x / GRID_SIZE),
      y: Math.round(w.y / GRID_SIZE),
      w: Math.round(w.width / GRID_SIZE),
      h: Math.round(w.height / GRID_SIZE)
    }));
    
    updateLayout(newLayout);
    
    try {
      await saveLayoutToDatabase();
      setSaveMessage('Layout otomatik kaydedildi');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Layout kaydetme hatası:', error);
      setSaveMessage('Kaydetme başarısız');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [widgets, updateLayout, saveLayoutToDatabase]);

  // Start dragging
  const handleDragStart = useCallback((e, widgetId) => {
    if (e.target.classList.contains('resize-handle')) return;
    
    e.preventDefault();
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragState({
      isDragging: true,
      widgetId: widgetId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: offsetX,
      offsetY: offsetY
    });
  }, [widgets]);

  // Start resizing
  const handleResizeStart = useCallback((e, widgetId, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    setResizeState({
      isResizing: true,
      widgetId: widgetId,
      handle: handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: widget.width,
      startHeight: widget.height,
      startLeft: widget.x,
      startTop: widget.y
    });
  }, [widgets]);

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;

    // Handle dragging
    if (dragState.isDragging && dragState.widgetId) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = snapToGrid(e.clientX - containerRect.left - dragState.offsetX);
      const newY = snapToGrid(e.clientY - containerRect.top - dragState.offsetY);

      setWidgets(prev => prev.map(w => {
        if (w.id === dragState.widgetId) {
          return {
            ...w,
            x: Math.max(0, newX),
            y: Math.max(0, newY)
          };
        }
        return w;
      }));
    }

    // Handle resizing
    if (resizeState.isResizing && resizeState.widgetId) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;

      setWidgets(prev => prev.map(w => {
        if (w.id === resizeState.widgetId) {
          let newWidth = resizeState.startWidth;
          let newHeight = resizeState.startHeight;
          let newX = resizeState.startLeft;
          let newY = resizeState.startTop;

          switch (resizeState.handle) {
            case 'e':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth + deltaX));
              break;
            case 'w':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth - deltaX));
              if (newWidth !== resizeState.startWidth) {
                newX = snapToGrid(resizeState.startLeft + (resizeState.startWidth - newWidth));
              }
              break;
            case 's':
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight + deltaY));
              break;
            case 'n':
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight - deltaY));
              if (newHeight !== resizeState.startHeight) {
                newY = snapToGrid(resizeState.startTop + (resizeState.startHeight - newHeight));
              }
              break;
            case 'se':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth + deltaX));
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight + deltaY));
              break;
            case 'sw':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth - deltaX));
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight + deltaY));
              if (newWidth !== resizeState.startWidth) {
                newX = snapToGrid(resizeState.startLeft + (resizeState.startWidth - newWidth));
              }
              break;
            case 'ne':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth + deltaX));
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight - deltaY));
              if (newHeight !== resizeState.startHeight) {
                newY = snapToGrid(resizeState.startTop + (resizeState.startHeight - newHeight));
              }
              break;
            case 'nw':
              newWidth = Math.max(MIN_WIDTH, snapToGrid(resizeState.startWidth - deltaX));
              newHeight = Math.max(MIN_HEIGHT, snapToGrid(resizeState.startHeight - deltaY));
              if (newWidth !== resizeState.startWidth) {
                newX = snapToGrid(resizeState.startLeft + (resizeState.startWidth - newWidth));
              }
              if (newHeight !== resizeState.startHeight) {
                newY = snapToGrid(resizeState.startTop + (resizeState.startHeight - newHeight));
              }
              break;
          }

          return {
            ...w,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: newWidth,
            height: newHeight
          };
        }
        return w;
      }));
    }
  }, [dragState, resizeState]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging || resizeState.isResizing) {
      saveCurrentLayout();
    }
    
    setDragState({
      isDragging: false,
      widgetId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    });
    
    setResizeState({
      isResizing: false,
      widgetId: null,
      handle: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      startLeft: 0,
      startTop: 0
    });
  }, [dragState.isDragging, resizeState.isResizing, saveCurrentLayout]);

  // Global mouse events
  useEffect(() => {
    const onMouseMove = (e) => handleMouseMove(e);
    const onMouseUp = () => handleMouseUp();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await refreshDashboardConfig();
    } catch (error) {
      console.error('Senkronizasyon hatası:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoDetect = () => {
    const detectedDevices = autoDetectDevices();
    if (detectedDevices.length > 0) {
      detectedDevices.forEach(device => {
        addDevice(device);
      });
    }
  };

  const handleSaveLayout = async () => {
    try {
      await saveLayoutToDatabase();
      setSaveMessage('Layout başarıyla kaydedildi!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Kaydetme başarısız');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const getQuickStats = () => {
    const stats = {
      totalDevices: deviceList.length,
      onlineDevices: onlineDevices.length,
      offlineDevices: offlineDevices.length,
      temperature: 0,
      humidity: 0,
      alerts: 0
    };

    const tempDevices = deviceList.filter(device => device.data?.Temp);
    const humidityDevices = deviceList.filter(device => device.data?.Humidity);
    
    if (tempDevices.length > 0) {
      stats.temperature = (tempDevices.reduce((sum, device) => sum + device.data.Temp, 0) / tempDevices.length).toFixed(1);
    }
    
    if (humidityDevices.length > 0) {
      stats.humidity = (humidityDevices.reduce((sum, device) => sum + device.data.Humidity, 0) / humidityDevices.length).toFixed(1);
    }

    stats.alerts = deviceList.filter(device => 
      device.data?.Door === 'Open' || 
      device.data?.Motion === 'Detected' ||
      device.data?.Status === 'Wet'
    ).length;

    return stats;
  };

  const stats = getQuickStats();

  if (configLoading) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="text-center py-8 sm:py-12">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <Icon name="loader-2" size={40} className="sm:w-12 sm:h-12 text-gray-400 animate-spin" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
            Dashboard Yükleniyor...
          </h2>
        </div>
      </div>
    );
  }

  if (deviceList.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-0">
        <div className="text-center py-8 sm:py-12">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <Icon name="home" size={40} className="sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-4">
            Akıllı Ev Panelinize Hoş Geldiniz
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto px-4 text-sm sm:text-base">
            İlk cihazınızı ekleyerek başlayın. Manuel olarak ekleyebilir veya otomatik keşif özelliğini kullanabilirsiniz.
          </p>
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center px-4">
            <button 
              className="btn btn-primary w-full sm:w-auto"
              onClick={() => window.location.href = '/devices'}
            >
              <Icon name="plus" size={20} className="mr-2" />
              Cihaz Ekle
            </button>
            <button 
              className="btn btn-secondary w-full sm:w-auto"
              onClick={handleAutoDetect}
            >
              <Icon name="search" size={20} className="mr-2" />
              Otomatik Keşif
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Save message */}
      {saveMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
          saveMessage.includes('başarısız') ? 'bg-danger-500 text-white' : 'bg-success-500 text-white'
        }`}>
          {saveMessage}
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Cihazlarınızı izleyin ve kontrol edin
          </p>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="btn btn-secondary w-full sm:w-auto"
            title="Grid çizgilerini göster/gizle"
          >
            <Icon name="grid-3x3" size={20} className="mr-2" />
            {showGrid ? 'Grid Gizle' : 'Grid Göster'}
          </button>
          
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="btn btn-secondary w-full sm:w-auto"
            title="Diğer cihazlarla senkronize et"
          >
            <Icon 
              name={isSyncing ? 'loader-2' : 'refresh-cw'} 
              size={20} 
              className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} 
            />
            {isSyncing ? 'Senkronize ediliyor...' : 'Senkronize Et'}
          </button>
          
          <button
            onClick={handleSaveLayout}
            className="btn btn-primary w-full sm:w-auto"
          >
            <Icon name="save" size={20} className="mr-2" />
            Layout Kaydet
          </button>
          
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.connected ? 'bg-success-500' : 'bg-danger-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {connectionStatus.connected ? 'Bağlı' : 'Bağlı Değil'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid mobile-grid-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Icon name="home" size={16} className="sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Toplam</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.totalDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-success-100 dark:bg-success-900 rounded-lg">
              <Icon name="check-circle" size={16} className="sm:w-5 sm:h-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Çevrimiçi</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.onlineDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-danger-100 dark:bg-danger-900 rounded-lg">
              <Icon name="alert-circle" size={16} className="sm:w-5 sm:h-5 text-danger-600 dark:text-danger-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Çevrimdışı</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.offlineDevices}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Icon name="thermometer" size={16} className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Sıcaklık</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.temperature}°C
              </p>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
              <Icon name="droplets" size={16} className="sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Nem</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.humidity}%
              </p>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Icon name="alert-triangle" size={16} className="sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Uyarılar</p>
              <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {stats.alerts}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Device Grid */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Cihaz Görünümü
        </h2>
        
        <div className="mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <Icon name="info" size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              <strong>Grid Dashboard Kullanımı:</strong>
              <div className="mt-1 space-y-1">
                <div>• Widget'ları sürükleyerek taşıyın</div>
                <div>• Köşe ve kenarlardan tutarak boyutlandırın</div>
                <div>• Değişiklikler otomatik kaydedilir</div>
                <div>• Grid sistemi düzenli hizalama sağlar</div>
              </div>
            </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className={`grid-container ${showGrid ? 'show-grid' : ''}`}
        >
          {/* Widgets */}
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`grid-widget ${
                dragState.isDragging && dragState.widgetId === widget.id ? 'dragging' : ''
              } ${
                resizeState.isResizing && resizeState.widgetId === widget.id ? 'resizing' : ''
              }`}
              style={{
                left: `${widget.x}px`,
                top: `${widget.y}px`,
                width: `${widget.width}px`,
                height: `${widget.height}px`
              }}
              onMouseDown={(e) => handleDragStart(e, widget.id)}
            >
              {/* Resize handles */}
              <div 
                className="resize-handle resize-n" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'n')} 
              />
              <div 
                className="resize-handle resize-e" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'e')} 
              />
              <div 
                className="resize-handle resize-s" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 's')} 
              />
              <div 
                className="resize-handle resize-w" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'w')} 
              />
              <div 
                className="resize-handle resize-ne" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'ne')} 
              />
              <div 
                className="resize-handle resize-nw" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'nw')} 
              />
              <div 
                className="resize-handle resize-se" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'se')} 
              />
              <div 
                className="resize-handle resize-sw" 
                onMouseDown={(e) => handleResizeStart(e, widget.id, 'sw')} 
              />
              
              {/* Widget content */}
              <div className="widget-content">
                <DeviceWidget device={widget.device} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GridDashboard;