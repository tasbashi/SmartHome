const express = require('express');
const session = require('express-session');
const mqtt = require('mqtt');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const authRoutes = require('./src/routes/auth');
const database = require('./src/config/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sessionId'
}));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Authentication routes
app.use('/api/auth', authRoutes);

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Multer configuration for certificate uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/certificates';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept certificate files
    if (file.mimetype.includes('application/x-x509-ca-cert') || 
        file.originalname.match(/\.(crt|cer|pem|key)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece sertifika dosyaları (.crt, .cer, .pem, .key) kabul edilir!'));
    }
  }
});

// Global MQTT client variable
let mqttClient = null;
let connectionStatus = {
  connected: false,
  brokerAddress: '',
  port: '',
  lastConnected: null,
  error: null
};

// Socket.IO connection
io.on('connection', (socket) => {
  // Send current connection status
  socket.emit('connectionStatus', connectionStatus);
  
  // Handle subscription requests from React app
  socket.on('subscribe', (data) => {
    const { topic, qos } = data;
    
    if (!mqttClient || !connectionStatus.connected) {
      socket.emit('subscriptionError', 'Not connected to broker');
      return;
    }

    if (!topic) {
      socket.emit('subscriptionError', 'Topic is required');
      return;
    }

    const subscribeOptions = {
      qos: qos ? parseInt(qos) : 0
    };

    mqttClient.subscribe(topic, subscribeOptions, (error) => {
      if (error) {
        socket.emit('subscriptionError', `Subscription error: ${error.message}`);
      } else {
        socket.emit('subscriptionConfirmed', topic);
      }
    });
  });

  // Handle unsubscription requests
  socket.on('unsubscribe', (data) => {
    const { topic } = data;
    
    if (!mqttClient || !connectionStatus.connected) {
      socket.emit('subscriptionError', 'Not connected to broker');
      return;
    }

    if (!topic) {
      socket.emit('subscriptionError', 'Topic is required');
      return;
    }

    mqttClient.unsubscribe(topic, (error) => {
      if (error) {
        socket.emit('subscriptionError', `Unsubscription error: ${error.message}`);
      }
    });
  });

  // Handle publish requests from React app
  socket.on('publish', (data) => {
    const { topic, message, qos, retain } = data;
    
    if (!mqttClient || !connectionStatus.connected) {
      socket.emit('publishError', 'Not connected to broker');
      return;
    }

    if (!topic || message === undefined) {
      socket.emit('publishError', 'Topic and message are required');
      return;
    }

    const publishOptions = {
      qos: qos ? parseInt(qos) : 0,
      retain: retain === true
    };

    const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);

    mqttClient.publish(topic, messageToSend, publishOptions, (error) => {
      if (error) {
        socket.emit('publishError', `Publish error: ${error.message}`);
      }
    });
  });
  
  socket.on('disconnect', () => {
    // Connection closed
  });
});

// Upload certificate endpoint
app.post('/api/upload-certificate', requireAuth, upload.single('certificate'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Sertifika dosyası seçilmedi' });
    }
    
    res.json({ 
      success: true, 
      message: 'Sertifika başarıyla yüklendi',
      filename: req.file.filename,
      path: req.file.path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AWS certificate upload configuration
const awsUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = 'uploads/aws-certificates';
      fs.ensureDirSync(uploadDir);
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const certType = req.body.certType;
      let filename;
      switch(certType) {
        case 'ca':
          filename = 'ca-cert.pem';
          break;
        case 'client':
          filename = 'client-cert.pem';
          break;
        case 'key':
          filename = 'client-key.pem';
          break;
        default:
          filename = file.originalname;
      }
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(pem|crt|key)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece .pem, .crt, .key dosyaları kabul edilir!'));
    }
  }
});

// Upload AWS certificate endpoint
app.post('/api/upload-aws-certificate', requireAuth, awsUpload.single('awsCertificate'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'AWS sertifika dosyası seçilmedi' });
    }
    
    const { certType } = req.body;
    if (!['ca', 'client', 'key'].includes(certType)) {
      return res.status(400).json({ error: 'Geçersiz sertifika tipi' });
    }
    
    res.json({ 
      success: true, 
      message: `AWS ${certType} sertifikası başarıyla yüklendi`,
      filename: req.file.filename,
      path: req.file.path,
      certType: certType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get uploaded certificates
app.get('/api/certificates', requireAuth, async (req, res) => {
  try {
    const uploadDir = 'uploads/certificates';
    await fs.ensureDir(uploadDir);
    const files = await fs.readdir(uploadDir);
    res.json({ certificates: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connect to MQTT broker
app.post('/api/connect', requireAuth, async (req, res) => {
  try {
    const { brokerAddress, port, useTLS, certificateFile, username, password, cleanSession, useAwsCerts } = req.body;
    
    if (!brokerAddress || !port) {
      return res.status(400).json({ error: 'Broker adresi ve port gerekli' });
    }

    // Disconnect existing connection
    if (mqttClient) {
      mqttClient.end();
    }

    let options = {
      port: parseInt(port),
      protocol: useTLS ? 'mqtts' : 'mqtt',
      rejectUnauthorized: false, // For self-signed certificates
      clean: cleanSession !== false, // Default to true if not specified
    };

    // Add username/password if provided
    if (username) {
      options.username = username;
    }
    if (password) {
      options.password = password;
    }

    // Handle AWS IoT certificates
    if (useAwsCerts && useTLS) {
      try {
        const awsCertDir = 'uploads/aws-certificates';
        const caCertPath = path.join(awsCertDir, 'ca-cert.pem');
        const clientCertPath = path.join(awsCertDir, 'client-cert.pem');
        const clientKeyPath = path.join(awsCertDir, 'client-key.pem');

        // Check if all AWS certificates exist
        if (await fs.pathExists(caCertPath) && 
            await fs.pathExists(clientCertPath) && 
            await fs.pathExists(clientKeyPath)) {
          
          const caCert = await fs.readFile(caCertPath);
          const clientCert = await fs.readFile(clientCertPath);
          const clientKey = await fs.readFile(clientKeyPath);

          options.ca = [caCert];
          options.cert = clientCert;
          options.key = clientKey;
          options.rejectUnauthorized = true;
          options.servername = brokerAddress; // SNI support for AWS IoT
          
          console.log('AWS IoT sertifikaları kullanılıyor');
        } else {
          return res.status(400).json({ error: 'AWS sertifikaları eksik (ca-cert.pem, client-cert.pem, client-key.pem gerekli)' });
        }
      } catch (error) {
        return res.status(500).json({ error: `AWS sertifika okuma hatası: ${error.message}` });
      }
    }
    // Standard certificate handling
    else if (useTLS && certificateFile) {
      const certPath = path.join('uploads/certificates', certificateFile);
      if (await fs.pathExists(certPath)) {
        const cert = await fs.readFile(certPath);
        options.ca = [cert];
        options.rejectUnauthorized = true;
      }
    }

    console.log('Bağlantı denenecek:', brokerAddress, port, options.protocol);

    mqttClient = mqtt.connect(`${options.protocol}://${brokerAddress}`, options);

    mqttClient.on('connect', () => {
      console.log('MQTT Broker\'a bağlandı');
      connectionStatus = {
        connected: true,
        brokerAddress,
        port,
        lastConnected: new Date().toISOString(),
        error: null
      };
      io.emit('connectionStatus', connectionStatus);
      if (!res.headersSent) {
        res.json({ success: true, message: 'Broker\'a başarıyla bağlandı' });
      }
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT Bağlantı hatası:', error);
      connectionStatus = {
        connected: false,
        brokerAddress,
        port,
        lastConnected: null,
        error: error.message
      };
      io.emit('connectionStatus', connectionStatus);
      if (!res.headersSent) {
        res.status(500).json({ error: `Bağlantı hatası: ${error.message}` });
      }
    });

    mqttClient.on('close', () => {
      console.log('MQTT bağlantısı kapandı');
      connectionStatus.connected = false;
      io.emit('connectionStatus', connectionStatus);
    });

    mqttClient.on('message', (topic, message, packet) => {
      const messageData = {
        topic,
        message: message.toString(),
        qos: packet.qos || 0,
        retain: packet.retain || false,
        timestamp: new Date().toISOString()
      };
      io.emit('mqttMessage', messageData);
    });

  } catch (error) {
    console.error('Bağlantı hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect from MQTT broker
app.post('/api/disconnect', requireAuth, (req, res) => {
  try {
    if (mqttClient) {
      mqttClient.end();
      mqttClient = null;
    }
    connectionStatus.connected = false;
    io.emit('connectionStatus', connectionStatus);
    res.json({ success: true, message: 'Bağlantı kesildi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to topic
app.post('/api/subscribe', requireAuth, (req, res) => {
  try {
    const { topic, qos } = req.body;
    
    if (!mqttClient || !connectionStatus.connected) {
      return res.status(400).json({ error: 'Broker\'a bağlı değil' });
    }

    if (!topic) {
      return res.status(400).json({ error: 'Topic gerekli' });
    }

    const subscribeOptions = {
      qos: qos ? parseInt(qos) : 0
    };

    mqttClient.subscribe(topic, subscribeOptions, (error) => {
      if (error) {
        res.status(500).json({ error: `Abone olma hatası: ${error.message}` });
      } else {
        res.json({ success: true, message: `${topic} topic'ine QoS ${subscribeOptions.qos} ile abone olundu` });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish message
app.post('/api/publish', requireAuth, (req, res) => {
  try {
    const { topic, message, qos, retain } = req.body;
    
    if (!mqttClient || !connectionStatus.connected) {
      return res.status(400).json({ error: 'Broker\'a bağlı değil' });
    }

    if (!topic || message === undefined) {
      return res.status(400).json({ error: 'Topic ve mesaj gerekli' });
    }

    const publishOptions = {
      qos: qos ? parseInt(qos) : 0,
      retain: retain === true
    };

    mqttClient.publish(topic, message, publishOptions, (error) => {
      if (error) {
        res.status(500).json({ error: `Mesaj gönderme hatası: ${error.message}` });
      } else {
        res.json({ 
          success: true, 
          message: `Mesaj başarıyla gönderildi (QoS: ${publishOptions.qos}, Retain: ${publishOptions.retain})` 
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status
app.get('/api/status', requireAuth, (req, res) => {
  res.json(connectionStatus);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
}); 