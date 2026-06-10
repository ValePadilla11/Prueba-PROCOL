# PROCOL Gmail Reader

Este proyecto es una prueba técnica que consiste en un lector de correos de Gmail en tiempo real. Permite a los usuarios iniciar sesión de forma segura utilizando Google OAuth 2.0, ver sus últimos 10 correos electrónicos de la bandeja de entrada, renovar automáticamente sus credenciales de acceso cuando están por expirar (usando el `refresh_token`), y recibir notificaciones instantáneas de nuevos correos sin recargar la página a través de Server-Sent Events (SSE) acoplados con webhooks de Google Cloud Pub/Sub.

---

## Cómo Correr el Proyecto Paso a Paso

### Guía detallada para configurar los Requisitos Previos

Si no tienes instaladas las herramientas o nunca has configurado un proyecto en Google Cloud, aquí tienes el paso a paso de cómo lo hice para que puedas replicarlo sin problemas.

---

#### 1. Instalación de Node.js
Node.js es el entorno que ejecuta el backend y el frontend.
1. Ve a la página oficial de [Node.js (nodejs.org)](https://nodejs.org/es) y descarga la versión **LTS** recomendada para tu sistema operativo (Windows, macOS o Linux).
2. Abre el instalador descargado y sigue las instrucciones del asistente (puedes dejar todas las opciones predeterminadas).
3. Una vez instalado, abre tu consola/terminal y verifica que esté listo ejecutando:
   ```bash
   node -v
   npm -v
   ```
   *(Debería mostrarte los números de versión instalados, por ejemplo `v18.x.x` o superior).*

---

#### 2. Instalación y configuración de ngrok
ngrok nos permite exponer de forma segura nuestro servidor local a internet a través de una URL pública HTTPS, necesaria para recibir los webhooks de Google.
1. Ve a la web de [ngrok (ngrok.com)](https://ngrok.com/) y regístrate gratis.
2. Descarga la versión de ngrok correspondiente a tu sistema operativo.
   - En **Windows**, descarga el archivo ZIP, extráelo y copia el archivo `ngrok.exe` a una carpeta de tu preferencia.
3. Copia tu clave de autenticación (Authtoken) desde el panel de control de ngrok (menú *Your Authtoken*).
4. Configura tu token en la consola ejecutando:
   ```bash
   ngrok config add-authtoken TU_AUTHTOKEN_AQUI
   ```
5. Para levantar el túnel cuando estemos listos (en el puerto 3000 que usa el backend), usaremos el comando:
   ```bash
   ngrok http 3000
   ```

---

#### 3. Configuración en Google Cloud Console
Este es el paso más importante para que la autenticación con Gmail funcione de forma correcta.

##### A. Crear el proyecto e instalar la API de Gmail
1. Ingresa a [Google Cloud Console (console.cloud.google.com)](https://console.cloud.google.com/).
2. Haz clic en el selector de proyectos (arriba a la izquierda) y presiona **Nuevo Proyecto**. Asígnale un nombre (ej. `PROCOL Gmail Reader`) y presiona **Crear**.
3. Asegúrate de tener seleccionado tu nuevo proyecto en la barra superior.
4. Ve al buscador superior, escribe **Gmail API**, selecciónala en los resultados y haz clic en el botón **Habilitar**.

##### B. Configurar la Pantalla de Consentimiento OAuth (Consent Screen)
Antes de generar las llaves, debemos configurar qué verá el usuario al loguearse.
1. En el menú lateral izquierdo de GCP, ve a **APIs & Services** (APIs y Servicios) > **OAuth consent screen** (Pantalla de consentimiento de OAuth).
2. Selecciona el tipo de usuario **External** (Externo) y haz clic en **Crear**.
3. Completa los campos obligatorios:
   - **App name**: `PROCOL Gmail Reader`.
   - **User support email**: Selecciona tu propia cuenta de correo.
   - **Developer contact information**: Escribe tu correo electrónico.
   - Deja el resto de los campos en blanco y presiona **Save and Continue** (Guardar y Continuar).
4. En la pestaña **Scopes** (Permisos), haz clic en **Add or Remove Scopes** (Agregar o quitar permisos).
   - En el buscador o en la lista, busca y selecciona los siguientes tres permisos:
     - `.../auth/gmail.readonly` (para ver los correos).
     - `.../auth/userinfo.email` (para obtener el correo de perfil del usuario).
     - `.../auth/userinfo.profile` (para obtener el nombre del usuario).
   - Presiona **Actualizar** al final de la tabla y luego **Save and Continue**.
5. En la pestaña **Test Users** (Usuarios de prueba), haz clic en **Add Users** (Agregar usuarios).
   - **¡IMPORTANTE!** Añade la dirección de correo de Gmail exacta con la que vas a realizar las pruebas de inicio de sesión. Al estar la aplicación en modo desarrollo, Google bloqueará cualquier cuenta que no esté explícitamente en esta lista.
   - Haz clic en **Save and Continue** y luego en **Back to Dashboard** para finalizar.

##### C. Crear las Credenciales OAuth 2.0 (Client ID)
1. En el menú lateral izquierdo, ve a **Credentials** (Credenciales).
2. Haz clic en **Create Credentials** (Crear credenciales) en la parte superior y selecciona **OAuth client ID** (ID de cliente OAuth).
3. Configura los siguientes campos:
   - **Application type**: *Web application* (Aplicación web).
   - **Name**: `PROCOL Gmail Reader`.
   - **Authorized redirect URIs** (URIs de redireccionamiento autorizados): Haz clic en *Add URI* y escribe exactamente:
     ```text
     http://localhost:3000/auth/callback
     ```
4. Haz clic en **Crear**.
5. Te aparecerá una ventana emergente con el **Client ID** (ID de cliente) y el **Client Secret** (Secreto de cliente). **Copia estos valores**, ya que los necesitaremos para el archivo `.env`.

##### D. Configurar Pub/Sub para recibir Webhooks
Gmail requiere un intermediario (Pub/Sub) para despachar las notificaciones.
1. En la barra de búsqueda de Google Cloud Console, busca **Pub/Sub** y entra a **Topics** (Temas).
2. Haz clic en **Create Topic** (Crear tema).
   - **Topic ID**: `gmail-notifications`.
   - Desmarca la opción *Use a default subscription* (Usar una suscripción predeterminada).
   - Haz clic en **Crear**.
3. Ahora debemos dar permisos a Gmail para que pueda publicar eventos en nuestro tema:
   - En la vista del tema recién creado, a la derecha verás un panel lateral de **Permissions** (si no se ve, haz clic en *Show Info Panel* arriba a la derecha).
   - Haz clic en **Add Principal** (Agregar miembro).
   - En **New principals** (Nuevos miembros), ingresa la cuenta oficial de servicio de Gmail:
     ```text
     gmail-api-push@system.gserviceaccount.com
     ```
   - En **Role** (Rol), selecciona **Pub/Sub** > **Pub/Sub Publisher** (Publicador de Pub/Sub).
   - Haz clic en **Guardar**.
4. Crear la Suscripción Push hacia nuestro túnel local:
   - En el menú de Pub/Sub, ve a **Subscriptions** (Suscripciones) y haz clic en **Create Subscription** (Crear suscripción).
   - **Subscription ID**: `gmail-notifications-sub`.
   - **Select a Cloud Pub/Sub topic**: Selecciona el tema que creaste anteriormente (`projects/TU_ID_PROYECTO/topics/gmail-notifications`).
   - **Delivery type**: Selecciona **Push**.
   - **Endpoint URL**: Escribe la URL HTTPS que te entregó ngrok al levantar el túnel, terminando en `/webhook/gmail` (ejemplo: `https://abcdef123.ngrok-free.dev/webhook/gmail`).
   - Presiona el botón **Crear** al final de la página.

*(Nota: Cada vez que inicies ngrok en una sesión de desarrollo nueva, deberás actualizar la URL de este endpoint de suscripción en la consola de Google Cloud con el nuevo subdominio dinámico asignado por ngrok).*

---

---

### Paso 1: Configurar las Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basándote en `.env.example`) y completa las variables:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Session
SESSION_SECRET=un-secreto-largo-para-las-cookies

# Pub/Sub
GOOGLE_CLOUD_PROJECT=tu-id-de-proyecto-gcp
PUBSUB_TOPIC=projects/tu-id-de-proyecto-gcp/topics/nombre-de-tu-tema

# App
PORT=3000
```

---

### Paso 2: Levantar el Backend
1. Navega a la carpeta del backend e instala las dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Inicia el servidor:
   ```bash
   npm start
   ```
   *Esto inicializará automáticamente el archivo de base de datos local `database.sqlite`, ejecutará las migraciones de las tablas (`users`, `tokens`, `notifications`) y registrará el cron job preventivo.*

---

### Paso 3: Configurar el Túnel de Webhooks (ngrok)
1. En otra terminal, abre un túnel HTTP hacia el puerto 3000:
   ```bash
   ngrok http 3000
   ```
2. Copia la URL HTTPS generada (por ejemplo, `https://abcdef123.ngrok-free.dev`).
3. Ve a tu consola de Google Cloud, edita la configuración de tu **Suscripción Push** de Pub/Sub y pega la URL apuntando al endpoint de nuestro webhook:
   ```text
   https://abcdef123.ngrok-free.dev/webhook/gmail
   ```

---

### Paso 4: Levantar el Frontend
1. En una nueva terminal, navega a la carpeta `frontend` e instala las dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Ejecuta el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
3. Abre en tu navegador [http://localhost:5173](http://localhost:5173).

---

### Paso 5: Probar la Aplicación
1. Haz clic en **Iniciar sesión con Google** y autoriza el acceso a la cuenta de Gmail.
2. Tras iniciar sesión serás redirigido al panel principal, donde verás tus últimos 10 correos y el indicador de estado en verde: **"Tiempo real conectado"**.
3. **Prueba de Renovación de Token**:
   - En la terminal del backend, ejecuta `node src/test-expire.js` para simular que el token ha expirado.
   - Refresca la lista de correos en el frontend. En la consola del backend verás cómo se detecta el token caducado, se solicita uno nuevo a Google usando el `refresh_token`, se actualiza SQLite en disco y se responde exitosamente con los correos sin mostrar ningún error al usuario.
4. **Prueba de Webhook en Tiempo Real**:
   - Envía un correo electrónico desde otra cuenta a la bandeja de entrada de tu cuenta conectada.
   - El webhook recibirá el evento de Pub/Sub, lo procesará en base64, lo guardará en la tabla de notificaciones y emitirá una alerta instantánea mediante SSE.
   - En el frontend aparecerá el badge flotante en rojo de **🔔 +1 Nuevos correos**. Al hacer clic en él, la bandeja se actualizará con tus correos más recientes.

---

## Decisiones Técnicas y por qué las tomé

1. **Uso de SQLite (`sql.js`) en lugar de `better-sqlite3`**
   - *Por qué:* `better-sqlite3` es una dependencia nativa de C++ que requiere herramientas de compilación (`node-gyp`, Python, compiladores nativos del host). En sistemas de desarrollo (especialmente Windows) esto suele arrojar fallos de instalación difíciles de solucionar. Decidí usar `sql.js` (SQLite compilado en WebAssembly y JS puro) para asegurar una portabilidad inmediata del proyecto y que pudiera instalarse con un simple `npm install` en cualquier máquina.
2. **Sincronización Explícita de la Base de Datos (`reloadDb` / `saveDb`)**
   - *Por qué:* Como `sql.js` trabaja la base de datos en memoria para ser veloz y solo guarda a disco al exportar explícitamente, existía el problema de que procesos externos (como el script `test-expire.js`) actualizaran el archivo pero el servidor backend en ejecución no se enterara. Implementé un método de sincronización en caliente (`reloadDb`) que lee del disco justo antes de realizar cualquier lectura/renovación de tokens, emulando fielmente el comportamiento de una base de datos de disco tradicional sin perder la ligereza de `sql.js`.
3. **Server-Sent Events (SSE) para el tiempo real**
   - *Por qué:* A diferencia de WebSockets (que es bidireccional y tiene más sobrecarga), el flujo de notificaciones en tiempo real en este proyecto es 100% unidireccional (del servidor al cliente al llegar un webhook). SSE es un estándar nativo del navegador (`EventSource`), utiliza el protocolo HTTP convencional, se reconecta automáticamente en caso de micro-cortes, y es extremadamente fácil de programar e integrar con sesiones Express sin requerir dependencias complejas como Socket.io.
4. **Optimización en el consumo de la Gmail API**
   - *Por qué:* Descargar el cuerpo HTML completo de cada correo electrónico consume mucho ancho de banda e incrementa el tiempo de carga. Configuré `users.messages.get` con el formato `metadata` y filtrando únicamente los headers necesarios (`From`, `Subject`, `Date`) y el `snippet`. Además, utilicé `Promise.all` para resolver las llamadas en paralelo, reduciendo el tiempo de carga del dashboard a una fracción de segundo.
5. **Seguridad y Aislamiento de Tokens**
   - *Por qué:* Siguiendo las mejores prácticas de seguridad, el frontend jamás tiene visibilidad ni acceso a los tokens (`access_token` o `refresh_token`). Toda la autenticación está aislada en el backend y la comunicación se vincula mediante cookies HTTP-Only de sesión controladas por `express-session`, de modo que un atacante no puede robar tokens mediante ataques XSS en el navegador.

---

## Qué fue lo más difícil

- **Manejo de estados con base de datos en memoria (`sql.js`)**:
  Fue un reto diseñar un flujo robusto que permitiera a un script externo (`test-expire.js`) simular la expiración de tokens modificando el archivo físico de base de datos en disco y que el servidor web principal se enterara instantáneamente de dicha actualización en caliente. La solución fue estructurar un wrapper en el módulo de base de datos que hiciera una recarga a memoria de la BD física antes de las consultas de tokens sensibles.
- **Renovación automática reactiva y fluida**:
  Implementar la renovación automática en el *middleware* o capa de servicio de manera que la llamada a la Gmail API esperara asíncronamente a que el token se renovara y guardara en disco (en caso de estar por expirar), y continuara su ejecución normal sin que la petición del usuario fallara con un error `401 Unauthorized`.

---

## Qué mejoraría si tuviera más tiempo

1. **Encriptación de Tokens en la Base de Datos**:
   - Actualmente, los tokens se guardan en texto plano en la tabla `tokens` de SQLite. Si un atacante lograra extraer el archivo `database.sqlite`, comprometería el acceso de todos los usuarios. Integraría encriptación simétrica AES-256 en la capa de persistencia para cifrar los tokens antes de guardarlos y descifrarlos al leerlos.
2. **Segmentación estricta de Canales SSE por Usuario**:
   - Actualmente las alertas de SSE se envían a todos los clientes conectados de manera general (`broadcast`). Aunque ya he sentado las bases de mapeo guardando el `userId` en las conexiones SSE, en producción implementaría una segmentación estricta para asegurar que un usuario únicamente reciba notificaciones que correspondan a su propia cuenta de Gmail.
3. **Cola de Renovación y Renovación Inteligente en Segundo Plano**:
   - Implementaría un hilo de ejecución independiente para gestionar las solicitudes de renovación, evitando retrasar en lo absoluto la carga de los correos cuando el usuario visite la plataforma y su token requiera renovación en ese instante exacto.
4. **Pruebas Automatizadas**:
   - Escribiría pruebas unitarias e integración con Jest/Vitest para la lógica de renovación del `tokenService` y llamadas mockeadas de la API de Google, logrando garantizar la estabilidad de la lógica central sin depender exclusivamente de simulaciones manuales.