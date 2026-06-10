# Gmail Service — CONTEXTO

## Qué hace esta carpeta

Esta carpeta contiene el servicio para interactuar con la **Gmail API** (`gmailService.js`). Su principal responsabilidad es consultar y formatear los correos electrónicos del usuario autenticado, asegurando una conexión fluida y optimizada mediante el uso del `tokenService`.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| [gmailService.js](./gmailService.js) | Lógica de consulta a la API de Gmail (listar mensajes, obtener detalles/cabeceras y formatearlos). |
| [CONTEXTO.md](./CONTEXTO.md) | Este archivo de documentación. |

## Lógica y Flujo Principal

El servicio expone la siguiente función principal:

1. **`getRecentEmails(userId)`**:
   - Invoca a `getValidToken(userId)` para garantizar que el `access_token` guardado en SQLite esté activo y vigente.
   - Crea una instancia cliente de la API de Gmail (`google.gmail`) inyectando el token válido.
   - Llama a `users.messages.list` sobre la cuenta del usuario (`userId: 'me'`) para recuperar los IDs y threadIDs de los últimos 10 correos.
   - Para agilizar el tiempo de respuesta, se procesan los correos en paralelo (`Promise.all`) realizando peticiones individuales con `users.messages.get`.
   - Se utiliza el formato `format: 'metadata'` pidiendo específicamente las cabeceras `'From'`, `'Subject'` y `'Date'` junto al `snippet` generado por Google. Esto reduce significativamente el tamaño del payload de red al no descargar el contenido completo (HTML/cuerpo largo) de cada correo.

## Dependencias

- **`googleapis`**: Utiliza el sdk oficial de Google para comunicarse con Gmail v1 API.
- **`token/tokenService`**: Utiliza `getValidToken` para gestionar la renovación reactiva de tokens antes de realizar las llamadas a la API.

## Conexión con el resto del proyecto

- **`backend/src/index.js`**: Monta la ruta HTTP `GET /api/emails` que invoca a `getRecentEmails` y devuelve los correos en formato JSON al cliente.
- **`backend/src/webhook/webhookRoutes.js` y `backend/src/gmail/gmailService.js` (Fase 6)**: Se integrarán más adelante para dar de alta la suscripción Push de Google (`watch`) sobre la bandeja de entrada del usuario y recibir las notificaciones en tiempo real.
