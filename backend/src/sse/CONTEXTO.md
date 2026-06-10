# SSE (Server-Sent Events) — CONTEXTO

## Qué hace esta carpeta

Esta carpeta contiene el administrador de **Server-Sent Events** (`sseManager.js`). Su responsabilidad principal es gestionar las conexiones de red en tiempo real y persistentes con los clientes web (el navegador), permitiendo al backend enviar notificaciones de forma unidireccional y eficiente, sin necesidad de recurrir a polling de red.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| [sseManager.js](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/sse/sseManager.js) | Lógica de registro de sockets HTTP, control de desconexión y funciones para emitir mensajes (`broadcast` y `sendToUser`). |
| [CONTEXTO.md](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/sse/CONTEXTO.md) | Este archivo de documentación. |

## Lógica y Flujo Principal

1. **Establecimiento de Conexión (`GET /events`)**:
   - Cuando un cliente web abre una conexión a `/events`, el backend responde con cabeceras específicas que indican que es un flujo continuo de datos (`text/event-stream`), deshabilitando el almacenamiento en caché (`Cache-Control: no-cache`) e indicando mantener el canal abierto (`Connection: keep-alive`).
   - El socket HTTP de respuesta (`res`) se guarda en memoria dentro de un array de clientes activos (`clients`).
   - Se envía un comentario inicial `: ok\n\n` para evitar que intermediarios de red o proxies (como ngrok, Cloudflare o balanceadores) cierren la conexión por inactividad.

2. **Control de Desconexión**:
   - Escuchamos el evento `close` del socket de petición (`req.on('close')`).
   - Al desconectarse el cliente, se remueve inmediatamente su respuesta de la lista de clientes activos, liberando los recursos del servidor.

3. **Envío de Mensajes**:
   - Los datos se envían formateados bajo la especificación SSE:
     ```text
     event: nombre_evento
     data: {"propiedad": "valor"}
     
     ```
     *(Es indispensable el doble salto de línea `\n\n` al final para que el navegador procese el evento).*
   - **`broadcast(event, data)`**: Emite el evento a todos los navegadores conectados.
   - **`sendToUser(userId, event, data)`**: Filtra la lista de sockets activos y solo envía el mensaje a aquellos cuya sesión pertenezca al `userId` especificado.

## Dependencias

- **Express/Node.js (nativo)**: No requiere paquetes externos; SSE utiliza las APIs estándar de streaming HTTP de Node.js, lo que lo hace sumamente liviano y robusto.

## Conexión con el resto del proyecto

- **`backend/src/index.js`**: Monta la ruta HTTP `GET /events` para conectar con `registerClient`.
- **`backend/src/webhook/webhookRoutes.js` (Fase 6)**: Invocará a `sseManager.broadcast('new_email', { ... })` al recibir una notificación push de Google Cloud Pub/Sub, lo que avisará al frontend al instante de la llegada del nuevo correo.
- **Frontend React (Fase 7)**: Se conectará al canal mediante `new EventSource('/events')` y escuchará los eventos entrantes.
