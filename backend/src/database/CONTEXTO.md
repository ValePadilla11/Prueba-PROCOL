# Database — CONTEXTO

## Qué hace esta carpeta

Gestiona la conexión y el esquema de la base de datos SQLite. Se ejecuta al arrancar el servidor para garantizar que las tablas existan.

## Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `db.js` | Inicializa `sql.js` (WASM), carga/crea `database.sqlite`, exporta `initDatabase()`, `getDb()` y `saveDb()` |
| `migrations.js` | Crea las 3 tablas si no existen: `users`, `tokens`, `notifications` |

## Esquema de tablas

### `users`
Almacena los usuarios que se han autenticado con Google.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Autoincremental |
| `google_id` | TEXT UNIQUE | ID de Google del usuario |
| `email` | TEXT | Correo del usuario |
| `name` | TEXT | Nombre del usuario |

### `tokens`
Almacena los tokens OAuth por usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Autoincremental |
| `user_id` | INTEGER FK | Referencia a `users.id` |
| `access_token` | TEXT | Token de acceso (expira ~1h) |
| `refresh_token` | TEXT | Token de refresco (permanente) |
| `expires_at` | DATETIME | Fecha/hora de expiración del access token |

### `notifications`
Registra las notificaciones recibidas vía webhook de Pub/Sub.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER PK | Autoincremental |
| `user_id` | INTEGER FK | Referencia a `users.id` |
| `history_id` | TEXT | ID del historial de Gmail |
| `created_at` | DATETIME | Timestamp automático |

## Conexión con el resto del proyecto

- `db.js` es importado por `migrations.js` y por cualquier servicio que necesite acceder a la BD (tokenService, gmailService, etc.)
- `migrations.js` es llamado desde `src/index.js` al arrancar el servidor
