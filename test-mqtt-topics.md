# MQTT Topic Testing Guide

## Overview
This system now properly separates incoming sensor data topics from outgoing control command topics using the "_send" suffix.

## How It Works

### 1. Incoming Sensor Data Topics
- Devices publish sensor data to topics like: `home/livingroom/temperature`
- These topics are used for receiving data from sensors
- The system automatically creates devices when it detects messages on these topics
- Example: `home/livingroom/temperature` receives `{"Temp": 25, "Humidity": 65}`

### 2. Outgoing Control Command Topics
- The UI publishes control commands to topics with "_send" suffix
- These topics are used for sending commands to devices
- The system automatically adds "_send" to the base topic when publishing
- Example: `home/livingroom/relay_send` receives `{"Relay": "ON"}`

### 3. Automatic Topic Handling
- When you click a button on the Dashboard, the system:
  1. Takes the device's base topic (e.g., `home/livingroom/relay`)
  2. Automatically adds "_send" suffix (e.g., `home/livingroom/relay_send`)
  3. Publishes the control message to the "_send" topic
  4. Does NOT create a new device (ignores "_send" topics for device creation)

## Testing Examples

### Test 1: Relay Control
1. Add a relay device with topic: `home/livingroom/relay`
2. Click the relay toggle button on Dashboard
3. System publishes to: `home/livingroom/relay_send`
4. No new device is created

### Test 2: Temperature Sensor
1. Temperature sensor publishes to: `home/livingroom/temperature`
2. System receives data and updates device
3. No "_send" topic is involved (sensor only sends data)

### Test 3: Thermostat Control
1. Thermostat device with topic: `home/livingroom/thermostat`
2. Set target temperature on Dashboard
3. System publishes to: `home/livingroom/thermostat_send`
4. No new device is created

## Message Format Examples

### Temperature Sensor (Incoming)
```json
{
  "topic": "home/livingroom/temperature",
  "message": {
    "Temp": 25,
    "Humidity": 65
  }
}
```

### Relay Control (Outgoing)
```json
{
  "topic": "home/livingroom/relay_send",
  "message": {
    "Relay": "ON"
  }
}
```

### Thermostat Control (Outgoing)
```json
{
  "topic": "home/livingroom/thermostat_send",
  "message": {
    "TargetTemp": 24,
    "Mode": "Heat"
  }
}
```

## Key Benefits

1. **Clean Separation**: Incoming and outgoing topics are clearly separated
2. **No Device Creation**: "_send" topics don't create unwanted devices
3. **Automatic Handling**: UI automatically handles the "_send" suffix
4. **Backward Compatible**: Existing devices continue to work
5. **Clear Documentation**: Message formats include both topics

## Implementation Details

- **MqttContext.js**: Automatically adds "_send" suffix when publishing
- **DeviceContext.js**: Ignores "_send" topics for device creation and updates
- **Message Formats**: Include both `topic` and `send_topic` fields
- **Dashboard**: Buttons automatically use the correct "_send" topics 