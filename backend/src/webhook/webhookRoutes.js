// backend/src/webhook/webhookRoutes.js
// Rutas del Webhook — recibe notificaciones de Google Cloud Pub/Sub
// Decodifica el mensaje, lo guarda en SQLite y lo transmite por SSE

const express = require('express');
const { getDb, saveDb, reloadDb } = require('../database/db');
const { broadcast } = require('../sse/sseManager');

const router = express.Router();

/**
 * POST /webhook/gmail
 * Endpoint público que recibe las notificaciones push de Pub/Sub
 */
router.post('/gmail', async (req, res) => {
  console.log('[Webhook] Notificación recibida de Pub/Sub...');

  const { message } = req.body;
  if (!message || !message.data) {
    console.warn('[Webhook] Petición inválida: falta message o message.data');
    return res.status(400).json({ error: 'Formato de mensaje inválido' });
  }

  try {
    // 1. Decodificar la data codificada en base64 por Pub/Sub
    const decodedString = Buffer.from(message.data, 'base64').toString('utf-8');
    const data = JSON.parse(decodedString);

    console.log(`[Webhook] Mensaje decodificado — email: ${data.emailAddress}, historyId: ${data.historyId}`);

    // Sincronizar la base de datos local en memoria con los cambios del disco
    reloadDb();
    const db = getDb();

    // 2. Buscar al usuario en la BD por su correo electrónico
    const userResult = db.exec('SELECT id FROM users WHERE email = ?', [data.emailAddress]);
    let userId = null;

    if (userResult.length && userResult[0].values.length) {
      userId = userResult[0].values[0][0];
    } else {
      console.warn(`[Webhook] No se encontró usuario en SQLite para el correo: ${data.emailAddress}`);
    }

    // 3. Si el usuario existe, registrar la notificación en SQLite
    if (userId) {
      const createdAt = new Date().toISOString();
      db.run(
        'INSERT INTO notifications (user_id, history_id, created_at) VALUES (?, ?, ?)',
        [userId, String(data.historyId), createdAt]
      );
      saveDb();
      console.log(`[Webhook] Notificación registrada para userId: ${userId} (historyId: ${data.historyId})`);
    }

    // 4. Emitir el evento en tiempo real vía Server-Sent Events (SSE)
    broadcast('new_email', {
      userId,
      emailAddress: data.emailAddress,
      historyId: data.historyId,
    });

    // 5. Google Pub/Sub requiere que respondamos con un status 200 OK para dar el mensaje por entregado
    res.sendStatus(200);

  } catch (error) {
    console.error('[Webhook] Error crítico al procesar notificación:', error.message);
    // Respondemos con 500 para que Pub/Sub reintente más tarde si fue un fallo temporal de base de datos
    res.status(500).json({ error: 'Error interno en el servidor', details: error.message });
  }
});

module.exports = router;
