# Token Service — CONTEXTO

## Qué hace esta carpeta

Esta carpeta contiene el servicio de gestión de tokens OAuth 2.0 (`tokenService.js`). Su principal responsabilidad es garantizar que el backend siempre disponga de un `access_token` válido para realizar llamadas a las APIs de Google (especialmente Gmail API), renovándolo automáticamente utilizando el `refresh_token` almacenado cuando sea necesario.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| [tokenService.js](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/token/tokenService.js) | Lógica para verificar validez del token, renovar usando refresh_token y actualización de la BD SQLite. |
| [CONTEXTO.md](file:///c:/Users/valeg/OneDrive/Escritorio/PROCOL/Prueba-PROCOL/backend/src/token/CONTEXTO.md) | Este archivo de documentación. |

## Lógica y Flujo Principal

El servicio expone dos funciones principales al resto del backend:

1. **`getValidToken(userId)`** (Renovación reactiva):
   - Se consulta antes de cada llamada a la API de Gmail.
   - Lee el token actual y su fecha de expiración desde la tabla `tokens` en SQLite.
   - Si la fecha de expiración es menor o igual a **5 minutos** en el futuro (o ya pasó), se dispara automáticamente una llamada a Google para renovar el token usando el `refresh_token`.
   - El nuevo token y su expiración se guardan inmediatamente en la base de datos y se retorna el nuevo `access_token`.

2. **`refreshExpiringTokens()`** (Renovación preventiva):
   - Diseñado para ser invocado periódicamente por un cron job en segundo plano (cada 30 minutos).
   - Busca en la base de datos todos los tokens que expiran en menos de **10 minutos**.
   - Para cada uno, realiza la renovación preventiva de forma asíncrona. Esto asegura que los usuarios que tengan la aplicación abierta no sufran micro-retrasos ni errores al llamar a la API de Gmail.

## Dependencias

- **`googleapis`**: Utiliza `google.auth.OAuth2` para interactuar con los servidores de autenticación de Google y realizar la renovación del token.
- **`database/db`**: Usa `getDb` y `saveDb` para consultar y actualizar los tokens en la persistencia local de SQLite.

## Conexión con el resto del proyecto

- **`backend/src/index.js`**: Inicia el cron job recurrente llamando a `refreshExpiringTokens` cada 30 minutos.
- **`backend/src/gmail/gmailService.js`** (Fase 4): Consumirá `getValidToken` para inicializar el cliente de la API de Gmail con un token siempre válido.
