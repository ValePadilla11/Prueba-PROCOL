// backend/src/test-expire.js
// Script de utilidad para la Fase 3: simula la expiración de los tokens en SQLite
// Ejecútalo con: node src/test-expire.js

const { initDatabase, getDb, saveDb } = require('./database/db');

async function run() {
  try {
    console.log('[Test-Expire] Cargando base de datos...');
    await initDatabase();
    const db = getDb();

    // Modificar la fecha de expiración al pasado (1 de enero de 2020)
    db.run("UPDATE tokens SET expires_at = '2020-01-01T00:00:00.000Z'");
    saveDb();

    console.log('[Test-Expire] ✅ Campo expires_at actualizado al pasado (2020-01-01) para todos los registros.');
    console.log('[Test-Expire] Ahora puedes visitar http://localhost:3000/api/test-token y verificar que el token se renueva en la consola.');
    process.exit(0);
  } catch (error) {
    console.error('[Test-Expire] ❌ Error:', error);
    process.exit(1);
  }
}

run();
