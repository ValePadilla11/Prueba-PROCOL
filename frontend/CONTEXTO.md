# Frontend — CONTEXTO

## Qué hace esta carpeta

Esta carpeta contiene la aplicación web del lado del cliente, construida con **React** y compilada con **Vite**. Su responsabilidad es proporcionar una interfaz de usuario interactiva y fluida para que los usuarios inicien sesión con Google, vean la lista de sus correos recibidos recientemente de Gmail y reciban notificaciones visuales en tiempo real cuando entren nuevos correos (usando Server-Sent Events).

## Estructura de Archivos

| Archivo/Carpeta | Responsabilidad |
|---|---|
| [index.html](./index.html) | Plantilla HTML base. Carga la fuente tipográfica "Outfit" de Google Fonts. |
| [vite.config.js](./vite.config.js) | Configuración de Vite. Define el proxy de desarrollo para mapear las llamadas `/auth`, `/api` y `/events` a `localhost:3000`. |
| [package.json](./package.json) | Manifiesto de dependencias npm del cliente (React, Vite, @vitejs/plugin-react). |
| `src/` | Código fuente del proyecto en React. |
| ├─ [main.jsx](./src/main.jsx) | Punto de entrada que inicializa React y monta el componente `App`. |
| ├─ [index.css](./src/index.css) | Estilos generales y tokens del sistema de diseño (paleta modo oscuro, transiciones, animaciones de pulso y flotado). |
| ├─ [App.jsx](./src/App.jsx) | Componente raíz. Maneja los estados de sesión, carga de correos, notificaciones no leídas y coordina el hook de SSE. |
| ├─ `hooks/` | Hooks personalizados de React. |
| │  └─ [useSSE.js](./src/hooks/useSSE.js) | Hook que abre el canal de `EventSource` en `/events` (con cookies habilitadas) y suscribe el callback al evento `new_email`. |
| └─ `components/` | Componentes de la interfaz. |
|    ├─ [LoginButton.jsx](./src/components/LoginButton.jsx) | Botón de Google OAuth para redirigir a `/auth/google`. |
|    ├─ [EmailList.jsx](./src/components/EmailList.jsx) | Tarjetas para listar los correos con avatares dinámicos y fechas formateadas. |
|    └─ [NotificationBadge.jsx](./src/components/NotificationBadge.jsx) | Indicador visual y pulsante para alertar de nuevos correos; al hacer clic actualiza la bandeja. |

## Integración con el Backend

- **Sesiones**: El cliente utiliza peticiones HTTP simples (Fetch API) y `EventSource` para conectarse al backend. Al pasar la opción `withCredentials: true`, las cookies de sesión HTTP-Only administradas por Express se envían automáticamente con cada llamada, permitiendo al servidor identificar al usuario de forma segura sin exponer tokens.
- **Proxy**: Durante el desarrollo, las llamadas relativas se enrutan automáticamente al puerto `3000` (el backend) para evitar problemas de CORS.

## Guía de Inicio Rápido (Desarrollo)

Para levantar el frontend de forma local:

1. Instalar dependencias en la carpeta `frontend`:
   ```bash
   npm install
   ```
2. Iniciar el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
3. Acceder en el navegador a: [http://localhost:5173](http://localhost:5173)
