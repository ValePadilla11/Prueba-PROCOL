# Backend — CONTEXTO

## Qué es esta carpeta

Contiene todo el código del servidor (Node.js + Express). Es el núcleo de la aplicación: gestiona OAuth, tokens, correos, webhooks y SSE.

## Estructura actual

```
backend/
├── package.json          ← dependencias y scripts
├── database.sqlite       ← generado automáticamente (ignorado por git)
└── src/
    ├── index.js          ← entry point, levanta Express
    └── database/
        ├── db.js         ← Inicializa sql.js, carga/crea database.sqlite, exporta getDb() y saveDb()
        └── migrations.js ← crea tablas users, tokens, notifications
```

## Dependencias

| Paquete | Para qué |
|---------|----------|
| `express` | Servidor HTTP y routing |
| `sql.js` | Base de datos SQLite embebida (puro JS/WASM, sin compilación nativa) |
| `googleapis` | OAuth 2.0 y Gmail API (se usa en fases posteriores) |
| `express-session` | Sesiones con cookie HttpOnly (se usa en Fase 2) |
| `node-cron` | Renovación preventiva de tokens cada 30 min (Fase 3) |
| `dotenv` | Cargar variables de entorno desde `.env` |
| `cors` | Permitir requests del frontend |

## Scripts

- `npm start` — Arranca el servidor con Node
- `npm run dev` — Arranca con `--watch` (reinicio automático)

## Conexión con el resto del proyecto

- Lee `.env` desde la raíz del proyecto (`../../.env` relativo a `src/index.js`)
- El frontend (futuro) se conecta a este backend vía HTTP/SSE
