const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, '../../database.sqlite');
    this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA synchronous = NORMAL');
        this.db.run('PRAGMA cache_size = 1000');
        this.createTables();
      }
    });
  }

  createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUserSettingsTable = `
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, setting_key)
      )
    `;

    this.db.run(createUsersTable);
    this.db.run(createUserSettingsTable);
  }

  // User management methods
  async createUser(username, email, password) {
    return new Promise((resolve, reject) => {
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        this.db.run(sql, [username, email, hash], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, username, email });
          }
        });
      });
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async verifyPassword(password, hash) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hash, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Dashboard configuration methods (using user_settings table)
  async saveDashboardConfig(userId, configData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      this.db.run(sql, [userId, 'dashboard_layout', JSON.stringify(configData)], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  async getDashboardConfig(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?';
      this.db.get(sql, [userId, 'dashboard_layout'], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? JSON.parse(row.setting_value) : null);
        }
      });
    });
  }

  // User settings methods
  async saveUserSetting(userId, key, value) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      this.db.run(sql, [userId, key, value], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  async getUserSetting(userId, key) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?';
      this.db.get(sql, [userId, key], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.setting_value : null);
        }
      });
    });
  }

  async getAllUserSettings(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?';
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const settings = {};
          rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
          });
          resolve(settings);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();