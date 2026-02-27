// Módulo para manejar todos los eventos de Socket.IO
const Sockets = {
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    init() {
        if (this.socket?.connected) {
            console.log('⚠️ Socket ya conectado');
            return this.socket;
        }

        console.log('🔄 Conectando a Socket.IO:', CONFIG.backendUrl);

        try {
            this.socket = io(CONFIG.backendUrl, CONFIG.socketOptions);

            // Eventos de conexión
            this.socket.on('connect', () => {
                console.log('🟢 Conectado al servidor de sockets');
                this.updateConnectionStatus(true);
                this.reconnectAttempts = 0;
                this.emit('client_connected', { 
                    client: 'FrontGestionR',
                    version: CONFIG.version
                });
            });

            this.socket.on('connect_error', (error) => {
                console.log('🔴 Error de conexión:', error.message);
                this.updateConnectionStatus(false);
                
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    UI.agregarAlerta(
                        '⚠️ Error de conexión',
                        'No se puede conectar al servidor en tiempo real',
                        'error'
                    );
                }
            });

            this.socket.on('disconnect', (reason) => {
                console.log('🔴 Desconectado del servidor:', reason);
                this.updateConnectionStatus(false);
                
                if (reason === 'io server disconnect') {
                    // El servidor inició la desconexión, intentar reconectar
                    this.socket.connect();
                }
            });

            this.socket.on('reconnect', (attemptNumber) => {
                console.log('🟢 Reconectado después de', attemptNumber, 'intentos');
                this.updateConnectionStatus(true);
            });

            // ========== EVENTOS DEL BACKEND ==========
            
            // Nueva orden para cocina
            this.socket.on('nueva_orden_cocina', (data) => {
                console.log('📦 Nueva orden recibida:', data);
                
                UI.agregarAlerta(
                    '🔔 Nueva orden',
                    `Mesa ${data.mesa} ha realizado un pedido`,
                    'info'
                );
                
                // Actualizar badge de cocina
                UI.actualizarBadge('cocina', 'increment');
                
                // Recargar pedidos pendientes
                CargarDatos.cargarPedidosPendientes();
                
                // Reproducir sonido de notificación (opcional)
                this.reproducirNotificacion();
            });

            // Pedido listo para entregar
            this.socket.on('pedido_listo_para_entregar', (data) => {
                console.log('✅ Pedido listo:', data);
                
                UI.agregarAlerta(
                    '🍽️ Pedido listo',
                    data.mensaje || `Mesa ${data.mesa}: ${data.cliente}`,
                    'pedido-listo'
                );
                
                // Resaltar en cocina
                CargarDatos.cargarPedidosPendientes();
                
                this.reproducirNotificacion('success');
            });

            // Actualización de mesas (fusión, liberación, etc)
            this.socket.on('mesas_actualizadas', (data) => {
                console.log('🔄 Mesas actualizadas:', data);
                
                UI.agregarAlerta(
                    '🪑 Mesas actualizadas',
                    data.mensaje || 'El estado de las mesas ha cambiado',
                    'mesa-actualizada'
                );
                
                CargarDatos.cargarMesas();
            });

            // Confirmación de pago
            this.socket.on('pago_procesado', (data) => {
                console.log('💰 Pago procesado:', data);
                
                UI.agregarAlerta(
                    '💰 Pago exitoso',
                    data.mensaje || 'Pago procesado correctamente',
                    'success'
                );
                
                CargarDatos.cargarMesas();
            });

            // Error desde el servidor
            this.socket.on('error', (error) => {
                console.error('❌ Error del servidor:', error);
                UI.agregarAlerta('❌ Error', error.mensaje || 'Error en el servidor', 'error');
            });

            return this.socket;

        } catch (error) {
            console.error('❌ Error iniciando socket:', error);
            this.updateConnectionStatus(false);
            return null;
        }
    },

    // Emitir evento al servidor
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`⚠️ No se pudo emitir ${event}: socket no conectado`);
        }
    },

    // Actualizar indicador visual de conexión
    updateConnectionStatus(isConnected) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        const indicator = statusEl.querySelector('.status-indicator');
        const text = statusEl.querySelector('.status-text');
        
        if (isConnected) {
            indicator.className = 'status-indicator online';
            text.textContent = 'Conectado';
            statusEl.style.opacity = '1';
        } else {
            indicator.className = 'status-indicator offline';
            text.textContent = 'Desconectado';
            statusEl.style.opacity = '0.8';
        }
    },

    // Reproducir sonido de notificación (opcional)
    reproducirNotificacion(tipo = 'default') {
        // Solo si el usuario ha interactuado con la página
        if (!localStorage.getItem('soundEnabled')) return;
        
        try {
            // Implementación simple con AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (tipo === 'success') {
                // Sonido más agradable para éxito
                const osc = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = 800;
                gainNode.gain.value = 0.1;
                
                osc.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                osc.start();
                osc.stop(audioContext.currentTime + 0.1);
            } else {
                // Sonido simple para notificaciones
                const osc = audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 600;
                osc.connect(audioContext.destination);
                osc.start();
                osc.stop(audioContext.currentTime + 0.05);
            }
        } catch (e) {
            console.log('🔇 Sonido no disponible');
        }
    },

    // Desconectar socket
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
};