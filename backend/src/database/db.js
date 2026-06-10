// backend/src/database/db.js
// Conexión a SQLite usando sql.js (puro JavaScript, sin compilación nativa)
// La BD se carga en memoria desde archivo y se guarda a disco tras cada escritura

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'database.sqlite');

let db = null;

/**
 * Inicializa sql.js y carga (o crea) la base de datos.
 * Debe llamarse una vez al arrancar el servidor.
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log(`[DB] SQLite cargado desde: ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(`[DB] SQLite creado (nuevo) en: ${DB_PATH}`);
  }

  // Habilitar foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/**
 * Retorna la instancia de la base de datos.
 * Lanza error si no fue inicializada.
 */
function getDb() {
  if (!db) {
    throw new Error('[DB] Base de datos no inicializada. Llama a initDatabase() primero.');
  }
  return db;
}

/**
 * Guarda la base de datos en disco.
 * Llamar después de operaciones de escritura (INSERT, UPDATE, DELETE).
 */
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

module.exports = { initDatabase, getDb, saveDb };
