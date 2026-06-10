// backend/src/gmail/gmailService.js
// Servicio de Gmail — consume la API de Google Gmail v1
// Exporta getRecentEmails(userId) para listar los correos más recientes

const { google } = require('googleapis');
const { getValidToken } = require('../token/tokenService');

/**
 * Crea un cliente OAuth2 de Google con las credenciales del entorno
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Obtiene los últimos 10 correos de la cuenta del usuario.
 * @param {number} userId - ID del usuario en la base de datos
 * @returns {Promise<Array>} Array de objetos de correo formateados
 */
async function getRecentEmails(userId) {
  // 1. Obtener access_token válido (se renueva automáticamente si expiró)
  const accessToken = await getValidToken(userId);

  // 2. Configurar las credenciales en el cliente OAuth2
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  // 3. Crear cliente para la API de Gmail
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log(`[Gmail] Solicitando lista de correos para el usuario ${userId}...`);

  // 4. Listar los últimos 10 mensajes
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 10,
  });

  const messages = listResponse.data.messages || [];
  if (messages.length === 0) {
    console.log('[Gmail] No se encontraron correos.');
    return [];
  }

  console.log(`[Gmail] Obteniendo detalles de ${messages.length} correos...`);

  // 5. Consultar los detalles de cada correo
  // Usamos Promise.all para obtener los correos en paralelo y agilizar la respuesta
  const emailDetailsPromises = messages.map(async (msg) => {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata', // Formato optimizado para evitar descargar todo el cuerpo
        metadataHeaders: ['From', 'Subject', 'Date'], // Cabeceras que nos interesan
      });

      const headers = detail.data.payload.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

      return {
        id: msg.id,
        threadId: msg.threadId,
        from: fromHeader ? fromHeader.value : 'Desconocido',
        subject: subjectHeader ? subjectHeader.value : '(Sin asunto)',
        date: dateHeader ? dateHeader.value : '',
        snippet: detail.data.snippet || '',
      };
    } catch (error) {
      console.error(`[Gmail] Error al obtener detalles del correo ${msg.id}:`, error.message);
      return {
        id: msg.id,
        threadId: msg.threadId,
        from: 'Error',
        subject: '(Error al cargar correo)',
        date: '',
        snippet: error.message,
      };
    }
  });

  const emailDetails = await Promise.all(emailDetailsPromises);
  console.log(`[Gmail] ${emailDetails.length} correos cargados con éxito.`);

  return emailDetails;
}

/**
 * Registra el canal de notificaciones Push (watch) en Gmail para un usuario.
 * @param {number} userId - ID del usuario en la base de datos
 * @returns {Promise<object>} Datos del registro del watch (historyId, expiration)
 */
async function setupWatch(userId) {
  // 1. Obtener access_token válido
  const accessToken = await getValidToken(userId);

  // 2. Configurar las credenciales en el cliente OAuth2
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  // 3. Crear cliente para la API de Gmail
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log(`[Gmail] Registrando watch (notificaciones push) para el usuario ${userId}...`);

  // 4. Llamar a users.watch
  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: process.env.PUBSUB_TOPIC, // Tema de Cloud Pub/Sub
      labelIds: ['INBOX'], // Solo escuchar cambios en INBOX
    },
  });

  console.log(`[Gmail] Watch registrado con éxito para ${userId}. Respuesta:`, response.data);
  return response.data;
}

module.exports = { getRecentEmails, setupWatch };
