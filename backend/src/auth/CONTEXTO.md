# Auth — CONTEXTO

## Qué hace esta carpeta

Gestiona el flujo de autenticación OAuth 2.0 con Google. Permite al usuario iniciar sesión con su cuenta de Google y almacena los tokens de forma segura en SQLite.

## Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `authRoutes.js` | Define las rutas de autenticación OAuth 2.0 |

## Rutas expuestas

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/auth/google` | GET | Genera la URL OAuth y redirige al usuario a Google |
| `/auth/callback` | GET | Recibe el `code` de Google, intercambia por tokens, guarda en SQLite, crea sesión |
| `/auth/status` | GET | Devuelve si el usuario tiene sesión activa (`authenticated: true/false`) |
| `/auth/logout` | GET | Destruye la sesión del usuario |

## Flujo OAuth

1. El usuario visita `/auth/google`
2. Se genera la URL de consentimiento con `access_type: 'offline'` y `prompt: 'consent'`
3. Google redirige a `/auth/callback?code=XXX`
4. El backend intercambia el `code` por `access_token` + `refresh_token`
5. Se obtiene la info del usuario (email, nombre, google_id)
6. Se hace INSERT/UPDATE en tablas `users` y `tokens`
7. Se crea la sesión con `req.session.userId`
8. Se redirige al frontend (`http://localhost:5173`)

## Scopes solicitados

- `gmail.readonly` — leer correos
- `userinfo.email` — email del usuario
- `userinfo.profile` — nombre del usuario

## Dependencias

- `googleapis` — cliente OAuth2 y API de Google
- `express-session` — manejo de sesiones (configurado en `index.js`)

## Seguridad

- Los tokens **nunca** salen del backend
- La cookie de sesión es `httpOnly: true` (no accesible desde JS del navegador)
- `access_type: 'offline'` asegura que Google entregue un `refresh_token`
- `prompt: 'consent'` fuerza la entrega del `refresh_token` en cada login

## Conexión con el resto del proyecto

- Usa `getDb()` y `saveDb()` de `database/db.js` para interactuar con SQLite
- Se monta en `index.js` como `app.use('/auth', authRoutes)`
- Las sesiones son usadas luego por otros endpoints (ej: `/api/emails`) para identificar al usuario
