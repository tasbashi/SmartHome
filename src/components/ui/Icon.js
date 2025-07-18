import React from 'react';
import {
  Home, Thermometer, DoorOpen, DoorClosed, Zap, ZapOff, Activity, 
  CheckCircle, Ruler, Gauge, Pause, Power, Wind, Camera, Video, 
  CameraOff, Lock, Unlock, Droplets, ShieldCheck, AlertTriangle,
  Wifi, WifiOff, Settings, Users, TestTube, BarChart3, Moon, Sun,
  Menu, X, Plus, Trash2, Edit, Search, Filter, Download, Upload,
  RefreshCw, Bell, BellOff, Eye, EyeOff, Play, Square, RotateCcw,
  TrendingUp, TrendingDown, Battery, BatteryLow, Signal, SignalHigh,
  SignalLow, MapPin, Clock, Calendar, Lightbulb, Fan, AirVent,
  Shield, AlertCircle, Info, Check, AlertOctagon, Grid3X3, List,
  Code, XCircle, Bug
} from 'lucide-react';

const iconMap = {
  // General
  'home': Home,
  'settings': Settings,
  'users': Users,
  'test-tube': TestTube,
  'bar-chart': BarChart3,
  'moon': Moon,
  'sun': Sun,
  'menu': Menu,
  'x': X,
  'plus': Plus,
  'trash': Trash2,
  'edit': Edit,
  'search': Search,
  'filter': Filter,
  'download': Download,
  'upload': Upload,
  'refresh': RefreshCw,
  'bell': Bell,
  'bell-off': BellOff,
  'eye': Eye,
  'eye-off': EyeOff,
  'play': Play,
  'square': Square,
  'rotate': RotateCcw,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,

  // Device types
  'thermometer': Thermometer,
  'door-open': DoorOpen,
  'door-closed': DoorClosed,
  'zap': Zap,
  'zap-off': ZapOff,
  'activity': Activity,
  'check-circle': CheckCircle,
  'ruler': Ruler,
  'gauge': Gauge,
  'pause': Pause,
  'power': Power,
  'wind': Wind,
  'camera': Camera,
  'video': Video,
  'camera-off': CameraOff,
  'lock': Lock,
  'unlock': Unlock,
  'droplets': Droplets,
  'shield-check': ShieldCheck,
  'alert-triangle': AlertTriangle,
  'lightbulb': Lightbulb,
  'fan': Fan,
  'air-vent': AirVent,
  'shield': Shield,

  // Status indicators
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'battery': Battery,
  'battery-low': BatteryLow,
  'signal': Signal,
  'signal-high': SignalHigh,
  'signal-low': SignalLow,
  'map-pin': MapPin,
  'clock': Clock,
  'calendar': Calendar,
  'alert-circle': AlertCircle,
  'info': Info,
  'check': Check,
  'alert-octagon': AlertOctagon,
  'x-circle': XCircle,
  
  // Layout and UI
  'grid-3x3': Grid3X3,
  'list': List,
  'code': Code,
  'bug': Bug,
};

const Icon = ({ 
  name, 
  size = 20, 
  className = '', 
  color,
  strokeWidth = 2,
  ...props 
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(iconMap));
    return React.createElement(iconMap['alert-circle'], { 
      size, 
      className, 
      color, 
      strokeWidth, 
      ...props 
    });
  }

  return React.createElement(IconComponent, { 
    size, 
    className, 
    color, 
    strokeWidth, 
    ...props 
  });
};

export default Icon; 