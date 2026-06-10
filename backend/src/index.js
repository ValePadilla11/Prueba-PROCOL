// backend/src/index.js
// Entry point del backend — servidor Express base
// Fase 1: carga .env, inicializa BD, ejecuta migraciones y levanta health check

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware base
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PROCOL Gmail Reader — Backend activo' });
});

// Inicio asíncrono: inicializar BD → migraciones → levantar servidor
async function start() {
  try {
    await initDatabase();
    runMigrations();

    app.listen(PORT, () => {
      console.log(`[Server] Backend corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Error al iniciar:', error);
    process.exit(1);
  }
}

start();
