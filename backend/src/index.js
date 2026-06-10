// backend/src/index.js
// Entry point del backend — servidor Express
// Fase 2: agrega express-session y rutas de autenticación OAuth 2.0

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { initDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');
const authRoutes = require('./auth/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware base
app.use(cors({
  origin: 'http://localhost:5173', // Frontend Vite
  credentials: true,               // Permitir cookies de sesión
}));
app.use(express.json());

// Configuración de sesiones (cookie HttpOnly)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,   // No accesible desde JavaScript del navegador
    secure: false,    // false en desarrollo (no HTTPS)
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
}));

// Rutas de autenticación
app.use('/auth', authRoutes);

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
