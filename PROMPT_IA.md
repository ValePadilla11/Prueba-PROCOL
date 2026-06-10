# PROMPT_IA.md — Guía de desarrollo incremental para la IA

## Contexto del proyecto

Estás ayudando a construir **PROCOL Gmail Reader**, una prueba técnica que consiste en una aplicación web con:

- Autenticación OAuth 2.0 con Google (Gmail)
- Visualización de los últimos 10–15 correos del usuario
- Renovación automática del access token usando el refresh token (punto más importante)
- Notificaciones en tiempo real cuando llega un correo nuevo, usando Google Cloud Pub/Sub + webhooks + SSE

La arquitectura completa está documentada en `ARQUITECTURA.md`. Léela antes de escribir cualquier código.

---

## Reglas de trabajo

### 1. Desarrollo incremental obligatorio

**Nunca generes todo el proyecto de una sola vez.**

El proyecto se construye fase por fase. Cada fase tiene su propio archivo `FASE_X.md` dentro de su carpeta. Antes de empezar una fase, pregunta si la anterior fue verificada y funciona.

### 2. Un archivo de contexto por carpeta

Cada carpeta del proyecto debe tener su propio `CONTEXTO.md` que explique:
- Qué hace esa carpeta
- Qué archivos contiene y para qué sirve cada uno
- Qué dependencias usa
- Cómo se conecta con el resto del proyecto

Crea ese archivo junto con los primeros archivos de cada carpeta. Actualízalo si agregas archivos nuevos.

### 3. Commits incrementales

Después de cada fase funcional, recuérdame hacer commit con un mensaje descriptivo. Ejemplo:

```
feat: OAuth login flow working, refresh token saved to SQLite
```

### 4. El .env nunca se toca

Nunca escribas valores reales en el código. Usa siempre `process.env.NOMBRE_VARIABLE`. El archivo `.env` lo lleno yo manualmente siguiendo `.env.example`.

### 5. Antes de cada fase, declara qué vas a hacer

Antes de escribir código, muestra un plan de 3–5 líneas con los archivos que vas a crear/modificar y por qué. Espera confirmación antes de proceder.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Sesiones | express-session |
| OAuth | googleapis |
| Cron | node-cron |
| Tiempo real | Server-Sent Events (SSE) |
| Webhook tunnel | ngrok |

---

## Estructura de carpetas objetivo

```
gmail-reader/
│
├── frontend/
│   ├── CONTEXTO.md          ← crear al iniciar frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── EmailList.jsx
│   │   │   ├── LoginButton.jsx
│   │   │   └── NotificationBadge.jsx
│   │   └── hooks/
│   │       └── useSSE.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── CONTEXTO.md          ← crear al iniciar backend
│   ├── src/
│   │   ├── index.js         ← entry point
│   │   ├── auth/
│   │   │   ├── CONTEXTO.md
│   │   │   └── authRoutes.js
│   │   ├── gmail/
│   │   │   ├── CONTEXTO.md
│   │   │   └── gmailService.js
│   │   ├── token/
│   │   │   ├── CONTEXTO.md
│   │   │   └── tokenService.js
│   │   ├── webhook/
│   │   │   ├── CONTEXTO.md
│   │   │   └── webhookRoutes.js
│   │   ├── sse/
│   │   │   ├── CONTEXTO.md
│   │   │   └── sseManager.js
│   │   └── database/
│   │       ├── CONTEXTO.md
│   │       ├── db.js
│   │       └── migrations.js
│   └── package.json
│
├── .env.example             ← plantilla sin valores reales
├── .env                     ← ignorado por git, lo lleno yo
├── .gitignore
├── ARQUITECTURA.md          ← ya existe
├── PROMPT_IA.md             ← este archivo
└── README.md                ← generar al final
```

---

## Fases de desarrollo

### Fase 1 — Setup inicial + Base de datos

**Objetivo:** Proyecto corriendo, estructura de carpetas creada, SQLite inicializado.

Archivos a crear:
- `backend/package.json` con todas las dependencias
- `backend/src/database/db.js` — conexión SQLite
- `backend/src/database/migrations.js` — tablas users, tokens, notifications
- `backend/src/index.js` — servidor Express base (sin rutas aún)
- `.env.example`
- `.gitignore`
- `backend/CONTEXTO.md`
- `backend/src/database/CONTEXTO.md`

Verificación: `npm start` levanta el servidor en el puerto 3000 sin errores. Las tablas se crean en `database.sqlite`.

---

### Fase 2 — OAuth 2.0 (login + callback + guardar tokens)

**Objetivo:** El usuario puede hacer login con Google y el refresh token queda guardado en SQLite.

Archivos a crear/modificar:
- `backend/src/auth/authRoutes.js` — rutas `/auth/google` y `/auth/callback`
- `backend/src/index.js` — registrar rutas de auth y configurar express-session
- `backend/src/auth/CONTEXTO.md`

Verificación: Al visitar `http://localhost:3000/auth/google` redirige a Google. Después del login, la tabla `tokens` tiene una fila con `refresh_token` no nulo.

> Este es el flujo más importante. Asegúrate de pedir `access_type: 'offline'` y `prompt: 'consent'` en la URL OAuth para forzar la entrega del refresh token.

---

### Fase 3 — Token service + renovación automática

**Objetivo:** Función reutilizable que devuelve siempre un access token válido, renovándolo si expiró. Cron job preventivo cada 30 minutos.

Archivos a crear/modificar:
- `backend/src/token/tokenService.js` — función `getValidToken(userId)`
- `backend/src/index.js` — iniciar el cron job al arrancar

Lógica de `getValidToken`:
1. Leer token de SQLite
2. Si `expires_at` está a menos de 5 minutos → usar `refresh_token` para pedir nuevo `access_token`
3. Guardar el nuevo token en SQLite
4. Retornar el token válido

Verificación: Modificar manualmente `expires_at` en SQLite a una fecha pasada y llamar a `GET /api/emails`. El log debe mostrar "Token renovado" y la petición debe completarse sin error 401.

---

### Fase 4 — Gmail API + endpoint de correos

**Objetivo:** `GET /api/emails` devuelve los últimos 10 correos con remitente, asunto y fecha.

Archivos a crear/modificar:
- `backend/src/gmail/gmailService.js` — función `getRecentEmails(userId)`
- `backend/src/index.js` — registrar ruta `/api/emails`
- `backend/src/gmail/CONTEXTO.md`

Verificación: `curl http://localhost:3000/api/emails` (con sesión activa) devuelve un JSON con array de correos.

---

### Fase 5 — SSE (Server-Sent Events)

**Objetivo:** El backend mantiene conexiones SSE abiertas y puede empujar eventos al frontend.

Archivos a crear/modificar:
- `backend/src/sse/sseManager.js` — registro de clientes conectados y función `broadcast(event, data)`
- `backend/src/index.js` — ruta `GET /events`
- `backend/src/sse/CONTEXTO.md`

Verificación: Abrir `http://localhost:3000/events` en el browser debe mantener la conexión abierta (no cierra). En los logs debe aparecer "Cliente SSE conectado".

---

### Fase 6 — Webhook + Pub/Sub

**Objetivo:** El backend recibe el POST de Google Pub/Sub y emite un evento SSE a los clientes conectados.

Archivos a crear/modificar:
- `backend/src/webhook/webhookRoutes.js` — ruta `POST /webhook/gmail`
- `backend/src/gmail/gmailService.js` — función `setupWatch(userId)` para registrar el watch de Gmail
- `backend/src/index.js` — llamar a `setupWatch` después del login
- `backend/src/webhook/CONTEXTO.md`

Lógica del webhook:
1. Recibir el POST de Pub/Sub (el body viene en base64)
2. Decodificar el mensaje
3. Guardar en tabla `notifications`
4. Llamar `sseManager.broadcast('new_email', { historyId })`

Verificación: Enviar un correo a la cuenta conectada. En los logs del backend debe aparecer `POST /webhook/gmail 200`. El SSE debe recibir el evento.

---

### Fase 7 — Frontend React

**Objetivo:** Interfaz funcional con login, lista de correos y badge de notificaciones.

Archivos a crear:
- `frontend/package.json`
- `frontend/vite.config.js` — proxy hacia `localhost:3000`
- `frontend/src/App.jsx`
- `frontend/src/components/LoginButton.jsx`
- `frontend/src/components/EmailList.jsx`
- `frontend/src/components/NotificationBadge.jsx`
- `frontend/src/hooks/useSSE.js`
- `frontend/CONTEXTO.md`

El hook `useSSE` debe:
- Conectarse a `/events`
- Escuchar el evento `new_email`
- Incrementar el contador de notificaciones

Verificación: El flujo completo funciona end-to-end. Login → ver correos → llega un correo → badge se actualiza sin recargar.

---

### Fase 8 — README + limpieza final

**Objetivo:** Documentación lista para la entrega.

Archivos a crear/modificar:
- `README.md` con: cómo correrlo, decisiones técnicas, qué costó más, qué mejoraría
- Revisar que `.env` no está en git (`git status` no lo muestra)
- Verificar que `node_modules` tampoco está trackeado

---

## Variables de entorno requeridas

El archivo `.env.example` debe contener exactamente esto (sin valores):

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Session
SESSION_SECRET=

# Pub/Sub
GOOGLE_CLOUD_PROJECT=
PUBSUB_TOPIC=

# App
PORT=3000
```

---

## Consideraciones de seguridad que deben cumplirse siempre

- `access_token` y `refresh_token` nunca salen del backend
- Las cookies de sesión deben tener `httpOnly: true` y `secure: false` (en desarrollo)
- El frontend nunca recibe tokens, solo datos de correos y eventos SSE
- `.env` siempre en `.gitignore`

---

## Cómo usar este archivo

Cuando empieces una sesión nueva con la IA, pega este mensaje:

> "Lee ARQUITECTURA.md y PROMPT_IA.md. Vamos a trabajar en la Fase X. Antes de escribir código, muéstrame el plan."

Si la IA intenta generar todo el proyecto de una vez, recuérdale:

> "Solo la Fase X. Un paso a la vez."
