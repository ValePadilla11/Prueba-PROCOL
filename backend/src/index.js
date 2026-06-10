// backend/src/index.js
// Entry point del backend — servidor Express
// Fase 3: agrega cron job de renovación automática y endpoint de prueba de tokens

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cron = require('node-cron');
const { initDatabase } = require('./database/db');
const { runMigrations } = require('./database/migrations');
const authRoutes = require('./auth/authRoutes');
const { refreshExpiringTokens } = require('./token/tokenService');
const { getRecentEmails } = require('./gmail/gmailService');
const { registerClient } = require('./sse/sseManager');

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

// Ruta GET /api/emails — Obtiene los correos recientes de Gmail (Fase 4)
app.get('/api/emails', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No autorizado. Inicie sesión primero en /auth/google' });
  }

  try {
    const emails = await getRecentEmails(req.session.userId);
    res.json({ status: 'ok', emails });
  } catch (error) {
    console.error('[API] Error al obtener correos:', error.message);
    res.status(500).json({ error: 'Error al obtener correos', details: error.message });
  }
});

// Canal SSE para recibir notificaciones en tiempo real (Fase 5)
app.get('/events', registerClient);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PROCOL Gmail Reader — Backend activo' });
});

// Programar cron job de renovación preventiva (cada 30 minutos)
cron.schedule('*/30 * * * *', async () => {
  console.log('[Cron] Iniciando renovación preventiva de tokens...');
  try {
    await refreshExpiringTokens();
  } catch (error) {
    console.error('[Cron] Error en la renovación preventiva:', error.message);
  }
});

// Inicio asíncrono: inicializar BD → migraciones → levantar servidor
async function start() {
  try {
    await initDatabase();
    runMigrations();

    app.listen(PORT, () => {
      console.log(`[Server] Backend corriendo en http://localhost:${PORT}`);
      console.log('[Cron] Job de renovación preventiva registrado (cada 30 minutos)');
    });
  } catch (error) {
    console.error('[Server] Error al iniciar:', error);
    process.exit(1);
  }
}

start();

