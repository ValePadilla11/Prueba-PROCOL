**Arquitectura de la Solución**

**Objetivo**

Construir una aplicación web que permita:

- Autenticación mediante OAuth 2.0 con Google.
- Visualización de los correos recientes del usuario.
- Renovación automática de tokens sin requerir un nuevo inicio de sesión.
- Recepción de notificaciones en tiempo real cuando llegan nuevos correos.
- Manejo seguro de credenciales y tokens.![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.001.png)

**Arquitectura General**

┌─────────────────────┐![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.002.png)

│     React/Vite      │

│     Frontend        │

└──────────┬──────────┘

`           `│ HTTPS

`           `▼

┌─────────────────────┐

│  Node.js + Express  │

│      Backend        │

└──────┬───────┬──────┘

`       `│       │

`       `│       │

- ▼

`   `SQLite   Google APIs

`       `│         │

`       `│         │

- ▼

` `Tokens     OAuth + Gmail

`                 `│

`                 `▼

`            `Cloud Pub/Sub

`                 `│

`                 `▼

`                `ngrok

`                 `│

`                 `▼

`         `/webhook/gmail

`                 `│

`                 `▼

`             `SSE Stream

`                 `│

`                 `▼![ref1]

`              `Browser![ref2]

**Tecnologías Utilizadas**

**Frontend**

- React
- Vite
- Fetch API
- Server Sent Events (SSE)

**Backend**

- Node.js
- Express
- googleapis
- better-sqlite3
- express-session
- node-cron

**Persistencia**

- SQLite

**Servicios Externos**

- Google OAuth 2.0
- Gmail API
- Google Cloud Pub/Sub
- ngrok![ref3]

**Separación de Responsabilidades**

**Frontend**

Responsabilidades:

- Iniciar el flujo OAuth.
- Mostrar los correos obtenidos desde el backend.
- Mostrar notificaciones en tiempo real.
- Escuchar eventos SSE.

El frontend no tiene acceso a:

- access\_token
- refresh\_token
- client\_secret

Toda la lógica sensible se encuentra en el backend.![ref4]

**Backend**

Responsabilidades:

- Gestionar OAuth 2.0.
- Almacenar tokens.
- Renovar tokens automáticamente.
- Consumir Gmail API.
- Procesar webhooks.
- Emitir eventos SSE.
- Gestionar sesiones.![ref5]

**Flujo de Autenticación OAuth**

1. **Inicio de sesión**

El usuario accede a la aplicación y presiona:

Iniciar sesión con Google![ref6]

El frontend redirige al backend:

GET /auth/google![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.009.png)![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.010.png)

2. **Autorización**

El backend construye la URL OAuth utilizando:

GOOGLE\_CLIENT\_ID![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.011.png)

GOOGLE\_REDIRECT\_URI

y redirige al usuario hacia Google.![ref5]

3. **Callback**

Google devuelve:

/auth/callback?code=XXXXX![ref7]

El backend intercambia el authorization code por:

access\_token![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.013.png)

refresh\_token

expires\_in![ref8]

4. **Persistencia**

Los tokens se almacenan en SQLite.![ref2]

5. **Sesión**

Se crea una sesión mediante cookie HttpOnly:

Set-Cookie: session=xxxxx![ref9]

Esta cookie identifica al usuario sin exponer credenciales.![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.016.png)

**Modelo de Datos**

**Tabla users**

CREATE TABLE users(![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.017.png)

id INTEGER PRIMARY KEY,

google\_id TEXT UNIQUE,

email TEXT,

name TEXT

);![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.018.png)

**Tabla tokens**

CREATE TABLE tokens(![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.019.png)

id INTEGER PRIMARY KEY,

user\_id INTEGER,

access\_token TEXT,

refresh\_token TEXT,

expires\_at DATETIME

);![ref8]

**Tabla notifications**

CREATE TABLE notifications(![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.020.png)

id INTEGER PRIMARY KEY,

user\_id INTEGER,

history\_id TEXT,

created\_at DATETIME

);![ref2]

**Consulta de Correos**

Cuando el frontend solicita:

GET /api/emails![ref6]

el backend:

1. Obtiene el token almacenado.
1. Verifica si sigue siendo válido.
1. Lo renueva si es necesario.
1. Consulta Gmail API.
1. Devuelve los últimos correos al frontend.![ref4]

**Estrategia de Renovación Automática**

Este es el componente más importante de la solución.

**Validación previa**

Antes de cada llamada a Gmail:

¿El token está expirado?![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.021.png)

Si la respuesta es sí:

refresh\_token![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.022.png)

`       `↓

Google OAuth

`       `↓

nuevo access\_token

`       `↓

actualizar SQLite

Posteriormente la petición continúa normalmente.![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.023.png)

**Renovación preventiva**

Adicionalmente existe un proceso programado:

node-cron![ref7]

que se ejecuta cada 30 minutos.

Responsabilidad:

- Detectar tokens próximos a expirar.
- Renovarlos de forma anticipada.
- Actualizar la base de datos.

Esto evita interrupciones en sesiones prolongadas.![ref3]

**Integración con Gmail Push Notifications**

Google no envía eventos directamente desde Gmail. El flujo real es:

Gmail![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.024.png)

`   `↓

Cloud Pub/Sub

`   `↓

Push Subscription

`   `↓

ngrok

`   `↓![ref1]

/webhook/gmail![ref2]

**Configuración**

**Gmail API**

Habilitada dentro del proyecto Google Cloud.

**Pub/Sub Topic**

gmail-notifications![ref6]

**Push Subscription**

Configurada para apuntar a:

https://xxxxx.ngrok.app/webhook/gmail![ref9]![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.025.png)

**Registro del Watch**

Después del login:

gmail.users.watch(...)![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.026.png)

Esto indica a Gmail que debe notificar cambios en el buzón.![ref10]

**Procesamiento del Webhook**

Cuando llega un correo:

Nuevo correo![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.028.png)

`      `↓

Gmail

`      `↓

Pub/Sub

`      `↓

Webhook

El backend:

1. Recibe la notificación.
1. Registra el evento.
1. Obtiene información actualizada.
1. Notifica a los clientes conectados.![ref4]

**Comunicación en Tiempo Real**

Para evitar polling se utiliza:

Server Sent Events (SSE)![ref11]

Endpoint:

GET /events![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.030.png)

El navegador mantiene una conexión abierta:

const events = new EventSource("/events");![ref11]

Cuando llega un nuevo correo:

Webhook![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.031.png)

`   `↓

Backend

`   `↓

SSE

`   `↓

Frontend

La interfaz actualiza:

- Contador de notificaciones.
- Lista de correos.
- Indicadores visuales.

Sin necesidad de recargar la página.![ref10]

**Seguridad**

**Credenciales OAuth**

Las credenciales NO están escritas en el código fuente.

Se almacenan mediante variables de entorno:

GOOGLE\_CLIENT\_ID=![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.032.png)

GOOGLE\_CLIENT\_SECRET=

GOOGLE\_REDIRECT\_URI=

SESSION\_SECRET=

El archivo  .env está excluido del repositorio mediante:![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.033.png)

.env![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.034.png)![ref8]

**Tokens**

Los tokens se almacenan únicamente en SQLite dentro del backend.

Nunca son enviados al navegador.![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.035.png)

**Frontend**

El frontend únicamente recibe:

- Datos del usuario.
- Lista de correos.
- Notificaciones.

Nunca recibe:

access\_token![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.036.png)

refresh\_token

client\_secret![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.037.png)

**Estructura del Proyecto**

gmail-reader/![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.038.png)

│

├── frontend/

│   ├── src/

│   └── vite.config.js

│

├── backend/

│   ├── src/

│   │

│   ├── auth/

│   ├── gmail/

│   ├── token/

│   ├── webhook/

│   ├── sse/

│   └── database/

│

├── .env.example

├── README.md

├── ARQUITECTURA.md

└── docker-compose.yml![ref8]

**Decisiones Arquitectónicas**

**¿Por qué SQLite?**

- No requiere infraestructura adicional.
- Es suficiente para el volumen de la prueba.
- Simplifica la instalación.

**¿Por qué SSE?**

- Más simple que WebSockets.
- Comunicación unidireccional suficiente para notificaciones.
- Menor complejidad operativa.

**¿Por qué almacenar tokens en backend?**

- Evita exposición de credenciales.
- Permite controlar el refresh centralmente.
- Cumple los requisitos de seguridad de la prueba.

**¿Por qué ngrok?**

- Gmail requiere una URL HTTPS pública.
- Permite recibir webhooks durante el desarrollo local.![ref8]

**Flujo Completo**

Usuario![](Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.039.png)

`   `↓

OAuth Google

`   `↓

Backend

`   `↓

SQLite

Usuario solicita correos

`   `↓

Backend

`   `↓

Valida token

`   `↓

Gmail API

`   `↓

Frontend

Nuevo correo

`   `↓

Gmail

`   `↓

Pub/Sub

`   `↓

Webhook

`   `↓

Backend

`   `↓

SSE

`   `↓

Frontend

La arquitectura prioriza simplicidad, seguridad y demostración explícita de los conceptos evaluados en la prueba: OAuth 2.0, renovación automática de tokens, webhooks y comunicación en tiempo real.
11

[ref1]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.003.png
[ref2]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.004.png
[ref3]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.005.png
[ref4]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.006.png
[ref5]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.007.png
[ref6]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.008.png
[ref7]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.012.png
[ref8]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.014.png
[ref9]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.015.png
[ref10]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.027.png
[ref11]: Aspose.Words.6ea76e9e-2594-4f2b-8567-ca840d81505c.029.png
