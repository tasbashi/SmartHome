# Smart Home MQTT Dashboard

A modern, responsive web-based smart home control panel built with React and Node.js, featuring real-time MQTT communication, user authentication, and personalized dashboards for comprehensive IoT device management.

![Smart Home Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green) ![License](https://img.shields.io/badge/License-MIT-blue) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-16+-green) ![MQTT](https://img.shields.io/badge/MQTT-5.0-orange) ![Authentication](https://img.shields.io/badge/Authentication-Secure-red)

## ✨ Features

### 🔐 User Authentication & Management
- **Secure user registration** with email validation and password hashing
- **Session-based authentication** with secure HTTP-only cookies
- **Personalized dashboards** - each user gets their own isolated configuration
- **User-specific settings** with persistent storage per account
- **Secure logout** with complete session cleanup
- **Password security** with bcrypt hashing and salt rounds

### 🏠 Smart Dashboard
- **Real-time device monitoring** with interactive widgets
- **Drag-and-drop layout** customization with persistent storage per user
- **Responsive grid system** that adapts to all screen sizes
- **Live statistics** showing device counts, temperature averages, and system alerts
- **Dark/Light theme** with automatic detection and manual toggle
- **Customizable widgets** with resizable and repositionable cards
- **User-isolated configurations** - each user's dashboard is completely separate

### 🔧 Advanced Device Management
- **Automatic device detection** based on MQTT topic patterns
- **Manual device configuration** with comprehensive device type support
- **Real-time control** for interactive devices (relays, thermostats, locks)
- **Device filtering** by type, status, room, and custom criteria
- **Live status updates** with last-seen timestamps and battery monitoring
- **Device simulation** for testing and development
- **Per-user device access** with secure authentication

### 🧪 Testing & Development Tools
- **MQTT message testing** with custom topics and JSON payloads
- **Real-time message logging** with color-coded topics and timestamps
- **Device simulation suite** with realistic data patterns
- **Auto-simulation mode** for continuous testing scenarios
- **Quick message templates** for all supported device types
- **Debug panel** with comprehensive system information
- **Authenticated access** to all testing tools

### ⚙️ Professional Configuration
- **MQTT broker connectivity** with full TLS/SSL support
- **AWS IoT Core integration** with certificate-based authentication
- **Multi-broker support** with quick test configurations
- **Certificate management** with upload and validation
- **Data export/import** for backup and migration
- **Environment-specific settings** with secure credential handling
- **User-specific configurations** saved per account

## 🏗️ Architecture Overview

### Frontend Technology Stack
- **React 18** with modern hooks and functional components
- **TailwindCSS** for responsive, utility-first styling
- **React Router** for seamless single-page navigation
- **React Grid Layout** for drag-and-drop dashboard functionality
- **Lucide React** for consistent, beautiful iconography
- **Socket.IO Client** for real-time bidirectional communication
- **Recharts** for data visualization and analytics
- **Context API** for global state management and authentication

### Backend Infrastructure
- **Express.js** server with RESTful API architecture
- **Socket.IO** for real-time WebSocket communication
- **MQTT.js** with full MQTT 5.0 protocol support
- **SQLite Database** for user management and settings storage
- **Express Session** for secure session management
- **bcrypt** for password hashing and security
- **Multer** for secure file upload handling
- **fs-extra** for enhanced file system operations
- **TLS/SSL** support for secure connections

### Database Schema
- **Users Table**: Secure user credentials with hashed passwords
- **User Settings Table**: Personalized application settings per user
- **Dashboard Config Table**: Individual dashboard layouts and configurations
- **Foreign Key Constraints**: Ensures data integrity and user isolation

### Supported IoT Device Types
| Device Type | Icon | Features | Controllable |
|-------------|------|----------|--------------|
| 🌡️ **Temperature Sensors** | thermometer | Temperature, humidity monitoring | ❌ |
| 🚪 **Door Sensors** | door-open | Open/closed status, battery monitoring | ❌ |
| ⚡ **Smart Relays** | zap | Switch control, power monitoring | ✅ |
| 🏃 **Motion Sensors** | activity | Movement detection, timestamps | ❌ |
| 📏 **Distance Sensors** | ruler | Ultrasonic measurements, quality indicators | ❌ |
| 🏠 **Smart Thermostats** | gauge | Temperature control, mode selection | ✅ |
| 💨 **Air Quality Sensors** | wind | CO2, PM2.5, VOC, AQI monitoring | ❌ |
| 📹 **Security Cameras** | camera | Recording status, motion alerts | ❌ |
| 🔒 **Smart Locks** | lock | Lock/unlock control, user tracking | ✅ |
| 💧 **Water Leak Sensors** | droplets | Leak detection, battery status | ❌ |

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js 16+** and npm
- **MQTT Broker** (local Mosquitto, cloud service, or AWS IoT Core)
- **Modern web browser** with JavaScript enabled

### Installation Steps

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd smart-home-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Start the Server**
   ```bash
   npm start
   ```

5. **Access Dashboard**
   Open your browser to `http://localhost:3000`

6. **Create Your Account**
   - Click "Sign up" to create a new user account
   - Fill in username, email, and password (minimum 6 characters)
   - After successful registration, sign in with your credentials
   - Access your personalized dashboard

### Development Setup

For development with hot reloading:

```bash
# Terminal 1: Start backend with auto-restart
npm run dev

# Terminal 2: Start webpack with watch mode
npm run watch
```

## 🔐 Authentication System

### User Registration
- **Secure signup** with username, email, and password
- **Input validation** with client-side and server-side checks
- **Password requirements** (minimum 6 characters)
- **Unique constraints** on username and email
- **Automatic redirect** to login after successful registration

### User Login
- **Session-based authentication** with secure cookies
- **Credential validation** against hashed passwords
- **Automatic dashboard access** after successful login
- **Session persistence** across browser sessions
- **Secure logout** with complete session cleanup

### Security Features
- **Password hashing** with bcrypt and salt rounds
- **Session management** with HTTP-only cookies
- **Protected API endpoints** requiring authentication
- **User isolation** - complete separation of user data
- **Input sanitization** and validation on all endpoints

### Database Security
- **SQLite database** with proper schema design
- **Foreign key constraints** for data integrity
- **Prepared statements** to prevent SQL injection
- **User data isolation** with proper access controls
- **Automatic database creation** on first run

## 📋 Configuration Guide

### MQTT Broker Setup

#### Option 1: Quick Test Brokers
Navigate to **Settings** → **MQTT Connection** and choose from:
- **EMQX Public** (`broker.emqx.io:1883`)
- **Eclipse Mosquitto** (`test.mosquitto.org:1883`)
- **HiveMQ Public** (`broker.hivemq.com:1883`)

#### Option 2: AWS IoT Core
1. Upload your AWS IoT certificates:
   - CA Certificate (`ca-cert.pem`)
   - Client Certificate (`client-cert.pem`)
   - Private Key (`client-key.pem`)
2. Configure your AWS IoT endpoint
3. Enable TLS/SSL connection

#### Option 3: Custom Broker
Configure your own broker with:
- **Broker Address**: Your MQTT broker URL
- **Port**: 1883 (MQTT) or 8883 (MQTTS)
- **Credentials**: Username/password if required
- **TLS/SSL**: Enable for secure connections

### Device Configuration System

The system uses `src/config/devices.json` for device definitions:

```json
{
  "device_type": {
    "topic": "home/room/device",
    "name": "Device Display Name",
    "icon": "lucide-icon-name",
    "controllable": true,
    "example": { "Key": "Value" },
    "dataKeys": ["Key1", "Key2"],
    "controls": {
      "Key": {
        "type": "toggle|slider|select",
        "states": ["ON", "OFF"]
      }
    },
    "thresholds": {
      "Key": { "min": 0, "max": 100 }
    }
  }
}
```

## 🔐 Security & Privacy

### Connection Security
- **TLS/SSL encryption** for all MQTT connections
- **Certificate-based authentication** for AWS IoT Core
- **Secure WebSocket** connections for real-time updates
- **Input validation** and sanitization on all endpoints
- **Session-based authentication** with secure cookies

### Data Protection
- **Local storage only** - no cloud data transmission
- **Encrypted password storage** with bcrypt hashing
- **User data isolation** - complete separation between users
- **Certificate encryption** for uploaded files
- **Session-based authentication** for WebSocket connections
- **Database integrity** with foreign key constraints

### Privacy Features
- **Local device discovery** without external services
- **Offline-capable** dashboard functionality
- **No tracking or analytics** by default
- **Open source** for full transparency
- **Per-user data isolation** ensuring privacy between accounts

## 🤝 MQTT Integration Guide

### Topic Structure Convention
```
home/{room}/{device_type}/{device_id}
```

**Examples:**
- `home/livingroom/temperature/sensor1`
- `home/kitchen/motion/detector1`
- `home/bedroom/door/main`

### Message Format Standards
All MQTT messages must be valid JSON:

```json
{
  "Temp": 23.5,
  "Humidity": 60,
  "Battery": 95,
  "Timestamp": "2024-01-15T10:30:00Z"
}
```

### Control Topic Separation
The system uses a clean separation between incoming and outgoing topics:

- **Incoming Data**: `home/livingroom/relay`
- **Outgoing Control**: `home/livingroom/relay_send`

This prevents command feedback loops and unwanted device creation.

### Auto-Detection Logic
Devices are automatically detected when:
1. **Topic patterns** match known device types
2. **Message structure** contains expected data keys
3. **Recent activity** is detected on new topics
4. **Topic excludes** "_send" suffix (control topics)

## 📱 Responsive Design

The dashboard provides optimal experience across all devices:

| Device Type | Screen Size | Features |
|-------------|-------------|----------|
| **Desktop** | 1200px+ | Full drag-and-drop, all widgets, sidebar navigation |
| **Tablet** | 768-1199px | Touch-optimized controls, collapsible sidebar |
| **Mobile** | <768px | Simplified layout, bottom navigation, swipe gestures |

**Theme Support:**
- **Auto-detection** based on system preferences
- **Manual toggle** with persistent storage per user
- **Consistent styling** across all components
- **High contrast** mode support

## 🛠️ Development Guide

### Project Structure
```
smart-home-dashboard/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── devices/        # Device-specific components
│   │   ├── layout/         # Layout components
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React Context providers
│   ├── config/            # Configuration files
│   │   ├── database.js    # Database configuration
│   │   ├── devices.json   # Device definitions
│   │   └── message-formats.json
│   ├── routes/            # API routes
│   │   └── auth.js        # Authentication routes
│   ├── pages/             # Page components
│   └── styles/            # CSS styles
├── public/                # Static assets
├── uploads/               # File uploads
├── database.sqlite        # SQLite database (created automatically)
├── server.js              # Express server
└── package.json           # Dependencies
```

### Environment Variables
Create a `.env` file for production:
```env
SESSION_SECRET=your-super-secret-session-key
PORT=3000
NODE_ENV=production
```

### Database Management
- **Automatic setup**: Database and tables are created on first run
- **User management**: Built-in user registration and authentication
- **Data persistence**: All user settings and configurations are saved
- **Backup**: SQLite database file can be easily backed up

## 🚀 Deployment

### Production Deployment
1. **Set environment variables**:
   ```bash
   export SESSION_SECRET="your-secure-secret-key"
   export NODE_ENV="production"
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

3. **SSL Configuration** (recommended):
   - Use a reverse proxy (nginx, Apache) for SSL termination
   - Set `cookie.secure: true` in session configuration
   - Ensure HTTPS for all connections

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Check authentication status
- `GET /api/auth/dashboard-config` - Get user's dashboard config
- `POST /api/auth/dashboard-config` - Save user's dashboard config

### MQTT Endpoints (Protected)
- `POST /api/connect` - Connect to MQTT broker
- `POST /api/disconnect` - Disconnect from MQTT broker
- `POST /api/subscribe` - Subscribe to MQTT topic
- `POST /api/publish` - Publish MQTT message
- `GET /api/status` - Get connection status

### File Upload Endpoints (Protected)
- `POST /api/upload-certificate` - Upload standard certificates
- `POST /api/upload-aws-certificate` - Upload AWS IoT certificates
- `GET /api/certificates` - List uploaded certificates

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **MQTT.js** for robust MQTT client implementation
- **TailwindCSS** for beautiful, responsive styling
- **Lucide** for the comprehensive icon library
- **Socket.IO** for real-time communication
- **Express.js** for the robust backend framework

---

**Built with ❤️ for the IoT community**