// backend/src/database/migrations.js
// Crea las tablas necesarias si no existen
// Se ejecuta al arrancar el servidor (después de initDatabase)

const { getDb, saveDb } = require('./db');

function runMigrations() {
  const db = getDb();

  console.log('[DB] Ejecutando migraciones...');

  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE,
      email TEXT,
      name TEXT
    )
  `);

  // Tabla de tokens OAuth
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      access_token TEXT,
      refresh_token TEXT,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Tabla de notificaciones (webhooks Pub/Sub)
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      history_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Guardar a disco después de crear las tablas
  saveDb();

  console.log('[DB] Migraciones completadas — tablas: users, tokens, notifications');
}

module.exports = { runMigrations };
