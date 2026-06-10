// backend/src/auth/authRoutes.js
// Rutas de autenticación OAuth 2.0 con Google
// GET /auth/google   → redirige al consentimiento de Google
// GET /auth/callback → recibe el code, intercambia por tokens, guarda en SQLite

const express = require('express');
const { google } = require('googleapis');
const { getDb, saveDb } = require('../database/db');

const router = express.Router();

/**
 * Crea un cliente OAuth2 de Google con las credenciales del .env
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ─── GET /auth/google ───────────────────────────────────────────────
// Genera la URL de consentimiento OAuth y redirige al usuario a Google
router.get('/google', (req, res) => {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Para obtener refresh_token
    prompt: 'consent',        // Forzar consentimiento (siempre entrega refresh_token)
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });

  console.log('[Auth] Redirigiendo a Google OAuth...');
  res.redirect(authUrl);
});

// ─── GET /auth/callback ─────────────────────────────────────────────
// Google redirige aquí con ?code=XXX
// Intercambia el code por tokens, guarda usuario y tokens en SQLite
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta el parámetro code' });
  }

  try {
    const oauth2Client = createOAuth2Client();

    // 1. Intercambiar authorization code por tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('[Auth] Tokens recibidos de Google');
    console.log('[Auth] refresh_token presente:', !!tokens.refresh_token);

    // 2. Obtener información del usuario
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    console.log(`[Auth] Usuario: ${userInfo.email}`);

    const db = getDb();

    // 3. Insertar o actualizar usuario
    db.run(
      `INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)
       ON CONFLICT(google_id) DO UPDATE SET email = excluded.email, name = excluded.name`,
      [userInfo.id, userInfo.email, userInfo.name]
    );

    // Obtener el ID del usuario
    const userResult = db.exec('SELECT id FROM users WHERE google_id = ?', [userInfo.id]);
    const userId = userResult[0].values[0][0];

    // 4. Calcular expires_at
    const expiresAt = new Date(Date.now() + (tokens.expiry_date - Date.now())).toISOString();

    // 5. Insertar o actualizar tokens
    // Verificar si ya existen tokens para este usuario
    const existingTokens = db.exec('SELECT id FROM tokens WHERE user_id = ?', [userId]);

    if (existingTokens.length > 0 && existingTokens[0].values.length > 0) {
      // Actualizar tokens existentes
      db.run(
        `UPDATE tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?`,
        [tokens.access_token, tokens.refresh_token, expiresAt, userId]
      );
    } else {
      // Insertar nuevos tokens
      db.run(
        `INSERT INTO tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)`,
        [userId, tokens.access_token, tokens.refresh_token, expiresAt]
      );
    }

    // 6. Guardar BD a disco
    saveDb();

    // 7. Crear sesión
    req.session.userId = userId;
    req.session.email = userInfo.email;

    console.log(`[Auth] Login exitoso — userId: ${userId}, email: ${userInfo.email}`);

    // Registrar el watch (notificaciones push) en Gmail (Fase 6)
    try {
      const { setupWatch } = require('../gmail/gmailService');
      await setupWatch(userId);
    } catch (watchError) {
      console.error('[Auth] Error registrando watch de Gmail:', watchError.message);
      // No bloqueamos la redirección ni el inicio de sesión
    }

    // 8. Redirigir al frontend
    res.redirect('http://localhost:5173');

  } catch (error) {
    console.error('[Auth] Error en callback:', error.message);
    res.status(500).json({ error: 'Error en autenticación', details: error.message });
  }
});

// ─── GET /auth/status ───────────────────────────────────────────────
// Verifica si el usuario tiene sesión activa
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      email: req.session.email,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ─── GET /auth/logout ───────────────────────────────────────────────
// Destruye la sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ status: 'ok', message: 'Sesión cerrada' });
  });
});

module.exports = router;
