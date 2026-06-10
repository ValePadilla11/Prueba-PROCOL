import React from 'react';

/**
 * Muestra el badge de correos entrantes en tiempo real
 * @param {object} props
 * @param {number} props.count - Cantidad de notificaciones pendientes
 * @param {Function} props.onClick - Acción al hacer clic en el badge (refrescar bandeja)
 */
export function NotificationBadge({ count, onClick }) {
  if (count === 0) return null;

  return (
    <div className="notification-badge-container" onClick={onClick} title="Nuevos correos recibidos. Haz clic para actualizar.">
      <div className="notification-badge pulsing">
        <span className="bell-icon">🔔</span>
        <span className="badge-count">+{count}</span>
      </div>
      <span className="badge-text">Nuevos correos</span>
    </div>
  );
}
