// backend/src/sse/sseManager.js
// Gestor de conexiones SSE (Server-Sent Events)
// Mantiene registro de los clientes conectados y permite el envío de mensajes en tiempo real

let clients = [];

/**
 * Registra una nueva conexión SSE (Server-Sent Events)
 * @param {express.Request} req - Objeto de petición Express
 * @param {express.Response} res - Objeto de respuesta Express
 */
function registerClient(req, res) {
  const userId = req.session ? req.session.userId : null;

  // Cabeceras obligatorias para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Mantener la conexión activa enviando un comentario de ok (keep-alive inicial)
  res.write(': ok\n\n');

  const clientId = Date.now();
  const newClient = {
    id: clientId,
    userId: userId,
    res: res,
  };

  clients.push(newClient);
  console.log(`[SSE] Cliente conectado. ID: ${clientId}, userId: ${userId || 'Invitado'} — Total clientes: ${clients.length}`);

  // Limpiar la conexión cuando el cliente se desconecta
  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
    console.log(`[SSE] Cliente desconectado. ID: ${clientId} — Total clientes: ${clients.length}`);
  });
}

/**
 * Envía un mensaje en formato SSE a TODOS los clientes conectados
 * @param {string} event - Nombre del evento (ej. 'new_email')
 * @param {object} data - Datos del evento (se serializan a JSON)
 */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    client.res.write(payload);
  });
  console.log(`[SSE] Broadcast enviado a ${clients.length} clientes. Evento: ${event}`);
}

/**
 * Envía un mensaje en formato SSE a un usuario específico
 * @param {number} userId - ID del usuario en la base de datos
 * @param {string} event - Nombre del evento (ej. 'new_email')
 * @param {object} data - Datos del evento (se serializan a JSON)
 */
function sendToUser(userId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const targetClients = clients.filter(client => client.userId === userId);
  targetClients.forEach((client) => {
    client.res.write(payload);
  });
  console.log(`[SSE] Mensaje enviado a ${targetClients.length} cliente(s) del userId: ${userId}. Evento: ${event}`);
}

module.exports = { registerClient, broadcast, sendToUser };
