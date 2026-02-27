// Configuración centralizada para FrontGestionR
const CONFIG = {
    // Detectar ambiente automáticamente
    isDevelopment: window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1',
    
    // URLs del backend - ¡CAMBIA ESTO por tu URL de Railway!
    backendUrl: (() => {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // ⚠️ IMPORTANTE: Reemplaza con tu URL real de Railway
        return 'https://tu-backend-production.up.railway.app';
    })(),
    
    // Configuración de Socket.IO
    socketOptions: {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Polling como fallback
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    },
    
    // Tiempos de recarga (ms)
    refreshIntervals: {
        pedidos: 30000,    // 30 segundos
        mesas: 60000,      // 60 segundos
        alertas: 5000      // 5 segundos para limpieza
    },
    
    // Límite de alertas en pantalla
    maxAlertas: 15,
    
    // Versión de la app
    version: '1.0.0',
    
    // Tiempo de vida de alertas (ms)
    alertaDuration: 8000, // 8 segundos
    
    // Roles de usuario (según tu backend)
    roles: {
        1: 'Administrador',
        2: 'Mesero',
        3: 'Cajero',
        4: 'Cocina'
    }
};

// Freeze para evitar modificaciones accidentales
Object.freeze(CONFIG);