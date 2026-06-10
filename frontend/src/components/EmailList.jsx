import React from 'react';

/**
 * Componente que renderiza la lista de correos en tarjetas individuales
 * @param {object} props
 * @param {Array} props.emails - Array de objetos de correo
 */
export function EmailList({ emails }) {
  if (emails.length === 0) {
    return (
      <div className="empty-emails">
        <div className="empty-icon">📨</div>
        <h3>Bandeja de entrada vacía</h3>
        <p>No se encontraron correos recientes o la bandeja de entrada está limpia.</p>
      </div>
    );
  }

  return (
    <div className="email-list">
      {emails.map((email) => {
        // Intentar separar el nombre del remitente y su dirección de correo
        const fromMatch = email.from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
        const name = fromMatch ? (fromMatch[1] || fromMatch[2]) : email.from;
        const address = fromMatch && fromMatch[1] ? fromMatch[2] : '';

        // Generar inicial del avatar
        const avatarChar = name.trim().charAt(0).toUpperCase() || '✉️';

        return (
          <div key={email.id} className="email-card">
            <div className="email-card-header">
              <div className="email-sender">
                <span className="sender-avatar">{avatarChar}</span>
                <div className="sender-info">
                  <h4 className="sender-name" title={email.from}>{name}</h4>
                  {address && <span className="sender-address">{address}</span>}
                </div>
              </div>
              <span className="email-date" title={email.date}>{formatDate(email.date)}</span>
            </div>
            <div className="email-card-body">
              <h4 className="email-subject">{email.subject}</h4>
              <p className="email-snippet">{email.snippet}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Formateador básico de fecha
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Si falla, retornar original recortado
      return dateStr.replace(/^[a-zA-Z]+,\s/, '').substring(0, 16);
    }
    
    // Formato local amigable
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}
