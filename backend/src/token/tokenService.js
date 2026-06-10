// backend/src/token/tokenService.js
// Servicio de tokens — gestiona la validez y renovación automática del access_token
// Exporta getValidToken(userId) que siempre devuelve un token válido

const { google } = require('googleapis');
const { getDb, saveDb, reloadDb } = require('../database/db');

/**
 * Crea un cliente OAuth2 de Google
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Renueva el access_token usando el refresh_token almacenado.
 * Actualiza la BD con el nuevo token y su fecha de expiración.
 * @param {number} userId - ID del usuario en la tabla users
 * @returns {string} El nuevo access_token
 */
async function refreshAccessToken(userId) {
  reloadDb();
  const db = getDb();

  // Leer el refresh_token actual
  const result = db.exec('SELECT refresh_token FROM tokens WHERE user_id = ?', [userId]);

  if (!result.length || !result[0].values.length) {
    throw new Error(`[Token] No se encontraron tokens para userId: ${userId}`);
  }

  const refreshToken = result[0].values[0][0];

  if (!refreshToken) {
    throw new Error(`[Token] refresh_token es null para userId: ${userId}. El usuario debe re-autenticarse.`);
  }

  // Usar refresh_token para obtener nuevo access_token
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  // Calcular nueva fecha de expiración
  const expiresAt = new Date(credentials.expiry_date).toISOString();

  // Actualizar en SQLite
  db.run(
    'UPDATE tokens SET access_token = ?, expires_at = ? WHERE user_id = ?',
    [credentials.access_token, expiresAt, userId]
  );

  saveDb();

  console.log(`[Token] Token renovado para userId: ${userId} — expira: ${expiresAt}`);

  return credentials.access_token;
}

/**
 * Devuelve siempre un access_token válido para el usuario.
 * Si el token está a menos de 5 minutos de expirar, lo renueva automáticamente.
 * @param {number} userId - ID del usuario en la tabla users
 * @returns {string} Un access_token válido
 */
async function getValidToken(userId) {
  reloadDb();
  const db = getDb();

  // Leer tokens del usuario
  const result = db.exec(
    'SELECT access_token, expires_at FROM tokens WHERE user_id = ?',
    [userId]
  );

  if (!result.length || !result[0].values.length) {
    throw new Error(`[Token] No hay tokens para userId: ${userId}`);
  }

  const accessToken = result[0].values[0][0];
  const expiresAt = result[0].values[0][1];

  // Verificar si el token expira en menos de 5 minutos
  const now = Date.now();
  const expiresTime = new Date(expiresAt).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresTime - now > fiveMinutes) {
    // Token todavía válido
    console.log(`[Token] Token válido para userId: ${userId} — expira en ${Math.round((expiresTime - now) / 60000)} min`);
    return accessToken;
  }

  // Token expirado o próximo a expirar → renovar
  console.log(`[Token] Token expirado/próximo a expirar para userId: ${userId} — renovando...`);
  return await refreshAccessToken(userId);
}

/**
 * Renovación preventiva: busca TODOS los tokens próximos a expirar
 * y los renueva anticipadamente. Diseñado para ser llamado por el cron job.
 */
async function refreshExpiringTokens() {
  reloadDb();
  const db = getDb();

  // Buscar tokens que expiran en menos de 10 minutos
  const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const result = db.exec(
    'SELECT user_id FROM tokens WHERE expires_at < ?',
    [tenMinutesFromNow]
  );

  if (!result.length || !result[0].values.length) {
    console.log('[Cron] No hay tokens próximos a expirar');
    return;
  }

  const userIds = result[0].values.map(row => row[0]);
  let renewed = 0;

  for (const userId of userIds) {
    try {
      await refreshAccessToken(userId);
      renewed++;
    } catch (error) {
      console.error(`[Cron] Error renovando token de userId ${userId}:`, error.message);
    }
  }

  console.log(`[Cron] ${renewed} token(s) renovado(s) preventivamente`);
}

module.exports = { getValidToken, refreshExpiringTokens };
