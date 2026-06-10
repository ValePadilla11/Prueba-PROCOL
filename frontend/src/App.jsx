import React, { useState, useEffect, useCallback } from 'react';
import { LoginButton } from './components/LoginButton';
import { EmailList } from './components/EmailList';
import { NotificationBadge } from './components/NotificationBadge';
import { useSSE } from './hooks/useSSE';

function App() {
  const [user, setUser] = useState(null); // { authenticated: false } o { authenticated: true, email: '', userId: 1 }
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [error, setError] = useState(null);

  // 1. Obtener estado de autenticación al cargar
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/auth/status');
      const data = await response.json();
      setUser(data);
      if (data.authenticated) {
        fetchEmails();
      }
    } catch (err) {
      console.error('Error verificando autenticación:', err);
      setError('No se pudo conectar con el servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // 2. Obtener lista de correos
  const fetchEmails = async () => {
    setEmailsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/emails');
      if (response.status === 401) {
        setUser({ authenticated: false });
        return;
      }
      const data = await response.json();
      if (data.status === 'ok') {
        setEmails(data.emails);
      } else {
        setError(data.error || 'Error al obtener los correos.');
      }
    } catch (err) {
      console.error('Error cargando correos:', err);
      setError('Error al conectar con la API de correos.');
    } finally {
      setEmailsLoading(false);
    }
  };

  // 3. Cerrar sesión
  const handleLogout = async () => {
    try {
      await fetch('/auth/logout');
      setUser({ authenticated: false });
      setEmails([]);
      setNotificationCount(0);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  // Callback para recibir correos nuevos en tiempo real vía SSE
  const handleNewEmail = useCallback((data) => {
    console.log('[App] Alerta de nuevo correo recibido:', data);
    setNotificationCount((prev) => prev + 1);
  }, []);

  // 4. Activar canal en tiempo real si el usuario está autenticado
  const sseConnected = useSSE(!!(user && user.authenticated), handleNewEmail);

  // 5. Refrescar bandeja al presionar el badge o el botón de refrescar
  const handleRefresh = () => {
    setNotificationCount(0);
    fetchEmails();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando aplicación...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de bienvenida con botón de Google
  if (!user || !user.authenticated) {
    return (
      <div className="welcome-container">
        <div className="welcome-icon">📬</div>
        <h2>PROCOL Gmail Reader</h2>
        <p>
          Bienvenido a la plataforma de lectura de correos en tiempo real de PROCOL. 
          Inicia sesión de forma segura con tu cuenta de Google para visualizar tus últimos correos 
          y recibir notificaciones instantáneas sin recargar la página.
        </p>
        <LoginButton />
        {error && <p className="error-message" style={{ color: '#ef4444', marginTop: '1.5rem' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* HEADER DE LA APLICACIÓN */}
      <header className="app-header">
        <div className="logo-section">
          <h1><span>✉️</span> PROCOL Gmail Reader</h1>
        </div>
        <div className="user-controls">
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <div className="sse-status-badge">
              <span className={`sse-dot ${sseConnected ? 'connected' : ''}`}></span>
              <span>{sseConnected ? 'Tiempo real conectado' : 'Desconectado'}</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* DASHBOARD PRINCIPAL */}
      <main className="dashboard-grid">
        <div className="dashboard-actions">
          <h2 className="section-title">Bandeja de entrada reciente</h2>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {/* BADGE DE NOTIFICACIONES */}
            <NotificationBadge count={notificationCount} onClick={handleRefresh} />
            
            <button 
              className="refresh-button" 
              onClick={handleRefresh} 
              disabled={emailsLoading}
            >
              {emailsLoading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* LISTADO DE CORREOS */}
        {emailsLoading && emails.length === 0 ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Obteniendo tus correos recientes desde Gmail...</p>
          </div>
        ) : (
          <EmailList emails={emails} />
        )}
      </main>
    </div>
  );
}

export default App;
