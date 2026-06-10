import { useEffect, useState } from 'react';

/**
 * Hook para escuchar eventos SSE del backend en tiempo real
 * @param {boolean} shouldConnect - Indica si debe abrirse la conexión (ej. usuario autenticado)
 * @param {Function} onNewEmail - Callback invocado al recibir un evento 'new_email'
 * @returns {boolean} sseConnected - Estado actual de la conexión SSE
 */
export function useSSE(shouldConnect, onNewEmail) {
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    if (!shouldConnect) {
      setSseConnected(false);
      return;
    }

    console.log('[SSE] Intentando abrir conexión en /events...');
    
    // Abrir conexión pasándole withCredentials para mandar las cookies de la sesión
    const eventSource = new EventSource('/events', { withCredentials: true });

    eventSource.onopen = () => {
      console.log('[SSE] Conexión establecida.');
      setSseConnected(true);
    };

    // Escuchar el evento personalizado de nuevo correo
    eventSource.addEventListener('new_email', (event) => {
      console.log('[SSE] Evento recibido: new_email', event.data);
      try {
        const data = JSON.parse(event.data);
        if (onNewEmail) {
          onNewEmail(data);
        }
      } catch (err) {
        console.error('[SSE] Error parseando datos del evento:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE] Error en conexión o desconexión temporal, reconectando...', err);
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
      console.log('[SSE] Conexión cerrada manualmente.');
    };
  }, [shouldConnect, onNewEmail]);

  return sseConnected;
}
