# Webhook & Pub/Sub — CONTEXTO

## Qué hace esta carpeta

Esta carpeta gestiona el endpoint del **Webhook** (`webhookRoutes.js`) que recibe notificaciones push en tiempo real desde **Google Cloud Pub/Sub**. Su responsabilidad principal es recibir el evento de cambio en la bandeja de entrada, decodificar el payload, registrar el evento en la base de datos SQLite y emitirlo al instante a los clientes conectados a través de Server-Sent Events (SSE).

## Archivos

| Archivo | Responsabilidad |
|---|---|
| [webhookRoutes.js](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/webhook/webhookRoutes.js) | Ruta `POST /webhook/gmail` que procesa los mensajes entrantes de Pub/Sub, registra las notificaciones y dispara las alertas SSE. |
| [CONTEXTO.md](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/webhook/CONTEXTO.md) | Este archivo de documentación. |

## El Ciclo de Notificación (Push Notification Flow)

El flujo de notificaciones en tiempo real funciona bajo la siguiente secuencia de eventos:

```
[Gmail Inbox] ──(Cambio en buzón)──> [Google Cloud Pub/Sub]
                                             │
                                   (Push Subscription)
                                             │
                                             ▼
                                  [ngrok HTTPS Tunnel]
                                             │
                                             ▼
                                    [POST /webhook/gmail]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          (Guardar en SQLite: 'notifications')          (Broadcast vía SSE: 'new_email')
                                                                   │
                                                                   ▼
                                                          [Frontend React App]
```

## Estructura del Mensaje de Pub/Sub

Google Cloud Pub/Sub envía peticiones `POST` al webhook con un cuerpo JSON estructurado. El campo `message.data` contiene la información del evento codificada en **Base64**:

```json
{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiJjbXg2NTI2QGdtYWlsLmNvbSIsImhpc3RvcnlJZCI6MTIzNDU2fQ==",
    "messageId": "123456789",
    "publishTime": "2026-06-10T02:00:00Z"
  },
  "subscription": "projects/procol-gmail-reader-498923/subscriptions/gmail-notifications-sub"
}
```

Al decodificar `message.data` de Base64, obtenemos un objeto JSON con los datos del evento de Gmail:
```json
{
  "emailAddress": "usuario@gmail.com",
  "historyId": 123456
}
```

## Configuración del Entorno (Requisitos)

Para que el flujo funcione correctamente, se requiere:

1. **Google Cloud Console**:
   - Haber habilitado la **Gmail API**.
   - Crear un **Pub/Sub Topic** (por ejemplo: `gmail-notifications`).
   - Otorgar permisos de publicación a Gmail en dicho tema agregando la cuenta de servicio oficial de Gmail: `gmail-api-push@system.gserviceaccount.com` con el rol **Pub/Sub Publisher**.
   - Crear una **Suscripción Push** asociada a ese tema, apuntando a la URL pública expuesta por tu túnel de ngrok: `https://<tu-subdominio-ngrok>.ngrok-free.dev/webhook/gmail`.

2. **Variables de entorno (`.env`)**:
   - `PUBSUB_TOPIC`: Debe contener el ID completo del tema (ej. `projects/procol-gmail-reader-498923/topics/gmail-notifications`).

## Dependencias

- **`database/db`**: Utiliza `reloadDb`, `getDb` y `saveDb` para persistir la notificación en la tabla `notifications` en SQLite.
- **`sse/sseManager`**: Utiliza `broadcast` para emitir el evento `new_email` de forma instantánea a los navegadores que tengan abierto el canal de SSE.
